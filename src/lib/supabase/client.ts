"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.types";
import { getSupabaseConfig } from "./config";

let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient() {
  const config = getSupabaseConfig();
  if (!config) return null;
  browserClient ??= createBrowserClient<Database>(config.url, config.key);
  return browserClient;
}

export async function ensureAnonymousSession() {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("本地 Supabase 尚未配置。");

  const { data: current } = await client.auth.getUser();
  if (current.user) return current.user;

  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw new Error(error?.message || "无法创建本地访客会话。");
  return data.user;
}
