import test from "node:test";
import assert from "node:assert/strict";
import { contentCreateSchema, inboxCreateSchema, listQuerySchema, moveIdeaSchema } from "../src/server/validation/schemas";

test("Zod validation rejects unsafe or unknown input", () => {
  const validInbox = {
    title: "一个可执行的灵感",
    url: "https://example.com/article",
    platform: "网页" as const,
    capture_method: "手动收藏" as const,
    mode: "链接" as const,
  };

  assert.equal(inboxCreateSchema.safeParse(validInbox).success, true);
  assert.equal(inboxCreateSchema.safeParse({ ...validInbox, url: "javascript:alert(1)" }).success, false);
  assert.equal(inboxCreateSchema.safeParse({ ...validInbox, unexpected: true }).success, false);
  assert.equal(inboxCreateSchema.safeParse({ ...validInbox, mode: "选中内容", original_content: "   " }).success, false);
  assert.equal(contentCreateSchema.safeParse({ title: "排期", platform: "网页", scheduled_at: "not-a-date" }).success, false);
  assert.equal(moveIdeaSchema.safeParse({ status: "待发布", before_id: "not-a-uuid" }).success, false);
  assert.equal(listQuerySchema.safeParse({ status: "未知状态" }).success, false);
});
