export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BACKEND_NOT_CONFIGURED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status = statusForCode(code),
  ) {
    super(message);
    this.name = "AppError";
  }
}

function statusForCode(code: ErrorCode) {
  switch (code) {
    case "VALIDATION_ERROR": return 422;
    case "UNAUTHENTICATED": return 401;
    case "FORBIDDEN": return 403;
    case "NOT_FOUND": return 404;
    case "CONFLICT": return 409;
    case "BACKEND_NOT_CONFIGURED": return 503;
    default: return 500;
  }
}

export function mapDatabaseError(error: { code?: string; message?: string } | null | undefined): AppError {
  if (!error) return new AppError("INTERNAL_ERROR", "请求未能完成。");
  if (error.code === "23505") return new AppError("CONFLICT", "记录已存在。");
  if (error.code === "23503") return new AppError("VALIDATION_ERROR", "关联记录不存在。");
  if (error.code === "42501") return new AppError("FORBIDDEN", "没有权限访问该记录。");
  if (error.code === "P0002") return new AppError("NOT_FOUND", "记录不存在。");
  if (error.code?.startsWith("22")) return new AppError("VALIDATION_ERROR", "提交的数据不合法。");
  return new AppError("INTERNAL_ERROR", "数据服务暂时不可用。");
}
