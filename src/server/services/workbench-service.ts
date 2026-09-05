import type { AuthContext } from "../auth/context";
import { AppError, mapDatabaseError } from "../http/errors";
import {
  getBootstrapRows,
  getById,
  insertRow,
  updateRow,
  deleteRow,
} from "../repositories/workbench-repository";
import {
  mapCompetitor,
  mapContent,
  mapIdea,
  mapInbox,
  mapIntelligence,
  mapProfile,
  mapWorkspace,
} from "../mappers/workbench-mappers";
import type { Json } from "../../types/database.types";
import type { WorkbenchState } from "../../types";
import type {
  CompetitorCreateInput,
  CompetitorUpdateInput,
  ContentCreateInput,
  ContentUpdateInput,
  IdeaCreateInput,
  IdeaUpdateInput,
  InboxCreateInput,
  InboxUpdateInput,
  IntelligenceCreateInput,
  IntelligenceUpdateInput,
  ListQuery,
} from "../validation/schemas";

type SourceKind = "inbox" | "intelligence";

export async function bootstrap(context: AuthContext): Promise<WorkbenchState> {
  const rows = await getBootstrapRows(context.client, context.workspace.id);
  return {
    workspace: mapWorkspace(rows.workspace),
    profile: rows.profile ? mapProfile(rows.profile) : undefined,
    inbox: rows.inbox.map(mapInbox),
    intelligence: rows.intelligence.map(mapIntelligence),
    competitors: rows.competitors.map((row) => mapCompetitor(row, rows.competitorContents)),
    ideas: rows.ideas.map((row) => mapIdea(row, rows.sources)),
    content: rows.content.map(mapContent),
  };
}

function pageResult<T>(items: T[], query: ListQuery) {
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / query.pageSize);
  const start = (query.page - 1) * query.pageSize;
  return {
    items: items.slice(start, start + query.pageSize),
    pagination: { page: query.page, pageSize: query.pageSize, total, totalPages },
  };
}

function matchesText(value: string, search?: string) {
  return !search || value.toLocaleLowerCase().includes(search.toLocaleLowerCase());
}

export async function listInbox(context: AuthContext, query: ListQuery) {
  const result = await context.client.from("inbox_items").select("*").eq("workspace_id", context.workspace.id);
  if (result.error) throw mapDatabaseError(result.error);
  let items = (result.data ?? []).map(mapInbox).filter((item) =>
    matchesText([item.title, item.summary, item.originalContent, item.note, item.author, item.url, ...item.tags].join(" "), query.search)
    && (!query.platform || item.platform === query.platform)
    && (!query.status || item.status === query.status)
    && (!query.source || item.sourceType === query.source)
    && (!query.captureMethod || item.captureMethod === query.captureMethod),
  );
  items = sortItems(items, query);
  return pageResult(items, query);
}

export async function listIntelligence(context: AuthContext, query: ListQuery) {
  const result = await context.client.from("intelligence_items").select("*").eq("workspace_id", context.workspace.id);
  if (result.error) throw mapDatabaseError(result.error);
  let items = (result.data ?? []).map(mapIntelligence).filter((item) =>
    matchesText([item.title, item.summary, item.originalContent, item.note, item.author, item.url, ...item.tags].join(" "), query.search)
    && (!query.platform || item.platform === query.platform)
    && (!query.status || item.status === query.status)
    && (!query.source || item.sourceType === query.source)
    && (!query.captureMethod || item.captureMethod === query.captureMethod),
  );
  items = sortItems(items, query);
  return pageResult(items, query);
}

function sortItems<T extends { capturedAt: string; aiScore: number | null }>(items: T[], query: ListQuery) {
  return [...items].sort((a, b) => {
    if (query.sort === "captured_at_asc") return a.capturedAt.localeCompare(b.capturedAt);
    if (query.sort === "score_desc") return (b.aiScore ?? -1) - (a.aiScore ?? -1);
    if (query.sort === "score_asc") return (a.aiScore ?? 101) - (b.aiScore ?? 101);
    return b.capturedAt.localeCompare(a.capturedAt);
  });
}

export async function createInbox(context: AuthContext, input: InboxCreateInput) {
  const row = await insertRow(context.client, "inbox_items", {
    workspace_id: context.workspace.id,
    title: input.title,
    summary: input.summary ?? "",
    original_content: input.original_content ?? "",
    note: input.note ?? "",
    url: input.url ?? "",
    platform: input.platform,
    source_type: input.source_type ?? "手动发现",
    capture_method: input.capture_method,
    author: input.author ?? "我",
    thumbnail: input.thumbnail ?? "#e5ebf4",
    ai_score: input.ai_score ?? null,
    status: input.status ?? "待处理",
    tags: input.tags ?? [],
    captured_at: input.captured_at ?? new Date().toISOString(),
    metrics: (input.metrics ?? { views: 0, likes: 0 }) as Json,
    mode: input.mode,
  });
  return mapInbox(row);
}

export async function getInbox(context: AuthContext, id: string) {
  const row = await getById(context.client, "inbox_items", id, context.workspace.id);
  if (!row) throw new AppError("NOT_FOUND", "记录不存在。");
  return mapInbox(row);
}

export async function updateInbox(context: AuthContext, id: string, input: InboxUpdateInput) {
  const row = await updateRow(context.client, "inbox_items", id, context.workspace.id, toInboxRow(input));
  return mapInbox(row);
}

export async function deleteInbox(context: AuthContext, id: string) {
  await deleteRow(context.client, "inbox_items", id, context.workspace.id);
}

export async function analyzeSource(context: AuthContext, kind: SourceKind, id: string) {
  const table = kind === "inbox" ? "inbox_items" : "intelligence_items";
  const source = await getById(context.client, table, id, context.workspace.id);
  if (!source) throw new AppError("NOT_FOUND", "待分析记录不存在。");
  const result = {
    summary: "已基于「" + source.title + "」生成模拟分析：提炼主题、受众和可执行的内容切入点。",
    core: "把观察到的现象转化为可复用的方法与真实案例。",
    reasons: ["主题与目标受众相关", "具备清晰的实践场景", "适合拆分为系列内容"],
    angles: ["从真实过程复盘", "从结果对比切入", "从常见误区反转"],
  };
  const score = source.ai_score ?? 88;
  const update = await updateRow(context.client, table, id, context.workspace.id, {
    ai_score: score,
    status: source.status === "待处理" || source.status === "待分析" ? "高潜" : source.status,
    analysis: result as unknown as Json,
    summary: result.summary,
  } as never);
  const audit = await context.client.from("ai_analyses").insert({
    workspace_id: context.workspace.id,
    source_kind: kind,
    source_id: id,
    model: "mock-v1",
    score,
    result: result as unknown as Json,
    created_by: context.user.id,
  });
  if (audit.error) throw mapDatabaseError(audit.error);
  return kind === "inbox" ? mapInbox(update as never) : mapIntelligence(update as never);
}

export async function convertSource(context: AuthContext, kind: SourceKind, id: string) {
  const result = await context.client.rpc("convert_source_to_idea", { p_source_kind: kind, p_source_id: id });
  if (result.error) throw mapDatabaseError(result.error);
  const converted = result.data?.[0];
  if (!converted) throw new AppError("INTERNAL_ERROR", "转换结果为空。");
  const idea = await getById(context.client, "ideas", converted.idea_id, context.workspace.id);
  if (!idea) throw new AppError("NOT_FOUND", "选题不存在。");
  const sources = await context.client.from("idea_sources").select("*").eq("workspace_id", context.workspace.id).eq("idea_id", converted.idea_id);
  if (sources.error) throw mapDatabaseError(sources.error);
  return { idea: mapIdea(idea, sources.data ?? []), created: converted.created };
}

export async function createIntelligence(context: AuthContext, input: IntelligenceCreateInput) {
  const row = await insertRow(context.client, "intelligence_items", {
    workspace_id: context.workspace.id,
    title: input.title,
    summary: input.summary ?? "",
    original_content: input.original_content ?? "",
    note: input.note ?? "",
    url: input.url ?? "",
    platform: input.platform,
    source_type: input.source_type ?? "公开内容",
    capture_method: input.capture_method,
    author: input.author ?? "",
    thumbnail: input.thumbnail ?? "#e5ebf4",
    ai_score: input.ai_score ?? null,
    status: input.status ?? "待分析",
    tags: input.tags ?? [],
    captured_at: input.captured_at ?? new Date().toISOString(),
    metrics: (input.metrics ?? { views: 0, likes: 0 }) as Json,
  });
  return mapIntelligence(row);
}

export async function getIntelligence(context: AuthContext, id: string) {
  const row = await getById(context.client, "intelligence_items", id, context.workspace.id);
  if (!row) throw new AppError("NOT_FOUND", "记录不存在。");
  return mapIntelligence(row);
}

export async function updateIntelligence(context: AuthContext, id: string, input: IntelligenceUpdateInput) {
  const row = await updateRow(context.client, "intelligence_items", id, context.workspace.id, toIntelligenceRow(input));
  return mapIntelligence(row);
}

export async function deleteIntelligence(context: AuthContext, id: string) {
  await deleteRow(context.client, "intelligence_items", id, context.workspace.id);
}

export async function listCompetitors(context: AuthContext, query: ListQuery) {
  const [competitors, contents] = await Promise.all([
    context.client.from("competitors").select("*").eq("workspace_id", context.workspace.id).order("updated_at", { ascending: false }),
    context.client.from("competitor_contents").select("*").eq("workspace_id", context.workspace.id).order("published_at", { ascending: false }),
  ]);
  if (competitors.error) throw mapDatabaseError(competitors.error);
  if (contents.error) throw mapDatabaseError(contents.error);
  const items = (competitors.data ?? []).map((item) => mapCompetitor(item, contents.data ?? [])).filter((item) =>
    matchesText([item.name, item.handle, item.description, ...item.recentTopics].join(" "), query.search)
    && (!query.platform || item.platform === query.platform)
    && (!query.status || (query.status === "监控中" ? item.monitored : query.status === "已暂停" ? !item.monitored : true)),
  );
  return pageResult(items, query);
}

export async function createCompetitor(context: AuthContext, input: CompetitorCreateInput) {
  const row = await insertRow(context.client, "competitors", {
    workspace_id: context.workspace.id,
    name: input.name,
    handle: input.handle,
    platform: input.platform,
    avatar: input.avatar ?? input.name.slice(0, 1),
    description: input.description ?? "",
    followers: input.followers ?? 0,
    posts_7d: input.posts_7d ?? 0,
    avg_views: input.avg_views ?? 0,
    avg_engagement: input.avg_engagement ?? 0,
    outlier_index: input.outlier_index ?? 1,
    recent_topics: input.recent_topics ?? [],
    monitored: input.monitored ?? true,
    trend: (input.trend ?? []) as unknown as Json,
    hooks: (input.hooks ?? []) as unknown as Json,
    insights: input.insights ?? [],
  });
  return mapCompetitor(row);
}

export async function getCompetitor(context: AuthContext, id: string) {
  const row = await getById(context.client, "competitors", id, context.workspace.id);
  if (!row) throw new AppError("NOT_FOUND", "账号不存在。");
  const contents = await context.client.from("competitor_contents").select("*").eq("workspace_id", context.workspace.id).eq("competitor_id", id).order("published_at", { ascending: false });
  if (contents.error) throw mapDatabaseError(contents.error);
  return mapCompetitor(row, contents.data ?? []);
}

export async function updateCompetitor(context: AuthContext, id: string, input: CompetitorUpdateInput) {
  const row = await updateRow(context.client, "competitors", id, context.workspace.id, input as never);
  return mapCompetitor(row);
}

export async function deleteCompetitor(context: AuthContext, id: string) {
  await deleteRow(context.client, "competitors", id, context.workspace.id);
}

export async function getIdeas(context: AuthContext) {
  const [ideas, sources] = await Promise.all([
    context.client.from("ideas").select("*").eq("workspace_id", context.workspace.id).order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
    context.client.from("idea_sources").select("*").eq("workspace_id", context.workspace.id),
  ]);
  if (ideas.error) throw mapDatabaseError(ideas.error);
  if (sources.error) throw mapDatabaseError(sources.error);
  return (ideas.data ?? []).map((item) => mapIdea(item, sources.data ?? []));
}

export async function listIdeas(context: AuthContext, query: ListQuery) {
  const items = (await getIdeas(context)).filter((item) =>
    matchesText([item.title, item.angle, item.core, item.audience, ...item.tags].join(" "), query.search)
    && (!query.platform || item.platforms.includes(query.platform))
    && (!query.status || item.status === query.status)
  );
  return pageResult(items, query);
}

export async function createIdea(context: AuthContext, input: IdeaCreateInput) {
  const row = await insertRow(context.client, "ideas", {
    workspace_id: context.workspace.id,
    title: input.title,
    angle: input.angle ?? "",
    priority: input.priority,
    platforms: input.platforms,
    status: input.status ?? "待筛选",
    tags: input.tags ?? [],
    score: input.score ?? 0,
    core: input.core ?? "",
    audience: input.audience ?? "",
    cta: input.cta ?? "",
    title_variants: input.title_variants ?? [input.title],
    outline: input.outline ?? "",
    hook: input.hook ?? "",
    script: input.script ?? "",
    materials: input.materials ?? "",
    strategy: input.strategy ?? "",
    metadata: (input.metadata ?? {}) as Json,
    sort_order: await nextIdeaOrder(context),
  });
  return mapIdea(row);
}

export async function getIdea(context: AuthContext, id: string) {
  const row = await getById(context.client, "ideas", id, context.workspace.id);
  if (!row) throw new AppError("NOT_FOUND", "选题不存在。");
  const sources = await context.client.from("idea_sources").select("*").eq("workspace_id", context.workspace.id).eq("idea_id", id);
  if (sources.error) throw mapDatabaseError(sources.error);
  return mapIdea(row, sources.data ?? []);
}

async function nextIdeaOrder(context: AuthContext) {
  const result = await context.client.from("ideas").select("sort_order").eq("workspace_id", context.workspace.id).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw mapDatabaseError(result.error);
  return (result.data?.sort_order ?? -1) + 1;
}

export async function updateIdea(context: AuthContext, id: string, input: IdeaUpdateInput) {
  const row = await updateRow(context.client, "ideas", id, context.workspace.id, {
    ...input,
    metadata: input.metadata as Json | undefined,
  } as never);
  const sources = await context.client.from("idea_sources").select("*").eq("workspace_id", context.workspace.id).eq("idea_id", id);
  if (sources.error) throw mapDatabaseError(sources.error);
  return mapIdea(row, sources.data ?? []);
}

export async function moveIdea(context: AuthContext, id: string, status: string, beforeId?: string | null) {
  const result = await context.client.rpc("move_idea", beforeId ? { p_idea_id: id, p_status: status, p_before_id: beforeId } : { p_idea_id: id, p_status: status });
  if (result.error) throw mapDatabaseError(result.error);
  const ideas = await getIdeas(context);
  const moved = ideas.find((idea) => idea.id === id);
  if (!moved) throw new AppError("NOT_FOUND", "选题不存在。");
  return moved;
}

export async function deleteIdea(context: AuthContext, id: string) {
  await deleteRow(context.client, "ideas", id, context.workspace.id);
}

export async function getContentItems(context: AuthContext) {
  const result = await context.client.from("content_items").select("*").eq("workspace_id", context.workspace.id).order("scheduled_at", { ascending: true, nullsFirst: false });
  if (result.error) throw mapDatabaseError(result.error);
  return (result.data ?? []).map(mapContent);
}

export async function listContent(context: AuthContext, query: ListQuery) {
  const items = (await getContentItems(context)).filter((item) =>
    matchesText([item.title, item.assignee, item.platform, item.status].join(" "), query.search)
    && (!query.platform || item.platform === query.platform)
    && (!query.status || item.status === query.status)
  );
  return pageResult(items, query);
}

export async function createContent(context: AuthContext, input: ContentCreateInput) {
  if (input.idea_id) {
    const result = await context.client.rpc("schedule_content", {
      p_title: input.title,
      p_platform: input.platform,
      p_scheduled_at: input.scheduled_at ?? new Date().toISOString(),
      p_assignee: input.assignee ?? "创作者",
      p_idea_id: input.idea_id,
    });
    if (result.error) throw mapDatabaseError(result.error);
    const row = await getById(context.client, "content_items", result.data?.[0]?.content_id ?? "", context.workspace.id);
    if (!row) throw new AppError("INTERNAL_ERROR", "排期结果为空。");
    return mapContent(row);
  }
  const row = await insertRow(context.client, "content_items", {
    workspace_id: context.workspace.id,
    title: input.title,
    platform: input.platform,
    status: input.status ?? "待制作",
    scheduled_at: input.scheduled_at ?? null,
    assignee: input.assignee ?? "创作者",
    metadata: (input.metadata ?? {}) as Json,
  });
  return mapContent(row);
}

export async function getContent(context: AuthContext, id: string) {
  const row = await getById(context.client, "content_items", id, context.workspace.id);
  if (!row) throw new AppError("NOT_FOUND", "内容排期不存在。");
  return mapContent(row);
}

export async function updateContent(context: AuthContext, id: string, input: ContentUpdateInput) {
  const row = await updateRow(context.client, "content_items", id, context.workspace.id, { ...input, metadata: input.metadata as Json | undefined } as never);
  return mapContent(row);
}

export async function deleteContent(context: AuthContext, id: string) {
  await deleteRow(context.client, "content_items", id, context.workspace.id);
}

function toInboxRow(input: InboxUpdateInput) {
  return { ...input, metrics: input.metrics as Json | undefined };
}

function toIntelligenceRow(input: IntelligenceUpdateInput) {
  return { ...input, metrics: input.metrics as Json | undefined };
}
