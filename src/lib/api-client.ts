export interface ApiErrorPayload {
  error?: { code?: string; message?: string };
}

export class ApiClientError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
      credentials: "same-origin",
    });
  } catch {
    throw new ApiClientError("BACKEND_NOT_CONFIGURED", "无法连接本地数据服务。", 503);
  }
  const payload = await response.json().catch(() => null) as { data?: T } & ApiErrorPayload | null;
  if (!response.ok || (!payload?.data && payload?.error)) {
    throw new ApiClientError(payload?.error?.code ?? "INTERNAL_ERROR", payload?.error?.message ?? "请求失败。", response.status);
  }
  return payload?.data as T;
}
