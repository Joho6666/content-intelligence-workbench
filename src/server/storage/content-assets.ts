import type { AuthContext } from "../auth/context";
import { AppError } from "../http/errors";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function contentAssetPath(workspaceId: string, entity: string, entityId: string, filename: string) {
  if (!uuid.test(workspaceId) || !uuid.test(entityId) || !/^(inbox|intelligence|competitors|ideas|content)$/i.test(entity) || !filename || filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    throw new AppError("VALIDATION_ERROR", "资源路径不合法。");
  }
  return workspaceId + "/" + entity + "/" + entityId + "/" + filename;
}

export async function uploadContentAsset(context: AuthContext, entity: string, entityId: string, filename: string, file: File | Blob, contentType?: string) {
  const path = contentAssetPath(context.workspace.id, entity, entityId, filename);
  const result = await context.client.storage.from("content-assets").upload(path, file, {
    contentType,
    upsert: false,
  });
  if (result.error) throw new AppError("INTERNAL_ERROR", "资源上传失败。");
  return { path: result.data.path };
}

export async function removeContentAsset(context: AuthContext, entity: string, entityId: string, filename: string) {
  const path = contentAssetPath(context.workspace.id, entity, entityId, filename);
  const result = await context.client.storage.from("content-assets").remove([path]);
  if (result.error) throw new AppError("INTERNAL_ERROR", "资源删除失败。");
}
