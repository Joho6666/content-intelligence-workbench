import {
  createClient,
  type SupabaseClient,
  type Session,
} from "@supabase/supabase-js";
import type { Database } from "../../types/database.types";
import { getSupabaseConfig } from "./config";
import { AppError } from "../../server/http/errors";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Local single-owner identity survives browser cookies. Never use this app as a public multi-user server.
let ownerPromise: Promise<SupabaseClient<Database>> | null = null;
export async function getSupabaseServerClient(): Promise<
  SupabaseClient<Database>
> {
  if (ownerPromise) return ownerPromise;
  ownerPromise = establishOwner().catch((error) => {
    ownerPromise = null;
    throw error;
  });
  return ownerPromise;
}
async function establishOwner() {
  const config = getSupabaseConfig();
  if (!config)
    throw new AppError("BACKEND_NOT_CONFIGURED", "Supabase 尚未配置。");
  const client = createClient<Database>(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: true },
  });
  const dir = path.resolve(
    /* turbopackIgnore: true */ process.env.WORKBENCH_DATA_DIR || "work/local",
  );
  const file = path.join(dir, "supabase-owner.json");
  await mkdir(dir, { recursive: true, mode: 0o700 });
  async function persist(session: Session) {
    const temporary = file + randomUUID() + ".tmp";
    await writeFile(
      temporary,
      JSON.stringify({
        url: config!.url,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
      { mode: 0o600 },
    );
    await rename(temporary, file);
  }
  let saved: {
    url: string;
    access_token: string;
    refresh_token: string;
  } | null = null;
  try {
    saved = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      throw new AppError(
        "BACKEND_NOT_CONFIGURED",
        "本机身份文件不可读，请先恢复备份，不能自动创建空工作区。",
      );
  }
  let result;
  if (saved) {
    if (saved.url !== config.url)
      throw new AppError(
        "CONFLICT",
        "Supabase 地址已变化，请选择新的数据目录以保留原身份。",
      );
    result = await client.auth.setSession(saved);
  } else if (process.env.OWNER_EMAIL && process.env.OWNER_PASSWORD) {
    result = await client.auth.signInWithPassword({
      email: process.env.OWNER_EMAIL,
      password: process.env.OWNER_PASSWORD,
    });
  } else {
    // Adopt an existing, verified browser identity once. Never create anonymous users.
    const jar = await cookies();
    const browserClient = createServerClient<Database>(config.url, config.key, {
      cookies: { getAll: () => jar.getAll(), setAll: () => {} },
    });
    const verified = await browserClient.auth.getUser();
    const session = await browserClient.auth.getSession();
    if (
      verified.error ||
      !verified.data.user ||
      !session.data.session ||
      verified.data.user.id !== session.data.session.user.id
    )
      throw new AppError(
        "BACKEND_NOT_CONFIGURED",
        "首次连接 Supabase 请使用原浏览器会话，或配置已有账号的 OWNER_EMAIL 和 OWNER_PASSWORD。不会创建新的匿名工作区。",
      );
    result = await client.auth.setSession(session.data.session);
  }
  if (result.error || !result.data.session)
    throw new AppError(
      "UNAUTHENTICATED",
      "本机身份无法恢复，请检查原账号配置或身份备份。",
    );
  await persist(result.data.session);
  client.auth.onAuthStateChange((_event, session) => {
    if (session) void persist(session);
  });
  return client;
}
