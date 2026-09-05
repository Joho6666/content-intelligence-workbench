import { z } from "zod";
import { ideaStatuses, platforms } from "../../types";

const platform = z.enum(platforms);
const recordStatus = z.enum(["待处理", "待分析", "高潜", "已转选题", "已归档", "已忽略"]);
const captureMethod = z.enum(["手动收藏", "快速添加", "浏览器插件", "自己想到"]);
const inboxMode = z.enum(["链接", "选中内容", "我的重点"]);
const priority = z.enum(["S", "A", "B"]);
const ideaStatus = z.enum(ideaStatuses);
const contentStatus = z.enum(["待制作", "制作中", "待发布", "已发布", "已归档"]);
const listStatus = z.enum(["待处理", "待分析", "高潜", "已转选题", "已归档", "已忽略", "监控中", "已暂停", "待筛选", "候选选题", "待制作", "制作中", "待发布", "已发布"]);
const httpUrl = z.string().trim().max(2048).refine((value) => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}, "必须是合法的 HTTP(S) URL。");
const text = (max: number) => z.string().trim().max(max);
const tags = z.array(text(40)).max(30);

const inboxFields = {
  title: text(240).min(1, "标题不能为空。"),
  summary: text(4000).optional(),
  original_content: text(20000).optional(),
  note: text(4000).optional(),
  url: httpUrl.optional(),
  platform,
  source_type: text(80).optional(),
  capture_method: captureMethod,
  author: text(240).optional(),
  thumbnail: text(2048).optional(),
  ai_score: z.number().min(0).max(100).nullable().optional(),
  status: recordStatus.optional(),
  tags: tags.optional(),
  captured_at: z.string().datetime({ offset: true }).optional(),
  metrics: z.object({ views: z.number().int().min(0), likes: z.number().int().min(0) }).strict().optional(),
  mode: inboxMode,
};

export const inboxCreateSchema = z.object(inboxFields).strict().superRefine((value, context) => {
  if (value.mode === "链接" && !value.url) context.addIssue({ code: "custom", path: ["url"], message: "链接模式必须提供 URL。" });
  if (value.mode && value.mode !== "链接" && !value.original_content?.trim()) context.addIssue({ code: "custom", path: ["original_content"], message: "文本模式不能提交空白内容。" });
});

export const inboxUpdateSchema = z.object(inboxFields).partial().strict();

export const intelligenceCreateSchema = z.object({
  title: text(240).min(1),
  summary: text(4000).optional(),
  original_content: text(20000).optional(),
  note: text(4000).optional(),
  url: httpUrl.optional(),
  platform,
  source_type: text(80).optional(),
  capture_method: captureMethod,
  author: text(240).optional(),
  thumbnail: text(2048).optional(),
  ai_score: z.number().min(0).max(100).nullable().optional(),
  status: recordStatus.optional(),
  tags: tags.optional(),
  captured_at: z.string().datetime({ offset: true }).optional(),
  metrics: z.object({ views: z.number().int().min(0), likes: z.number().int().min(0) }).strict().optional(),
}).strict();

export const intelligenceUpdateSchema = intelligenceCreateSchema.partial().strict();

export const competitorCreateSchema = z.object({
  name: text(240).min(1),
  handle: text(240).min(1),
  platform,
  avatar: text(2048).optional(),
  description: text(4000).optional(),
  followers: z.number().int().min(0).optional(),
  posts_7d: z.number().int().min(0).optional(),
  avg_views: z.number().int().min(0).optional(),
  avg_engagement: z.number().min(0).optional(),
  outlier_index: z.number().min(0).optional(),
  recent_topics: tags.optional(),
  monitored: z.boolean().optional(),
  trend: z.array(z.object({ date: text(40), views: z.number().min(0), baseline: z.number().min(0) }).strict()).max(100).optional(),
  hooks: z.array(z.object({ label: text(80), value: z.number().min(0).max(100) }).strict()).max(30).optional(),
  insights: z.array(text(1000)).max(30).optional(),
}).strict();

export const competitorUpdateSchema = competitorCreateSchema.partial().strict();

export const ideaCreateSchema = z.object({
  title: text(240).min(1),
  angle: text(4000).optional(),
  priority,
  platforms: z.array(platform).min(1).max(8),
  status: ideaStatus.optional(),
  tags: tags.optional(),
  score: z.number().min(0).max(100).optional(),
  core: text(4000).optional(),
  audience: text(1000).optional(),
  cta: text(1000).optional(),
  title_variants: z.array(text(240)).max(20).optional(),
  outline: text(20000).optional(),
  hook: text(10000).optional(),
  script: text(30000).optional(),
  materials: text(4000).optional(),
  strategy: text(4000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const ideaUpdateSchema = ideaCreateSchema.partial().strict();

export const moveIdeaSchema = z.object({
  status: ideaStatus,
  before_id: z.string().uuid().nullable().optional(),
}).strict();

export const contentCreateSchema = z.object({
  title: text(240).min(1),
  platform,
  status: contentStatus.optional(),
  scheduled_at: z.string().datetime({ offset: true }).nullable().optional(),
  idea_id: z.string().uuid().nullable().optional(),
  assignee: text(240).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const contentUpdateSchema = contentCreateSchema.partial().strict();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: text(200).optional(),
  platform: platform.optional(),
  status: listStatus.optional(),
  source: text(80).optional(),
  captureMethod: captureMethod.optional(),
  sort: z.enum(["captured_at_desc", "captured_at_asc", "score_desc", "score_asc", "updated_at_desc"]).default("captured_at_desc"),
}).strict();

export const idSchema = z.string().uuid("ID 格式不正确。");
export const emptyBodySchema = z.object({}).strict();
export type InboxCreateInput = z.infer<typeof inboxCreateSchema>;
export type InboxUpdateInput = z.infer<typeof inboxUpdateSchema>;
export type IntelligenceCreateInput = z.infer<typeof intelligenceCreateSchema>;
export type IntelligenceUpdateInput = z.infer<typeof intelligenceUpdateSchema>;
export type CompetitorCreateInput = z.infer<typeof competitorCreateSchema>;
export type CompetitorUpdateInput = z.infer<typeof competitorUpdateSchema>;
export type IdeaCreateInput = z.infer<typeof ideaCreateSchema>;
export type IdeaUpdateInput = z.infer<typeof ideaUpdateSchema>;
export type ContentCreateInput = z.infer<typeof contentCreateSchema>;
export type ContentUpdateInput = z.infer<typeof contentUpdateSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
