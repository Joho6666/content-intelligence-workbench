import { z } from "zod";

export const operationPlatforms = [
  "抖音",
  "小红书",
  "TikTok",
  "YouTube",
  "X",
  "Bilibili",
  "微信公众号",
  "网页",
  "自己想到",
] as const;
export const stages = [
  "待筛选",
  "候选选题",
  "待制作",
  "制作中",
  "待发布",
  "已发布",
] as const;
const text = (max = 4000) => z.string().max(max);
const id = z.string().uuid();
const optionalId = id.nullable().default(null);
const timestamp = z.string().datetime({ offset: true });
const metric = z.number().int().nonnegative().nullable().default(null);
export const metricsSchema = z.object({
  views: metric,
  likes: metric,
  comments: metric,
  saves: metric,
  shares: metric,
  leads: metric,
});
export const accountSchema = z.object({
  id,
  name: text(120).min(1),
  platform: z.enum(operationPlatforms),
  domain: text(500).min(1),
  audience: text(1000).min(1),
  tone: text(500),
  goal: text(1000),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export const analysisSchema = z.object({
  summary: text(),
  core: text(),
  reasons: z.array(text()).max(20),
  angles: z.array(text()).max(20),
  facts: z.array(text()).max(30),
  suggestions: z.array(text()).max(30),
});
export const sourceSchema = z.object({
  id,
  title: text(240).min(1),
  platform: z.enum(operationPlatforms),
  originalContent: text(30000),
  summary: text(),
  url: text(2048),
  note: text(),
  author: text(240),
  tags: z.array(text(80)).max(30),
  status: text(40),
  capturedAt: timestamp,
  updatedAt: timestamp,
  accountId: optionalId,
  metrics: metricsSchema,
  analysis: analysisSchema
    .extend({
      model: text(240),
      analyzedAt: timestamp,
      sourceIds: z.array(id),
      accountId: optionalId,
    })
    .optional(),
  aiScore: z.number().nullable().default(null),
  thumbnail: text(2048).default("#eaf1ff"),
  sourceType: text(80).default("手动收藏"),
  captureMethod: text(80).default("快速添加"),
  mode: text(80).default("选中内容"),
  assetIds: z.array(id).default([]),
  metricsVerified: z.boolean().default(true),
});
export const ideaSchema = z.object({
  id,
  title: text(240).min(1),
  angle: text(),
  priority: z.enum(["S", "A", "B"]),
  platforms: z.array(z.enum(operationPlatforms)).min(1),
  status: z.enum(stages),
  tags: z.array(text(80)),
  sourceIds: z.array(z.object({ kind: z.enum(["inbox", "intelligence"]), id })),
  score: z.number().nullable().default(null),
  core: text(),
  audience: text(),
  cta: text(),
  titles: z.array(text(240)),
  outline: text(30000),
  hook: text(30000),
  script: text(30000),
  materials: text(10000),
  strategy: text(10000),
  accountId: optionalId,
  createdAt: timestamp,
  updatedAt: timestamp,
  metadata: z.record(z.string(), z.unknown()).optional(),
  sortOrder: z.number().optional(),
});
export const draftSchema = z.object({
  id,
  ideaId: id,
  accountId: id,
  platform: z.enum(operationPlatforms),
  title: text(240),
  hook: text(10000),
  outline: text(30000),
  script: text(30000),
  caption: text(30000),
  materials: text(10000),
  model: text(240).default("手动编辑"),
  sourceIds: z.array(id).default([]),
  createdAt: timestamp,
  updatedAt: timestamp,
  version: z.number().int().min(1),
});
export const generatedDraftSchema = draftSchema.pick({
  title: true,
  hook: true,
  outline: true,
  script: true,
  caption: true,
  materials: true,
});
export const contentSchema = z.object({
  id,
  title: text(240).min(1),
  platform: z.enum(operationPlatforms),
  status: z.enum(["待制作", "制作中", "待发布", "已发布", "已归档"]),
  scheduledAt: timestamp.nullable(),
  publishedAt: timestamp.nullable(),
  publishedUrl: text(2048),
  ideaId: optionalId,
  draftId: optionalId,
  accountId: optionalId,
  assignee: text(240),
  materials: text(10000),
  assetIds: z.array(id).default([]),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export const snapshotSchema = z.object({
  id,
  contentId: id,
  capturedAt: timestamp,
  metrics: metricsSchema,
  note: text(),
});
export const assetSchema = z.object({
  id,
  name: text(240),
  mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
  base64: text(8000000),
  createdAt: timestamp,
});
export const competitorSchema = z.object({
  id,
  name: text(240),
  handle: text(240),
  platform: z.enum(operationPlatforms),
  description: text(),
  followers: metric,
  monitored: z.boolean(),
  updatedAt: timestamp,
  metricsVerified: z.boolean().default(true),
});
export const eventSchema = z.object({
  id,
  text: text(),
  at: timestamp,
  href: text(2048),
});
export const stateSchema = z.object({
  schemaVersion: z.literal(1),
  workspace: z.object({ id, name: text(120), slug: text(120), ownerId: id }),
  profile: z.object({ id, displayName: text(120) }),
  accounts: z.array(accountSchema),
  inbox: z.array(sourceSchema),
  intelligence: z.array(sourceSchema),
  ideas: z.array(ideaSchema),
  drafts: z.array(draftSchema),
  content: z.array(contentSchema),
  snapshots: z.array(snapshotSchema),
  assets: z.array(assetSchema),
  competitors: z.array(competitorSchema),
  events: z.array(eventSchema),
});
export type OpsState = z.infer<typeof stateSchema>;
export type Account = z.infer<typeof accountSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type OpsIdea = z.infer<typeof ideaSchema>;
export type Draft = z.infer<typeof draftSchema>;
export type Content = z.infer<typeof contentSchema>;
export type Metrics = z.infer<typeof metricsSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export type PublicState = Omit<OpsState, "assets"> & {
  assets: Omit<OpsState["assets"][number], "base64">[];
  storageMode: string;
};

export function extractShare(value: string) {
  const match = value.match(/https?:\/\/[^\s<>"，。！？]+/i);
  const url = (match?.[0] ?? "").replace(/[)）\]】;；]+$/, "");
  let platform: (typeof operationPlatforms)[number] = "网页";
  try {
    const host = new URL(url).hostname;
    if (/(^|\.)douyin\.com$/.test(host)) platform = "抖音";
    if (/(^|\.)xiaohongshu\.com$|(^|\.)xhslink\.com$/.test(host))
      platform = "小红书";
  } catch {
    /* Text-only input. */
  }
  return { url, platform };
}
export function canonicalUrl(value: string) {
  if (!value.trim()) return "";
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("请使用 HTTP(S) 链接。");
  url.hash = "";
  for (const key of [...url.searchParams.keys()])
    if (/^(utm_|share_|source$|from$)/i.test(key)) url.searchParams.delete(key);
  return url.toString().replace(/\/$/, "");
}
export function latestSnapshots(snapshots: Snapshot[]) {
  const latest = new Map<string, Snapshot>();
  for (const snapshot of snapshots)
    if (
      !latest.has(snapshot.contentId) ||
      Date.parse(latest.get(snapshot.contentId)!.capturedAt) <
        Date.parse(snapshot.capturedAt)
    )
      latest.set(snapshot.contentId, snapshot);
  return [...latest.values()];
}
export function totalMetric(snapshots: Snapshot[], key: keyof Metrics) {
  const known = latestSnapshots(snapshots)
    .map((s) => s.metrics[key])
    .filter((n): n is number => n !== null);
  return known.length ? known.reduce((sum, n) => sum + n, 0) : null;
}
export function draftMarkdown(draft: Draft, accountName: string) {
  return `# ${draft.title}\n\n账号：${accountName}\n平台：${draft.platform}\n\n## 开场\n${draft.hook}\n\n## 大纲\n${draft.outline}\n\n## 脚本\n${draft.script}\n\n## 平台文案\n${draft.caption}\n\n## 素材清单\n${draft.materials}\n\n来源记录：${draft.sourceIds.join(", ")}\n生成模型：${draft.model}\n`;
}
