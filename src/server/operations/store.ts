import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import {
  stateSchema,
  type OpsState,
  type Draft,
} from "../../features/operations/model";
import { getSupabaseConfig } from "../../lib/supabase/config";
import { requireAuth } from "../auth/context";
import { bootstrap } from "../services/workbench-service";
import { AppError } from "../http/errors";

export const dataDir = () =>
  path.resolve(
    /* turbopackIgnore: true */ process.env.WORKBENCH_DATA_DIR || "work/local",
  );
export function storageMode() {
  return (
    process.env.APP_STORAGE || (getSupabaseConfig() ? "supabase" : "local")
  );
}
const globalStore = globalThis as unknown as { workbenchDb?: Promise<PGlite> };
export async function localDatabase() {
  globalStore.workbenchDb ??= (async () => {
    await mkdir(dataDir(), { recursive: true, mode: 0o700 });
    const lock = path.join(dataDir(), "database.lock");
    try {
      const pid = Number(readFileSync(lock, "utf8"));
      if (pid !== process.pid) {
        let alive = true;
        try {
          process.kill(pid, 0);
        } catch {
          alive = false;
        }
        if (alive)
          throw new AppError(
            "CONFLICT",
            "数据目录已由另一个工作台进程使用，请先关闭它。",
          );
        unlinkSync(lock);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    try {
      writeFileSync(lock, String(process.pid), { flag: "wx", mode: 0o600 });
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code !== "EEXIST" ||
        readFileSync(lock, "utf8") !== String(process.pid)
      )
        throw error;
    }
    process.once("exit", () => {
      try {
        if (readFileSync(lock, "utf8") === String(process.pid))
          unlinkSync(lock);
      } catch {
        /* Already removed. */
      }
    });
    const db = new PGlite(path.join(dataDir(), "postgres"));
    await db.exec(
      "CREATE TABLE IF NOT EXISTS operation_documents (id TEXT PRIMARY KEY, revision BIGINT NOT NULL DEFAULT 0, body JSONB NOT NULL)",
    );
    await db.query(
      "INSERT INTO operation_documents(id,body) VALUES('owner',$1::jsonb) ON CONFLICT DO NOTHING",
      [JSON.stringify(emptyOperations())],
    );
    return db;
  })().catch((error) => {
    globalStore.workbenchDb = undefined;
    throw error;
  });
  return globalStore.workbenchDb;
}
export function emptyOperations(): OpsState {
  const owner = randomUUID();
  return {
    schemaVersion: 1,
    workspace: {
      id: randomUUID(),
      name: "我的内容工作台",
      slug: "personal",
      ownerId: owner,
    },
    profile: { id: owner, displayName: "我" },
    accounts: [],
    inbox: [],
    intelligence: [],
    ideas: [],
    drafts: [],
    content: [],
    snapshots: [],
    assets: [],
    competitors: [],
    events: [],
  };
}
export async function backupBeforeChange(state: OpsState, reason: string) {
  const dir = path.join(dataDir(), "backups");
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(
    path.join(dir, `${Date.now()}-${randomUUID()}-${reason}.json`),
    JSON.stringify({
      format: "ciw-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      state,
    }),
    { mode: 0o600 },
  );
}
export async function backupDraft(draft: Draft) {
  const directory = path.join(dataDir(), "draft-history", draft.id);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(
    path.join(directory, `${String(draft.version).padStart(12, "0")}.json`),
    JSON.stringify(draft),
    { mode: 0o600 },
  );
  const versions = (await readdir(directory))
    .filter((name) => name.endsWith(".json"))
    .sort();
  for (const name of versions.slice(0, Math.max(0, versions.length - 100)))
    await unlink(path.join(directory, name));
}
async function supabaseDocument() {
  const context = await requireAuth();
  // The additional table is intentionally separate from generated legacy types until db:types runs.
  const client =
    context.client as unknown as import("@supabase/supabase-js").SupabaseClient;
  const read = await client
    .from("operation_documents")
    .select("body,revision")
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();
  if (read.error)
    throw new AppError(
      "BACKEND_NOT_CONFIGURED",
      "请先应用运营工作台增量迁移；不会切换到其他数据库。",
    );
  if (read.data)
    return {
      context,
      client,
      state: stateSchema.parse(read.data.body),
      revision: Number(read.data.revision),
    };
  const legacy = await bootstrap(context);
  const rawDir = path.join(dataDir(), "backups");
  await mkdir(rawDir, { recursive: true, mode: 0o700 });
  await writeFile(
    path.join(rawDir, `${Date.now()}-legacy-original.json`),
    JSON.stringify(legacy),
    { mode: 0o600 },
  );
  const state = emptyOperations();
  state.workspace = legacy.workspace!;
  state.profile = legacy.profile || { id: context.user.id, displayName: "我" };
  const now = new Date().toISOString();
  for (const kind of ["inbox", "intelligence"] as const)
    state[kind] = legacy[kind].map((item) => ({
      ...item,
      analysis: undefined,
      status:
        item.status === "已归档" || item.status === "已转选题"
          ? item.status
          : !item.originalContent.trim() ||
              /^链接地址:/.test(item.originalContent)
            ? "待补充"
            : "待处理",
      aiScore: null,
      accountId: null,
      updatedAt: item.updatedAt || item.capturedAt,
      metrics: {
        views: null,
        likes: null,
        comments: null,
        saves: null,
        shares: null,
        leads: null,
      },
      metricsVerified: false,
      assetIds: [],
      mode: "mode" in item ? item.mode : "选中内容",
    }));
  state.ideas = legacy.ideas.map((item) => ({
    ...item,
    score: null,
    accountId: null,
    createdAt: now,
    updatedAt: now,
  }));
  state.content = legacy.content.map((item) => ({
    ...item,
    status: (["待制作", "制作中", "待发布", "已归档"].includes(item.status)
      ? item.status
      : item.status === "已发布"
        ? "待发布"
        : "待制作") as OpsState["content"][number]["status"],
    scheduledAt: item.scheduledAt || null,
    publishedAt: null,
    publishedUrl: "",
    ideaId: item.ideaId || null,
    draftId: null,
    accountId: null,
    materials:
      item.status === "已发布"
        ? "旧发布状态未核验，请补充真实发布时间、链接与账号后登记。"
        : "",
    assetIds: [],
    createdAt: now,
    updatedAt: now,
  }));
  state.competitors = legacy.competitors.map((item) => ({
    ...item,
    followers: null,
    metricsVerified: false,
  }));
  await backupBeforeChange({ ...state }, "legacy-import");
  const inserted = await client
    .from("operation_documents")
    .insert({ workspace_id: context.workspace.id, body: state });
  if (inserted.error && inserted.error.code !== "23505")
    throw new AppError("INTERNAL_ERROR", "旧数据导入失败，旧表保持原样。");
  const current = await client
    .from("operation_documents")
    .select("body,revision")
    .eq("workspace_id", context.workspace.id)
    .single();
  if (current.error) throw new AppError("INTERNAL_ERROR", "工作区读取失败。");
  return {
    context,
    client,
    state: stateSchema.parse(current.data.body),
    revision: Number(current.data.revision),
  };
}
export async function readState(): Promise<OpsState> {
  if (storageMode() === "supabase") return (await supabaseDocument()).state;
  if (storageMode() !== "local")
    throw new AppError(
      "BACKEND_NOT_CONFIGURED",
      "APP_STORAGE 必须是 local 或 supabase。",
    );
  const db = await localDatabase();
  const row = await db.query<{ body: unknown }>(
    "SELECT body FROM operation_documents WHERE id='owner'",
  );
  return stateSchema.parse(row.rows[0].body);
}
export async function mutateState<T>(
  change: (state: OpsState) => T | Promise<T>,
): Promise<T> {
  if (storageMode() === "supabase") {
    const { state, client, context, revision } = await supabaseDocument();
    const result = await change(state);
    stateSchema.parse(state);
    const saved = await client
      .from("operation_documents")
      .update({ body: state, revision: revision + 1 })
      .eq("workspace_id", context.workspace.id)
      .eq("revision", revision)
      .select("revision");
    if (saved.error) throw new AppError("INTERNAL_ERROR", "保存失败，请重试。");
    if (!saved.data?.length)
      throw new AppError("CONFLICT", "其他操作已更新数据，请刷新后重试。");
    return result;
  }
  const db = await localDatabase();
  return db.transaction(async (tx) => {
    const row = await tx.query<{ body: unknown }>(
      "SELECT body FROM operation_documents WHERE id='owner' FOR UPDATE",
    );
    const state = stateSchema.parse(row.rows[0].body);
    const result = await change(state);
    stateSchema.parse(state);
    await tx.query(
      "UPDATE operation_documents SET body=$1::jsonb,revision=revision+1 WHERE id='owner'",
      [JSON.stringify(state)],
    );
    return result;
  });
}
export function publicState(state: OpsState) {
  return {
    ...state,
    assets: state.assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      mime: asset.mime,
      createdAt: asset.createdAt,
    })),
    storageMode:
      storageMode() === "local"
        ? "本地 PostgreSQL · PGlite"
        : "Supabase/PostgreSQL",
  };
}
