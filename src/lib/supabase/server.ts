import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.types";
import { getSupabaseConfig } from "./config";
import { AppError } from "../../server/http/errors";

export async function getSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const config = getSupabaseConfig();
  if (!config) throw new AppError("BACKEND_NOT_CONFIGURED", "本地 Supabase 尚未配置。");
  const cookieStore = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          return;
        }
      },
    },
  });
}
