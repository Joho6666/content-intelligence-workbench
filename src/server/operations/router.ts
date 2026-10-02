import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import {
  accountSchema,
  analysisSchema,
  assetSchema,
  canonicalUrl,
  competitorSchema,
  contentSchema,
  draftSchema,
  generatedDraftSchema,
  ideaSchema,
  metricsSchema,
  operationPlatforms,
  snapshotSchema,
  sourceSchema,
  stateSchema,
  totalMetric,
  latestSnapshots,
  type OpsState,
} from "../../features/operations/model";
import { AppError } from "../http/errors";
import { dataResponse, errorResponse } from "../http/response";
import {
  backupBeforeChange,
  backupDraft,
  mutateState,
  publicState,
  readState,
  storageMode,
} from "./store";
import { aiJson, connectionSchema, readConnection, saveConnection } from "./ai";

function guard(request: Request) {
  const internal = new URL(request.url);
  const url = new URL(
    `${internal.protocol}//${request.headers.get("host") || internal.host}`,
  );
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    throw new AppError("FORBIDDEN", "个人工作台仅允许从本机访问。");
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin)
    throw new AppError("FORBIDDEN", "不允许跨站访问工作台。");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new AppError("FORBIDDEN", "不允许跨站访问工作台。");
}
const now = () => new Date().toISOString();
function event(state: OpsState, text: string, href = "/") {
  state.events.unshift({ id: randomUUID(), text, href, at: now() });
  state.events = state.events.slice(0, 500);
}
function normalized(body: Record<string, unknown>) {
  const aliases: Record<string, string> = {
    original_content: "originalContent",
    source_type: "sourceType",
    capture_method: "captureMethod",
    captured_at: "capturedAt",
    ai_score: "aiScore",
    title_variants: "titles",
    scheduled_at: "scheduledAt",
    idea_id: "ideaId",
    account_id: "accountId",
    published_at: "publishedAt",
  };
  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => [aliases[key] || key, value]),
  );
}
function entity(state: OpsState, kind: string, id: string) {
  const collection = state[kind as keyof OpsState];
  if (!Array.isArray(collection))
    throw new AppError("NOT_FOUND", "页面不存在。");
  const item = (collection as { id: string }[]).find((item) => item.id === id);
  if (!item) throw new AppError("NOT_FOUND", "记录不存在或已删除。");
  return item;
}
function account(state: OpsState, id: unknown) {
  if (id) entity(state, "accounts", String(id));
}
function references(state: OpsState) {
  for (const row of [
    ...state.inbox,
    ...state.intelligence,
    ...state.ideas,
    ...state.content,
  ])
    account(state, row.accountId);
  for (const draft of state.drafts) {
    entity(state, "ideas", draft.ideaId);
    account(state, draft.accountId);
  }
  for (const content of state.content) {
    if (content.ideaId) entity(state, "ideas", content.ideaId);
    if (content.draftId) entity(state, "drafts", content.draftId);
    for (const id of content.assetIds) entity(state, "assets", id);
  }
  for (const source of [...state.inbox, ...state.intelligence]) {
    urlValid(source.url);
    for (const id of source.assetIds) entity(state, "assets", id);
    if (source.analysis) account(state, source.analysis.accountId);
  }
  for (const content of state.content) {
    validPublication(content);
    if (content.draftId) {
      const draft = state.drafts.find((d) => d.id === content.draftId)!;
      if (
        draft.accountId !== content.accountId ||
        draft.platform !== content.platform ||
        draft.ideaId !== content.ideaId
      )
        throw new AppError(
          "VALIDATION_ERROR",
          "制作记录与稿件的账号、平台或选题不一致。",
        );
    }
  }
  const sourceIds = new Set(
    [...state.inbox, ...state.intelligence].map((s) => s.id),
  );
  for (const draft of state.drafts)
    for (const id of draft.sourceIds)
      if (!sourceIds.has(id))
        throw new AppError("VALIDATION_ERROR", "稿件来源记录不存在。");
  for (const idea of state.ideas)
    for (const source of idea.sourceIds) entity(state, source.kind, source.id);
  for (const snapshot of state.snapshots)
    entity(state, "content", snapshot.contentId);
  const ids = new Set<string>();
  for (const kind of [
    "accounts",
    "inbox",
    "intelligence",
    "ideas",
    "drafts",
    "content",
    "snapshots",
    "assets",
    "competitors",
    "events",
  ] as const)
    for (const item of state[kind]) {
      if (ids.has(item.id))
        throw new AppError("VALIDATION_ERROR", "备份中存在重复记录 ID。");
      ids.add(item.id);
    }
}
async function json(request: Request) {
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 65 * 1024 * 1024)
    throw new AppError("VALIDATION_ERROR", "请求过大，请减少附件。");
  try {
    return z.record(z.string(), z.unknown()).parse(JSON.parse(raw || "{}"));
  } catch {
    throw new AppError("VALIDATION_ERROR", "请求须为 JSON 对象。");
  }
}
function bodySource(body: Record<string, unknown>) {
  return sourceSchema.parse({
    id: randomUUID(),
    title: "",
    platform: "小红书",
    originalContent: "",
    summary: "",
    url: "",
    note: "",
    author: "",
    tags: [],
    status: "待处理",
    capturedAt: now(),
    updatedAt: now(),
    accountId: null,
    metrics: metricsSchema.parse({}),
    ...body,
  });
}
function urlValid(value: string) {
  try {
    canonicalUrl(value);
  } catch {
    throw new AppError("VALIDATION_ERROR", "请输入有效的 HTTP(S) 链接。");
  }
}
function sourceDuplicate(state: OpsState, url: string, ownId?: string) {
  if (!url) return;
  const existing = [...state.inbox, ...state.intelligence].find(
    (source) =>
      source.id !== ownId &&
      source.url &&
      canonicalUrl(source.url) === canonicalUrl(url),
  );
  if (existing)
    throw new AppError(
      "CONFLICT",
      `已有收藏「${existing.title}」，请在列表中搜索并继续编辑。`,
    );
}
function validPublication(row: z.infer<typeof contentSchema>) {
  urlValid(row.publishedUrl);
  if (
    row.status === "已发布" &&
    (!row.publishedAt || !row.publishedUrl || !row.accountId)
  )
    throw new AppError(
      "VALIDATION_ERROR",
      "登记发布需要账号、真实发布时间和发布链接。",
    );
}
export async function handleOperations(request: Request) {
  try {
    guard(request);
    const url = new URL(request.url);
    const [kind, id, action] = url.pathname
      .replace(/^\/api\/v1\/?/, "")
      .split("/")
      .map(decodeURIComponent);
    const method = request.method;
    if (method === "GET" && kind === "health") {
      await readState();
      return dataResponse({
        ok: true,
        storageMode: storageMode(),
        aiConfigured: Boolean((await readConnection()).apiKey),
        collection: "手动导入；自动采集尚未接入",
      });
    }
    if (method === "GET" && kind === "bootstrap")
      return dataResponse(publicState(await readState()));
    if (kind === "connection") {
      if (method === "GET") {
        const c = await readConnection();
        return dataResponse({
          baseUrl: c.baseUrl,
          model: c.model,
          configured: Boolean(c.apiKey),
        });
      }
      const input = await json(request);
      if (method === "POST" && id === "test")
        return dataResponse(
          await aiJson(
            z.object({ ok: z.literal(true) }),
            '连接测试，只返回 {"ok":true}',
            {},
          ),
        );
      if (method === "PUT")
        return dataResponse(
          await saveConnection(connectionSchema.parse(input)),
        );
    }
    if (kind === "backup" && method === "GET")
      return NextResponse.json(
        {
          format: "ciw-backup",
          version: 1,
          exportedAt: now(),
          state: await readState(),
        },
        {
          headers: {
            "Content-Disposition": `attachment; filename="content-workbench-${now().slice(0, 10)}.json"`,
          },
        },
      );
    const input =
      method === "GET" || method === "DELETE"
        ? {}
        : normalized(await json(request));
    if (kind === "backup" && method === "POST") {
      if (input.confirm !== true)
        throw new AppError("VALIDATION_ERROR", "请确认恢复会替换当前工作区。");
      const backup = z
        .object({
          format: z.literal("ciw-backup"),
          version: z.literal(1),
          state: stateSchema,
        })
        .parse(input.backup);
      references(backup.state);
      for (const asset of backup.state.assets)
        checkAsset(asset.mime, asset.base64);
      return dataResponse(
        await mutateState(async (state) => {
          await backupBeforeChange(state, "before-restore");
          const identity = {
            workspace: state.workspace,
            profile: state.profile,
          };
          Object.assign(state, backup.state, identity);
          event(state, "从备份恢复工作区", "/settings");
          return { restored: true };
        }),
      );
    }
    if (kind === "assets") {
      if (method === "GET") {
        const asset = (await readState()).assets.find((item) => item.id === id);
        if (!asset) throw new AppError("NOT_FOUND", "附件不存在。");
        return new Response(Buffer.from(asset.base64, "base64"), {
          headers: {
            "Content-Type": asset.mime,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
          },
        });
      }
      if (method === "DELETE")
        return dataResponse(
          await mutateState((state) => {
            if (
              [...state.inbox, ...state.intelligence, ...state.content].some(
                (s) => s.assetIds.includes(id),
              )
            )
              throw new AppError(
                "CONFLICT",
                "附件仍被引用，先移除引用并保存。",
              );
            const index = state.assets.findIndex((a) => a.id === id);
            if (index < 0) throw new AppError("NOT_FOUND", "附件不存在。");
            state.assets.splice(index, 1);
            return { deleted: true };
          }),
        );
      if (method === "POST") {
        const asset = assetSchema.parse({
          ...input,
          id: randomUUID(),
          createdAt: now(),
        });
        checkAsset(asset.mime, asset.base64);
        return dataResponse(
          await mutateState((state) => {
            if (
              state.assets.reduce((n, a) => n + a.base64.length, 0) +
                asset.base64.length >
              55000000
            )
              throw new AppError(
                "VALIDATION_ERROR",
                "附件总量达到当前个人版 40MB 上限，请整理后重试。",
              );
            state.assets.push(asset);
            return {
              id: asset.id,
              name: asset.name,
              mime: asset.mime,
              createdAt: asset.createdAt,
            };
          }),
          201,
        );
      }
    }
    if (
      (kind === "inbox" || kind === "intelligence") &&
      action === "analyze" &&
      method === "POST"
    ) {
      const before = await readState();
      const source = before[kind].find((item) => item.id === id);
      if (!source) throw new AppError("NOT_FOUND", "收藏不存在。");
      if (
        !source.originalContent.trim() ||
        /^链接地址:/.test(source.originalContent)
      )
        throw new AppError(
          "VALIDATION_ERROR",
          "只有链接，尚未读取正文。请先补充原文或视频字幕，再进行分析。",
        );
      const accountId = input.accountId || source.accountId;
      const target = before.accounts.find((a) => a.id === accountId);
      if (!target)
        throw new AppError(
          "VALIDATION_ERROR",
          "请先选择运营账号，分析才能贴合你的领域。",
        );
      const result = await aiJson(
        analysisSchema,
        "分析参考内容，返回 summary、core 字符串，reasons、angles、facts、suggestions 字符串数组。facts 仅引用材料事实，suggestions 是针对运营账号的原创建议。不要承诺爆款。",
        { account: target, source },
      );
      return dataResponse(
        await mutateState((state) => {
          const row = state[kind].find((s) => s.id === id)!;
          if (!row || row.updatedAt !== source.updatedAt)
            throw new AppError("CONFLICT", "分析期间原文已修改，请重新分析。");
          row.analysis = {
            ...result.result,
            model: result.model,
            analyzedAt: result.generatedAt,
            sourceIds: [row.id],
            accountId: target.id,
          };
          row.summary = result.result.summary;
          row.accountId = target.id;
          row.updatedAt = now();
          row.status = "待处理";
          event(state, `分析了「${row.title}」`, `/${kind}?item=${row.id}`);
          return row;
        }),
      );
    }
    if (
      (kind === "inbox" || kind === "intelligence") &&
      action === "convert" &&
      method === "POST"
    )
      return dataResponse(
        await mutateState((state) => {
          const source = state[kind].find((s) => s.id === id);
          if (!source) throw new AppError("NOT_FOUND", "收藏不存在。");
          const existing = state.ideas.find((i) =>
            i.sourceIds.some((ref) => ref.kind === kind && ref.id === id),
          );
          if (existing) return { idea: existing, created: false };
          const idea = ideaSchema.parse({
            id: randomUUID(),
            title: source.title,
            angle: source.analysis?.angles[0] || "",
            priority: "A",
            platforms: [source.platform],
            status: "待筛选",
            tags: source.tags,
            sourceIds: [{ kind, id }],
            score: null,
            core:
              source.analysis?.core || source.originalContent || source.note,
            audience:
              state.accounts.find((a) => a.id === source.accountId)?.audience ||
              "",
            cta: "",
            titles: [source.title],
            outline: "",
            hook: "",
            script: "",
            materials: "",
            strategy: "",
            accountId: source.accountId,
            createdAt: now(),
            updatedAt: now(),
          });
          state.ideas.unshift(idea);
          source.status = "已转选题";
          source.updatedAt = now();
          event(state, `创建选题「${idea.title}」`, `/ideas/${idea.id}`);
          return { idea, created: true };
        }),
      );
    if (kind === "ideas" && action === "generate" && method === "POST") {
      const state = await readState();
      const idea = state.ideas.find((i) => i.id === id);
      if (!idea) throw new AppError("NOT_FOUND", "选题不存在。");
      const target = state.accounts.find((a) => a.id === input.accountId);
      if (!target) throw new AppError("VALIDATION_ERROR", "请选择运营账号。");
      const platform = z.enum(operationPlatforms).parse(input.platform);
      const sources = idea.sourceIds
        .map((ref) => state[ref.kind].find((s) => s.id === ref.id))
        .filter(Boolean);
      const result = await aiJson(
        generatedDraftSchema,
        `为 ${platform} 生成原创运营稿。返回 title、hook、outline、script、caption、materials 六个字符串字段。抖音重视口播与镜头节奏，小红书重视图文结构与可保存的信息。服从账号领域、受众、语气和目标。参考素材没有内容时只基于用户选题，不宣称已读取链接。`,
        { account: target, idea, sources },
      );
      return dataResponse({
        ...result.result,
        model: result.model,
        generatedAt: result.generatedAt,
        sourceIds: sources.map((s) => s!.id),
        accountId: target.id,
        platform,
        ideaId: idea.id,
      });
    }
    if (kind === "analytics" && method === "GET") {
      const state = await readState();
      return dataResponse({
        latest: latestSnapshots(state.snapshots),
        views: totalMetric(state.snapshots, "views"),
      });
    }
    if (kind === "analytics" && id === "review" && method === "POST") {
      const state = await readState();
      const selected = state.content.filter(
        (c) =>
          c.status === "已发布" &&
          (!input.accountId || c.accountId === input.accountId),
      );
      const snapshots = latestSnapshots(
        state.snapshots.filter((s) =>
          selected.some((c) => c.id === s.contentId),
        ),
      );
      if (
        !snapshots.some((s) => Object.values(s.metrics).some((v) => v !== null))
      )
        throw new AppError(
          "VALIDATION_ERROR",
          "请先录入已发布内容的表现数据，才能生成复盘。",
        );
      const review = await aiJson(
        z.object({
          summary: z.string(),
          findings: z.array(
            z.object({ contentId: z.string().uuid(), observation: z.string() }),
          ),
          nextSteps: z.array(z.string()),
        }),
        "基于真实快照复盘。返回 summary、findings（每项 contentId、observation）、nextSteps。只能引用提供的 contentId。单期累计快照不能证明增长；样本不足明确指出。不同账号和平台分开判断。",
        { accounts: state.accounts, content: selected, snapshots },
      );
      if (
        review.result.findings.some(
          (f) => !snapshots.some((s) => s.contentId === f.contentId),
        )
      )
        throw new AppError(
          "VALIDATION_ERROR",
          "AI 复盘引用了未提供数据的记录，请重试。",
        );
      return dataResponse(review);
    }
    const collections = [
      "accounts",
      "inbox",
      "intelligence",
      "ideas",
      "drafts",
      "content",
      "snapshots",
      "competitors",
    ] as const;
    const collection = collections.find((c) => c === kind);
    if (!collection) throw new AppError("NOT_FOUND", "接口不存在。");
    if (method === "GET") {
      const state = await readState();
      if (id) return dataResponse(entity(state, kind, id));
      const rows = state[collection];
      return dataResponse({
        items: rows,
        pagination: {
          page: 1,
          pageSize: rows.length,
          total: rows.length,
          totalPages: rows.length ? 1 : 0,
        },
      });
    }
    return dataResponse(
      await mutateState(async (state) => {
        const list = state[collection] as { id: string }[];
        const existing = id ? entity(state, kind, id) : undefined;
        if (method === "DELETE") {
          const referenced =
            collection === "accounts"
              ? [
                  ...state.inbox,
                  ...state.intelligence,
                  ...state.ideas,
                  ...state.drafts,
                  ...state.content,
                ].some((row) => row.accountId === id)
              : collection === "ideas"
                ? state.drafts.some((d) => d.ideaId === id) ||
                  state.content.some((c) => c.ideaId === id)
                : collection === "drafts"
                  ? state.content.some((c) => c.draftId === id)
                  : collection === "inbox" || collection === "intelligence"
                    ? state.ideas.some((i) =>
                        i.sourceIds.some((s) => s.id === id),
                      )
                    : false;
          if (referenced)
            throw new AppError(
              "CONFLICT",
              "该记录仍被使用，请先解除关联或归档。",
            );
          list.splice(
            list.findIndex((row) => row.id === id),
            1,
          );
          if (collection === "content")
            state.snapshots = state.snapshots.filter((s) => s.contentId !== id);
          event(
            state,
            "删除了一条记录",
            `/${kind === "content" ? "production" : kind === "snapshots" ? "analytics" : kind === "accounts" ? "settings" : kind}`,
          );
          return { deleted: true };
        }
        if (!["POST", "PATCH"].includes(method))
          throw new AppError("VALIDATION_ERROR", "不支持此操作。");
        if (method === "PATCH" && !id)
          throw new AppError("VALIDATION_ERROR", "更新需要记录 ID。");
        if (collection === "content" && !existing && input.draftId) {
          const previous = state.content.find(
            (c) => c.draftId === input.draftId && c.status !== "已归档",
          );
          if (previous) return previous;
        }
        const base = {
          id: randomUUID(),
          createdAt: now(),
          ...existing,
          ...input,
          ...(existing ? { id: existing.id } : {}),
          updatedAt: now(),
        };
        let row: { id: string };
        switch (collection) {
          case "accounts":
            row = accountSchema.parse({
              name: "",
              platform: "小红书",
              domain: "",
              audience: "",
              tone: "",
              goal: "",
              ...base,
            });
            break;
          case "inbox":
          case "intelligence": {
            const source = bodySource(base);
            urlValid(source.url);
            sourceDuplicate(state, source.url, id);
            source.status = !source.originalContent.trim()
              ? "待补充"
              : source.status === "待补充"
                ? "待处理"
                : source.status;
            if (
              existing &&
              input.originalContent !== undefined &&
              input.originalContent !==
                (existing as z.infer<typeof sourceSchema>).originalContent
            ) {
              source.analysis = undefined;
              source.summary = "";
            }
            row = source;
            break;
          }
          case "ideas":
            row = ideaSchema.parse({
              title: "",
              angle: "",
              priority: "A",
              platforms: ["小红书"],
              status: "待筛选",
              tags: [],
              sourceIds: [],
              score: null,
              core: "",
              audience: "",
              cta: "",
              titles: [],
              outline: "",
              hook: "",
              script: "",
              materials: "",
              strategy: "",
              accountId: null,
              ...base,
            });
            break;
          case "drafts": {
            const previous = existing as
              z.infer<typeof draftSchema> | undefined;
            if (previous && input.version !== previous.version)
              throw new AppError(
                "CONFLICT",
                "稿件已被其他操作更新，请重新打开后保存。",
              );
            if (
              !previous &&
              state.drafts.some(
                (d) =>
                  d.ideaId === input.ideaId &&
                  d.accountId === input.accountId &&
                  d.platform === input.platform,
              )
            )
              throw new AppError(
                "CONFLICT",
                "该账号的平台稿件已存在，请打开原稿编辑。",
              );
            row = draftSchema.parse({
              title: "",
              hook: "",
              outline: "",
              script: "",
              caption: "",
              materials: "",
              ...base,
              version: previous ? previous.version + 1 : 1,
            });
            if (previous) await backupDraft(previous);
            break;
          }
          case "content": {
            const content = contentSchema.parse({
              title: "",
              platform: "小红书",
              status: "待制作",
              scheduledAt: null,
              publishedAt: null,
              publishedUrl: "",
              ideaId: null,
              draftId: null,
              accountId: null,
              assignee: "我",
              materials: "",
              ...base,
            });
            validPublication(content);
            row = content;
            break;
          }
          case "snapshots":
            row = snapshotSchema.parse({
              capturedAt: now(),
              note: "",
              ...base,
            });
            break;
          case "competitors":
            row = competitorSchema.parse({
              name: "",
              handle: "",
              platform: "小红书",
              description: "",
              followers: null,
              monitored: false,
              ...base,
            });
            break;
        }
        if (existing)
          list.splice(
            list.findIndex((item) => item.id === id),
            1,
            row,
          );
        else list.unshift(row);
        references(state);
        event(
          state,
          `${existing ? "更新" : "新增"}了${collection === "drafts" ? "平台稿件" : collection === "snapshots" ? "表现快照" : "记录"}`,
          collection === "drafts"
            ? `/ideas/${(row as z.infer<typeof draftSchema>).ideaId}`
            : `/${kind === "content" ? "production" : kind === "snapshots" ? "analytics" : kind === "accounts" ? "settings" : kind}`,
        );
        return row;
      }),
      method === "POST" ? 201 : 200,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
function checkAsset(mime: string, base64: string) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))
    throw new AppError("VALIDATION_ERROR", "附件编码无效。");
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length || buffer.length > 5 * 1024 * 1024)
    throw new AppError("VALIDATION_ERROR", "参考图片最大 5MB。");
  const valid =
    mime === "image/png"
      ? buffer
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : mime === "image/jpeg"
        ? buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
        : buffer.toString("ascii", 0, 4) === "RIFF" &&
          buffer.toString("ascii", 8, 12) === "WEBP";
  if (!valid) throw new AppError("VALIDATION_ERROR", "图片类型与内容不匹配。");
}
export function contentFingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
