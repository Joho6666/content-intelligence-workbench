import test from "node:test";
import assert from "node:assert/strict";
import { resolveWorkspace } from "../src/server/auth/context";
import type { Database } from "../src/types/database.types";

type WorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"];
const workspace = {
  id: "workspace-1", owner_id: "user-1", name: "我的工作区", slug: "workspace-1",
  created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
} as WorkspaceRow;

test("Auth context accepts only the current user's workspace", () => {
  assert.equal(resolveWorkspace(workspace, "user-1"), workspace);
  assert.throws(() => resolveWorkspace(workspace, "user-2"), /没有权限访问该工作区/);
  assert.throws(() => resolveWorkspace(null, "user-1"), /尚未初始化工作区/);
});
