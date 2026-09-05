import test from "node:test";
import assert from "node:assert/strict";
import { contentAssetPath } from "../src/server/storage/content-assets";

test("Storage helper enforces the workspace asset path contract", () => {
  assert.equal(
    contentAssetPath("00000000-0000-4000-8000-000000000001", "inbox", "00000000-0000-4000-8000-000000000002", "cover.png"),
    "00000000-0000-4000-8000-000000000001/inbox/00000000-0000-4000-8000-000000000002/cover.png",
  );
  assert.throws(() => contentAssetPath("not-a-uuid", "inbox", "00000000-0000-4000-8000-000000000002", "cover.png"), /资源路径不合法/);
  assert.throws(() => contentAssetPath("00000000-0000-4000-8000-000000000001", "other", "00000000-0000-4000-8000-000000000002", "cover.png"), /资源路径不合法/);
  assert.throws(() => contentAssetPath("00000000-0000-4000-8000-000000000001", "inbox", "00000000-0000-4000-8000-000000000002", "../cover.png"), /资源路径不合法/);
});
