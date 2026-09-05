import test from "node:test";
import assert from "node:assert/strict";
import { AppError, mapDatabaseError } from "../src/server/http/errors";

test("HTTP errors map database failures to safe public responses", () => {
  assert.equal(mapDatabaseError({ code: "23505", message: "secret constraint" }).code, "CONFLICT");
  assert.equal(mapDatabaseError({ code: "23503" }).code, "VALIDATION_ERROR");
  assert.equal(mapDatabaseError({ code: "42501" }).code, "FORBIDDEN");
  assert.equal(mapDatabaseError({ code: "P0002" }).code, "NOT_FOUND");
  assert.equal(mapDatabaseError({ code: "22023" }).code, "VALIDATION_ERROR");
  assert.equal(mapDatabaseError({ code: "XX000", message: "internal stack trace" }).message, "数据服务暂时不可用。");
  assert.equal(new AppError("BACKEND_NOT_CONFIGURED", "未配置").status, 503);
});
