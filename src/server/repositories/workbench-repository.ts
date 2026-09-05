import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.types";
import { AppError, mapDatabaseError } from "../http/errors";

export type DbClient = SupabaseClient<Database>;
export type TableName = keyof Database["public"]["Tables"];

export async function getBootstrapRows(client: DbClient, workspaceId: string) {
  const [profileResult, workspaceResult, inboxResult, intelligenceResult, competitorsResult, competitorContentsResult, ideasResult, sourcesResult, contentResult] = await Promise.all([
    client.from("profiles").select("*").maybeSingle(),
    client.from("workspaces").select("*").eq("id", workspaceId).single(),
    client.from("inbox_items").select("*").eq("workspace_id", workspaceId).order("captured_at", { ascending: false }),
    client.from("intelligence_items").select("*").eq("workspace_id", workspaceId).order("captured_at", { ascending: false }),
    client.from("competitors").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }),
    client.from("competitor_contents").select("*").eq("workspace_id", workspaceId).order("published_at", { ascending: false }),
    client.from("ideas").select("*").eq("workspace_id", workspaceId).order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
    client.from("idea_sources").select("*").eq("workspace_id", workspaceId),
    client.from("content_items").select("*").eq("workspace_id", workspaceId).order("scheduled_at", { ascending: true, nullsFirst: false }),
  ]);
  const results = [profileResult, workspaceResult, inboxResult, intelligenceResult, competitorsResult, competitorContentsResult, ideasResult, sourcesResult, contentResult];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw mapDatabaseError(failed.error);
  if (!workspaceResult.data) throw new Error("Workspace bootstrap returned no data");
  return {
    profile: profileResult.data,
    workspace: workspaceResult.data,
    inbox: inboxResult.data ?? [],
    intelligence: intelligenceResult.data ?? [],
    competitors: competitorsResult.data ?? [],
    competitorContents: competitorContentsResult.data ?? [],
    ideas: ideasResult.data ?? [],
    sources: sourcesResult.data ?? [],
    content: contentResult.data ?? [],
  };
}

export async function getById<T extends TableName>(client: DbClient, table: T, id: string, workspaceId: string) {
  const result = await (client as unknown as SupabaseClient).from(table).select("*").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
  if (result.error) throw mapDatabaseError(result.error);
  return result.data as unknown as (Database["public"]["Tables"][T]["Row"] | null);
}

export async function insertRow<T extends TableName>(
  client: DbClient,
  table: T,
  payload: Database["public"]["Tables"][T]["Insert"],
) {
  const result = await (client as unknown as SupabaseClient).from(table).insert(payload as never).select("*").single();
  if (result.error) throw mapDatabaseError(result.error);
  return result.data as unknown as Database["public"]["Tables"][T]["Row"];
}

export async function updateRow<T extends TableName>(
  client: DbClient,
  table: T,
  id: string,
  workspaceId: string,
  payload: Database["public"]["Tables"][T]["Update"],
) {
  const result = await (client as unknown as SupabaseClient).from(table).update(payload as never).eq("id", id).eq("workspace_id", workspaceId).select("*").maybeSingle();
  if (result.error) throw mapDatabaseError(result.error);
  if (!result.data) throw new AppError("NOT_FOUND", "记录不存在。");
  return result.data as unknown as Database["public"]["Tables"][T]["Row"];
}

export async function deleteRow<T extends TableName>(client: DbClient, table: T, id: string, workspaceId: string) {
  const result = await (client as unknown as SupabaseClient).from(table).delete().eq("id", id).eq("workspace_id", workspaceId);
  if (result.error) throw mapDatabaseError(result.error);
}
