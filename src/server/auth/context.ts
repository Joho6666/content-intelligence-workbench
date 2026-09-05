import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "../../lib/supabase/server";
import type { Database } from "../../types/database.types";
import { AppError, mapDatabaseError } from "../http/errors";

export interface AuthContext {
  client: SupabaseClient<Database>;
  user: User;
  workspace: Database["public"]["Tables"]["workspaces"]["Row"];
}

export async function requireAuth(): Promise<AuthContext> {
  const client = await getSupabaseServerClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new AppError("UNAUTHENTICATED", "本地访客会话尚未建立。");
  const { data: workspace, error: workspaceError } = await client
    .from("workspaces")
    .select("*")
    .eq("owner_id", data.user.id)
    .maybeSingle();
  if (workspaceError) throw mapDatabaseError(workspaceError);
  if (!workspace) throw new AppError("INTERNAL_ERROR", "当前账号尚未初始化工作区。");
  return { client, user: data.user, workspace };
}
