import type {
  Analysis,
  Competitor,
  CompetitorContent,
  ContentItem,
  Idea,
  InboxItem,
  IntelligenceItem,
  Profile,
  SourceRef,
  Workspace,
} from "../../types";
import type { Database, Json } from "../../types/database.types";

type InboxRow = Database["public"]["Tables"]["inbox_items"]["Row"];
type IntelligenceRow = Database["public"]["Tables"]["intelligence_items"]["Row"];
type CompetitorRow = Database["public"]["Tables"]["competitors"]["Row"];
type CompetitorContentRow = Database["public"]["Tables"]["competitor_contents"]["Row"];
type IdeaRow = Database["public"]["Tables"]["ideas"]["Row"];
type SourceRow = Database["public"]["Tables"]["idea_sources"]["Row"];
type ContentRow = Database["public"]["Tables"]["content_items"]["Row"];

function record(value: Json | null | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function analysis(value: Json | null): Analysis | undefined {
  const item = record(value);
  if (typeof item.summary !== "string") return undefined;
  return {
    summary: item.summary,
    core: typeof item.core === "string" ? item.core : "",
    reasons: Array.isArray(item.reasons) ? item.reasons.filter((x): x is string => typeof x === "string") : [],
    angles: Array.isArray(item.angles) ? item.angles.filter((x): x is string => typeof x === "string") : [],
  };
}

function metrics(value: Json) {
  const item = record(value);
  return {
    views: typeof item.views === "number" ? item.views : 0,
    likes: typeof item.likes === "number" ? item.likes : 0,
  };
}

export function mapInbox(row: InboxRow): InboxItem {
  return {
    id: row.id, title: row.title, summary: row.summary, originalContent: row.original_content,
    note: row.note, url: row.url, platform: row.platform as InboxItem["platform"],
    sourceType: row.source_type, captureMethod: row.capture_method as InboxItem["captureMethod"],
    author: row.author, thumbnail: row.thumbnail, aiScore: row.ai_score, status: row.status as InboxItem["status"],
    tags: row.tags, capturedAt: row.captured_at, updatedAt: row.updated_at, metrics: metrics(row.metrics), analysis: analysis(row.analysis),
    mode: row.mode as InboxItem["mode"],
  };
}

export function mapIntelligence(row: IntelligenceRow): IntelligenceItem {
  return {
    id: row.id, title: row.title, summary: row.summary, originalContent: row.original_content,
    note: row.note, url: row.url, platform: row.platform as IntelligenceItem["platform"],
    sourceType: row.source_type, captureMethod: row.capture_method as IntelligenceItem["captureMethod"],
    author: row.author, thumbnail: row.thumbnail, aiScore: row.ai_score, status: row.status as IntelligenceItem["status"],
    tags: row.tags, capturedAt: row.captured_at, updatedAt: row.updated_at, metrics: metrics(row.metrics), analysis: analysis(row.analysis),
  };
}

function mapCompetitorContent(row: CompetitorContentRow): CompetitorContent {
  return {
    id: row.id, competitorId: row.competitor_id, title: row.title, thumbnail: row.thumbnail,
    views: row.views, likes: row.likes, outlier: row.outlier_index, publishedAt: row.published_at,
  };
}

function jsonArray<T>(value: Json, mapper: (item: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    .map((item) => mapper(item as Record<string, unknown>));
}

export function mapCompetitor(row: CompetitorRow, contentRows: CompetitorContentRow[] = []): Competitor {
  return {
    id: row.id, name: row.name, handle: row.handle, platform: row.platform as Competitor["platform"],
    avatar: row.avatar, description: row.description, followers: row.followers, posts7d: row.posts_7d,
    avgViews: row.avg_views, avgEngagement: row.avg_engagement, outlierIndex: row.outlier_index,
    recentTopics: row.recent_topics, updatedAt: row.updated_at, monitored: row.monitored,
    recentContent: contentRows.filter((item) => item.competitor_id === row.id).map((item) => ({
      id: item.id, title: item.title, thumbnail: item.thumbnail, views: item.views,
      likes: item.likes, outlier: item.outlier_index,
    })),
    trend: jsonArray(row.trend, (item) => ({
      date: typeof item.date === "string" ? item.date : "",
      views: typeof item.views === "number" ? item.views : 0,
      baseline: typeof item.baseline === "number" ? item.baseline : 0,
    })),
    hooks: jsonArray(row.hooks, (item) => ({
      label: typeof item.label === "string" ? item.label : "",
      value: typeof item.value === "number" ? item.value : 0,
    })),
    insights: row.insights,
  };
}

export function mapIdea(row: IdeaRow, sources: SourceRow[] = []): Idea {
  return {
    id: row.id, title: row.title, angle: row.angle, priority: row.priority as Idea["priority"],
    platforms: row.platforms as Idea["platforms"], status: row.status as Idea["status"], tags: row.tags,
    sourceIds: sources.filter((source) => source.idea_id === row.id).map((source): SourceRef => ({
      kind: source.source_kind as SourceRef["kind"], id: source.source_id,
    })),
    score: row.score, core: row.core, audience: row.audience, cta: row.cta, titles: row.title_variants,
    outline: row.outline, hook: row.hook, script: row.script, materials: row.materials, strategy: row.strategy,
    metadata: record(row.metadata), sortOrder: row.sort_order,
  };
}

export function mapContent(row: ContentRow): ContentItem {
  return {
    id: row.id, title: row.title, platform: row.platform as ContentItem["platform"],
    status: row.status, scheduledAt: row.scheduled_at ?? undefined, ideaId: row.idea_id ?? undefined,
    assignee: row.assignee,
  };
}

export function mapWorkspace(row: Database["public"]["Tables"]["workspaces"]["Row"]): Workspace {
  return { id: row.id, name: row.name, slug: row.slug, ownerId: row.owner_id };
}

export function mapProfile(row: Database["public"]["Tables"]["profiles"]["Row"]): Profile {
  return { id: row.id, displayName: row.display_name, avatarUrl: row.avatar_url };
}

export { mapCompetitorContent };
