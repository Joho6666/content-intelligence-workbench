import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { demoState } from "../src/data/mock-state";

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local is optional when the caller exports the variables.
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "http://127.0.0.1:58321";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const email = process.env.SEED_DEMO_EMAIL?.trim();
const password = process.env.SEED_DEMO_PASSWORD;

if (!serviceRoleKey || !email || !password) {
  throw new Error("SEED_DEMO_EMAIL, SEED_DEMO_PASSWORD and SUPABASE_SERVICE_ROLE_KEY are required.");
}
const seedEmail = email;
const seedPassword = password;

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
const demoUser = await findOrCreateUser();
const workspace = await getWorkspace();

function stableId(label: string) {
  const digest = createHash("sha256").update("content-workbench:" + label).digest("hex").slice(0, 32);
  return digest.slice(0, 8) + "-" + digest.slice(8, 12) + "-4" + digest.slice(13, 16) + "-8" + digest.slice(17, 20) + "-" + digest.slice(20);
}

async function findOrCreateUser() {
  for (let page = 1; page <= 10; page += 1) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) throw new Error("Unable to inspect local demo user.");
    const existing = result.data.users.find((user) => user.email?.toLowerCase() === seedEmail.toLowerCase());
    if (existing) return existing;
    if (result.data.users.length < 1000) break;
  }
  const result = await admin.auth.admin.createUser({ email: seedEmail, password: seedPassword, email_confirm: true, user_metadata: { full_name: "Demo 创作者" } });
  if (result.error || !result.data.user) throw new Error("Unable to create the local demo user.");
  return result.data.user;
}

async function getWorkspace() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await admin.from("workspaces").select("*").eq("owner_id", demoUser.id).single();
    if (result.data) return result.data;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Demo workspace was not created by the auth trigger.");
}

const inboxRows = demoState.inbox.map((item) => ({
  id: stableId("inbox:" + item.id), workspace_id: workspace.id, title: item.title, summary: item.summary,
  original_content: item.originalContent, note: item.note, url: item.url, platform: item.platform,
  source_type: item.sourceType, capture_method: item.captureMethod, author: item.author, thumbnail: item.thumbnail,
  ai_score: item.aiScore, status: item.status, tags: item.tags, captured_at: item.capturedAt, metrics: item.metrics,
  mode: item.mode, analysis: item.analysis ?? null,
}));
const intelligenceRows = demoState.intelligence.map((item) => ({
  id: stableId("intelligence:" + item.id), workspace_id: workspace.id, title: item.title, summary: item.summary,
  original_content: item.originalContent, note: item.note, url: item.url, platform: item.platform,
  source_type: item.sourceType, capture_method: item.captureMethod, author: item.author, thumbnail: item.thumbnail,
  ai_score: item.aiScore, status: item.status, tags: item.tags, captured_at: item.capturedAt, metrics: item.metrics,
  analysis: item.analysis ?? null,
}));
const ideaRows = demoState.ideas.map((item, index) => ({
  id: stableId("idea:" + item.id), workspace_id: workspace.id, title: item.title, angle: item.angle, priority: item.priority,
  platforms: item.platforms, status: item.status, tags: item.tags, score: item.score, core: item.core, audience: item.audience,
  cta: item.cta, title_variants: item.titles, outline: item.outline, hook: item.hook, script: item.script,
  materials: item.materials, strategy: item.strategy, metadata: item.metadata ?? {}, sort_order: index,
}));
const competitorRows = demoState.competitors.map((item) => ({
  id: stableId("competitor:" + item.id), workspace_id: workspace.id, name: item.name, handle: item.handle,
  platform: item.platform, avatar: item.avatar, description: item.description, followers: item.followers,
  posts_7d: item.posts7d, avg_views: item.avgViews, avg_engagement: item.avgEngagement, outlier_index: item.outlierIndex,
  recent_topics: item.recentTopics, monitored: item.monitored, trend: item.trend, hooks: item.hooks, insights: item.insights,
}));
const competitorIdByMockId = new Map(demoState.competitors.map((item) => [item.id, stableId("competitor:" + item.id)]));
const competitorContentRows = demoState.competitors.flatMap((item) => item.recentContent.map((content) => ({
  id: stableId("competitor-content:" + content.id), workspace_id: workspace.id, competitor_id: competitorIdByMockId.get(item.id),
  external_id: content.id, title: content.title, thumbnail: content.thumbnail, views: content.views, likes: content.likes,
  outlier_index: content.outlier, published_at: item.updatedAt,
})));
const contentRows = demoState.content.map((item) => ({
  id: stableId("content:" + item.id), workspace_id: workspace.id, idea_id: item.ideaId ? stableId("idea:" + item.ideaId) : null,
  title: item.title, platform: item.platform, status: item.status, scheduled_at: item.scheduledAt ? new Date(item.scheduledAt).toISOString() : null,
  assignee: item.assignee, metadata: {},
}));

await upsert("inbox_items", inboxRows);
await upsert("intelligence_items", intelligenceRows);
await upsert("ideas", ideaRows);
await upsert("competitors", competitorRows);
await upsert("competitor_contents", competitorContentRows);
await upsert("content_items", contentRows);
console.log("Seeded local demo workspace:", workspace.id);
console.log("Records: " + inboxRows.length + " inbox, " + intelligenceRows.length + " intelligence, " + ideaRows.length + " ideas, " + competitorRows.length + " competitors, " + contentRows.length + " content.");

async function upsert(table: string, rows: unknown[]) {
  if (!rows.length) return;
  const result = await (admin as unknown as { from(name: string): { upsert(values: unknown[], options: { onConflict: string }): Promise<{ error: unknown }> } }).from(table).upsert(rows, { onConflict: "id" });
  if (result.error) throw new Error("Unable to seed " + table + ".");
}
}

main().catch((error: unknown) => {
  process.stderr.write((error instanceof Error ? error.message : "Seeding failed.") + "\n");
  process.exitCode = 1;
});
