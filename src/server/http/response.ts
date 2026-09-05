import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, mapDatabaseError } from "./errors";

export function dataResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(error: unknown) {
  const normalized = error instanceof ZodError
    ? new AppError("VALIDATION_ERROR", error.issues[0]?.message || "请求参数不合法。")
    : error instanceof AppError
      ? error
      : isDatabaseError(error)
        ? mapDatabaseError(error)
        : new AppError("INTERNAL_ERROR", "服务暂时不可用。");
  return NextResponse.json({ error: { code: normalized.code, message: normalized.message } }, { status: normalized.status });
}

export async function parseJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "请求体必须是合法 JSON。");
  }
}

export function withApi(handler: () => Promise<Response>) {
  return handler().catch(errorResponse);
}

function isDatabaseError(error: unknown): error is { code?: string; message?: string } {
  return Boolean(error && typeof error === "object" && ("code" in error || "message" in error));
}
