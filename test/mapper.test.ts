import test from "node:test";
import assert from "node:assert/strict";
import { mapCompetitor, mapContent, mapIdea, mapInbox } from "../src/server/mappers/workbench-mappers";
import type { Database } from "../src/types/database.types";

test("Repository mappers convert database rows to domain models", () => {
  const inbox = mapInbox({
    id: "inbox-1", workspace_id: "workspace-1", title: "标题", summary: "摘要", original_content: "原文", note: "备注",
    url: "https://example.com", platform: "网页", source_type: "手动发现", capture_method: "手动收藏", author: "作者",
    thumbnail: "#fff", ai_score: 92, status: "高潜", tags: ["标签"], captured_at: "2026-01-01T00:00:00.000Z",
    metrics: { views: 10, likes: 2 }, mode: "链接", analysis: { summary: "分析", core: "核心", reasons: ["理由"], angles: ["角度"] },
    created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
  } as Database["public"]["Tables"]["inbox_items"]["Row"]);
  assert.equal(inbox.originalContent, "原文");
  assert.equal(inbox.analysis?.summary, "分析");
  assert.equal(inbox.metrics.views, 10);

  const idea = mapIdea({
    id: "idea-1", workspace_id: "workspace-1", title: "选题", angle: "角度", priority: "S", platforms: ["网页"],
    status: "待筛选", tags: ["标签"], score: 88, core: "核心", audience: "受众", cta: "行动", title_variants: ["标题一"],
    outline: "大纲", hook: "钩子", script: "脚本", materials: "素材", strategy: "策略", metadata: { source: "test" }, sort_order: 1,
    created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
  } as Database["public"]["Tables"]["ideas"]["Row"], [{
    id: "source-1", workspace_id: "workspace-1", idea_id: "idea-1", source_kind: "inbox", source_id: "inbox-1",
    created_at: "2026-01-01T00:00:00.000Z",
  }]);
  assert.deepEqual(idea.sourceIds, [{ kind: "inbox", id: "inbox-1" }]);
  assert.deepEqual(idea.metadata, { source: "test" });

  const competitor = mapCompetitor({
    id: "competitor-1", workspace_id: "workspace-1", name: "对手", handle: "@duishou", platform: "网页", avatar: "对",
    description: "描述", followers: 100, posts_7d: 3, avg_views: 20, avg_engagement: 4, outlier_index: 2,
    recent_topics: ["主题"], monitored: true, trend: [{ date: "周一", views: 20, baseline: 10 }],
    hooks: [{ label: "反转", value: 80 }], insights: ["洞察"], created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
  } as Database["public"]["Tables"]["competitors"]["Row"], [{
    id: "content-1", workspace_id: "workspace-1", competitor_id: "competitor-1", external_id: "external-1", title: "内容",
    thumbnail: "#fff", views: 50, likes: 5, outlier_index: 2.5, published_at: null,
    created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
  }]);
  assert.equal(competitor.recentContent[0]?.outlier, 2.5);
  assert.equal(competitor.trend[0]?.views, 20);

  const content = mapContent({
    id: "content-1", workspace_id: "workspace-1", idea_id: "idea-1", title: "排期内容", platform: "网页", status: "待发布",
    scheduled_at: "2026-01-02T00:00:00.000Z", assignee: "创作者", metadata: {}, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
  } as Database["public"]["Tables"]["content_items"]["Row"]);
  assert.equal(content.scheduledAt, "2026-01-02T00:00:00.000Z");
  assert.equal(content.ideaId, "idea-1");
});
