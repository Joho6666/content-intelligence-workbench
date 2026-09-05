import { AppError } from "./errors";
import { idSchema } from "../validation/schemas";

export function parseId(value: string) {
  const result = idSchema.safeParse(value);
  if (!result.success) throw new AppError("VALIDATION_ERROR", "ID 格式不正确。");
  return result.data;
}
