import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "../../lib/supabase/server";
import type { Database } from "../../types/database.types";
import { AppError, mapDatabaseError } from "../http/errors";

export interface AuthContext {
  client: SupabaseClient<Database>;
  user: User;
  workspace: Database["public"]["Tables"]["workspaces"]["Row"];
}

type WorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"];

export function resolveWorkspace(workspace: WorkspaceRow | null, userId: string) {
  if (!workspace) throw new AppError("INTERNAL_ERROR", "当前账号尚未初始化工作区。");
  if (workspace.owner_id !== userId) throw new AppError("FORBIDDEN", "没有权限访问该工作区。");
  return workspace;
}

export async function requireAuth(): Promise<AuthContext> {
  const client = await getSupabaseServerClient();
  let data: Awaited<ReturnType<typeof client.auth.getUser>>["data"];
  let error: Awaited<ReturnType<typeof client.auth.getUser>>["error"];
  try {
    ({ data, error } = await client.auth.getUser());
  } catch {
    throw new AppError("BACKEND_NOT_CONFIGURED", "本地 Supabase 暂时不可用。");
  }
  if (error && !isMissingAuthSession(error)) throw new AppError("BACKEND_NOT_CONFIGURED", "本地 Supabase 暂时不可用。");
  if (!data.user) throw new AppError("UNAUTHENTICATED", "本地访客会话尚未建立。");
  let workspace: WorkspaceRow | null = null;
  let workspaceError: { code?: string; message?: string } | null = null;
  try {
    ({ data: workspace, error: workspaceError } = await client
      .from("workspaces")
      .select("*")
      .eq("owner_id", data.user.id)
      .maybeSingle());
  } catch {
    throw new AppError("BACKEND_NOT_CONFIGURED", "本地 Supabase 暂时不可用。");
  }
  if (workspaceError) throw mapDatabaseError(workspaceError);
  return { client, user: data.user, workspace: resolveWorkspace(workspace, data.user.id) };
}

function isMissingAuthSession(error: { name?: string; code?: string; status?: number }) {
  return error.name === "AuthSessionMissingError" || error.code === "session_not_found" || error.status === 401;
}
