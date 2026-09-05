"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type Dispatch, type ReactNode } from "react";
import { apiRequest, type ApiClientError } from "../lib/api-client";
import { emptyState, reducer, type Action } from "../lib/reducer";
import { toast } from "../components/ui/sonner";
import { ensureAnonymousSession } from "../lib/supabase/client";
import type { Competitor, ContentItem, Idea, InboxItem, IntelligenceItem, SourceRef, WorkbenchState } from "../types";
import type {
  CompetitorCreateInput, CompetitorUpdateInput, ContentCreateInput, ContentUpdateInput,
  IdeaCreateInput, IdeaUpdateInput, InboxCreateInput, InboxUpdateInput,
  IntelligenceCreateInput, IntelligenceUpdateInput,
} from "../server/validation/schemas";

type ActionResult<T> = Promise<T | undefined>;

export interface WorkbenchActions {
  addInbox(input: InboxItem | InboxCreateInput): ActionResult<InboxItem>;
  updateInbox(id: string, patch: InboxUpdateInput | Partial<InboxItem>): ActionResult<InboxItem>;
  analyzeInbox(id: string): ActionResult<InboxItem>;
  convertInboxToIdea(source: SourceRef): ActionResult<unknown>;
  addIntelligence(input: IntelligenceItem | IntelligenceCreateInput): ActionResult<IntelligenceItem>;
  updateIntelligence(id: string, patch: IntelligenceUpdateInput | Partial<IntelligenceItem>): ActionResult<IntelligenceItem>;
  analyzeIntelligence(id: string): ActionResult<IntelligenceItem>;
  convertIntelligenceToIdea(source: SourceRef): ActionResult<unknown>;
  addCompetitor(input: Competitor | CompetitorCreateInput): ActionResult<Competitor>;
  updateCompetitor(id: string, patch: CompetitorUpdateInput | Partial<Competitor>): ActionResult<Competitor>;
  addIdea(input: Idea | IdeaCreateInput): ActionResult<Idea>;
  updateIdea(id: string, patch: IdeaUpdateInput | Partial<Idea>): ActionResult<Idea>;
  moveIdea(id: string, status: Idea["status"], beforeId?: string): ActionResult<Idea>;
  addContent(input: ContentItem | ContentCreateInput): ActionResult<ContentItem>;
  updateContent(id: string, patch: ContentUpdateInput | Partial<ContentItem>): ActionResult<ContentItem>;
}

interface WorkbenchContextValue {
  state: WorkbenchState;
  loading: boolean;
  error: string | null;
  pending: Record<string, boolean>;
  refresh: () => Promise<void>;
  actions: WorkbenchActions;
  dispatch: Dispatch<Action>;
}

const Context = createContext<WorkbenchContextValue | null>(null);

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [state, reduceDispatch] = useReducer(reducer, emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const markPending = useCallback((key: string, value: boolean) => {
    setPending((current) => ({ ...current, [key]: value }));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureAnonymousSession();
      const nextState = await apiRequest<WorkbenchState>("/api/v1/bootstrap");
      reduceDispatch({ type: "hydrate", state: nextState });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  const execute = useCallback(async <T,>(key: string, operation: () => Promise<T>, rollback?: () => void) => {
    if (pending[key]) return undefined;
    markPending(key, true);
    try {
      setError(null);
      return await operation();
    } catch (requestError) {
      rollback?.();
      const message = getErrorMessage(requestError);
      setError(message);
      toast.error("操作未完成", message);
      return undefined;
    } finally {
      markPending(key, false);
    }
  }, [markPending, pending]);

  const actions = useMemo<WorkbenchActions>(() => {
    const post = <T,>(path: string, body: unknown) => apiRequest<T>(path, { method: "POST", body: JSON.stringify(body) });
    const patch = <T,>(path: string, body: unknown) => apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) });
    return {
      addInbox: (input) => execute("addInbox", async () => {
        const item = await post<InboxItem>("/api/v1/inbox", serializeInbox(input));
        reduceDispatch({ type: "addInbox", item });
        return item;
      }),
      updateInbox: (id, input) => execute("updateInbox:" + id, async () => {
        const item = await patch<InboxItem>("/api/v1/inbox/" + id, serializeInboxPatch(input));
        reduceDispatch({ type: "updateInbox", id, patch: item });
        return item;
      }),
      analyzeInbox: (id) => execute("analyzeInbox:" + id, async () => {
        const item = await post<InboxItem>("/api/v1/inbox/" + id + "/analyze", {});
        reduceDispatch({ type: "updateInbox", id, patch: item });
        return item;
      }),
      convertInboxToIdea: (source) => execute("convertInbox:" + source.id, async () => {
        const result = await post<unknown>("/api/v1/inbox/" + source.id + "/convert", {});
        await refresh();
        return result;
      }),
      addIntelligence: (input) => execute("addIntelligence", async () => {
        const item = await post<IntelligenceItem>("/api/v1/intelligence", serializeIntelligence(input));
        reduceDispatch({ type: "addIntelligence", item });
        return item;
      }),
      updateIntelligence: (id, input) => execute("updateIntelligence:" + id, async () => {
        const item = await patch<IntelligenceItem>("/api/v1/intelligence/" + id, serializeIntelligencePatch(input));
        reduceDispatch({ type: "updateIntelligence", id, patch: item });
        return item;
      }),
      analyzeIntelligence: (id) => execute("analyzeIntelligence:" + id, async () => {
        const item = await post<IntelligenceItem>("/api/v1/intelligence/" + id + "/analyze", {});
        reduceDispatch({ type: "updateIntelligence", id, patch: item });
        return item;
      }),
      convertIntelligenceToIdea: (source) => execute("convertIntelligence:" + source.id, async () => {
        const result = await post<unknown>("/api/v1/intelligence/" + source.id + "/convert", {});
        await refresh();
        return result;
      }),
      addCompetitor: (input) => execute("addCompetitor", async () => {
        const item = await post<Competitor>("/api/v1/competitors", serializeCompetitor(input));
        reduceDispatch({ type: "addCompetitor", item });
        return item;
      }),
      updateCompetitor: (id, input) => {
        const snapshot = state.competitors.find((item) => item.id === id);
        const optimisticPatch = normalizeCompetitorPatch(input);
        reduceDispatch({ type: "updateCompetitor", id, patch: optimisticPatch as Partial<Competitor> });
        return execute("updateCompetitor:" + id, async () => {
          const item = await patch<Competitor>("/api/v1/competitors/" + id, optimisticPatch);
          reduceDispatch({ type: "updateCompetitor", id, patch: item });
          return item;
        }, () => snapshot && reduceDispatch({ type: "updateCompetitor", id, patch: snapshot }));
      },
      addIdea: (input) => execute("addIdea", async () => {
        const item = await post<Idea>("/api/v1/ideas", serializeIdea(input));
        reduceDispatch({ type: "addIdea", item });
        return item;
      }),
      updateIdea: (id, input) => execute("updateIdea:" + id, async () => {
        const item = await patch<Idea>("/api/v1/ideas/" + id, serializeIdeaPatch(input));
        reduceDispatch({ type: "updateIdea", id, patch: item });
        return item;
      }),
      moveIdea: (id, status, beforeId) => {
        const snapshot = state;
        reduceDispatch({ type: "moveIdea", id, status, beforeId });
        return execute("moveIdea:" + id, async () => {
          const item = await post<Idea>("/api/v1/ideas/" + id + "/move", { status, before_id: beforeId ?? null });
          await refresh();
          return item;
        }, () => reduceDispatch({ type: "rollback", state: snapshot }));
      },
      addContent: (input) => execute("addContent", async () => {
        const item = await post<ContentItem>("/api/v1/content", serializeContent(input));
        if (isDomainContent(input) && input.ideaId) await refresh();
        else reduceDispatch({ type: "addContent", item });
        return item;
      }),
      updateContent: (id, input) => execute("updateContent:" + id, async () => {
        const item = await patch<ContentItem>("/api/v1/content/" + id, serializeContentPatch(input));
        reduceDispatch({ type: "updateContent", id, patch: item });
        return item;
      }),
    };
  }, [execute, refresh, state]);

  const dispatch = useCallback((action: Action) => {
    switch (action.type) {
      case "addInbox": void actions.addInbox(action.item); break;
      case "addIntelligence": void actions.addIntelligence(action.item); break;
      case "status": void Promise.all(action.ids.map((id) => action.kind === "inbox" ? actions.updateInbox(id, { status: action.status }) : actions.updateIntelligence(id, { status: action.status }))); break;
      case "analyze": void actions.analyzeInbox(action.id); break;
      case "convert": void (action.source.kind === "inbox" ? actions.convertInboxToIdea(action.source) : actions.convertIntelligenceToIdea(action.source)); break;
      case "addCompetitor": void actions.addCompetitor(action.item); break;
      case "monitor": {
        const competitor = state.competitors.find((item) => item.id === action.id);
        if (competitor) void actions.updateCompetitor(action.id, { monitored: !competitor.monitored });
        break;
      }
      case "addIdea": void actions.addIdea(action.item); break;
      case "editIdea": void actions.updateIdea(action.id, action.patch); break;
      case "moveIdea": void actions.moveIdea(action.id, action.status, action.beforeId); break;
      case "addContent": void actions.addContent(action.item); break;
      case "updateInbox": void actions.updateInbox(action.id, action.patch); break;
      case "updateIntelligence": void actions.updateIntelligence(action.id, action.patch); break;
      case "updateCompetitor": void actions.updateCompetitor(action.id, action.patch); break;
      case "updateIdea": void actions.updateIdea(action.id, action.patch); break;
      case "updateContent": void actions.updateContent(action.id, action.patch); break;
      case "hydrate":
      case "reconcile":
      case "rollback": reduceDispatch(action); break;
    }
  }, [actions, reduceDispatch, state.competitors]);

  useEffect(() => {
    const task = Promise.resolve().then(() => refresh());
    return () => { void task; };
  }, [refresh]);
  const value = useMemo(() => ({ state, loading, error, pending, refresh, actions, dispatch }), [actions, dispatch, error, loading, pending, refresh, state]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useWorkbench() {
  const value = useContext(Context);
  if (!value) throw new Error("WorkbenchProvider missing");
  return value;
}

function getErrorMessage(error: unknown) {
  const clientError = error as Partial<ApiClientError>;
  return typeof clientError.message === "string" ? clientError.message : "数据服务暂时不可用。";
}

function isDomainInbox(value: InboxItem | InboxCreateInput): value is InboxItem { return "id" in value; }
function isDomainIntelligence(value: IntelligenceItem | IntelligenceCreateInput): value is IntelligenceItem { return "id" in value; }
function isDomainCompetitor(value: Competitor | CompetitorCreateInput): value is Competitor { return "id" in value; }
function isDomainIdea(value: Idea | IdeaCreateInput): value is Idea { return "id" in value; }
function isDomainContent(value: ContentItem | ContentCreateInput): value is ContentItem { return "id" in value; }

function serializeInbox(input: InboxItem | InboxCreateInput): InboxCreateInput {
  if (!isDomainInbox(input)) return input;
  return { title: input.title, summary: input.summary, original_content: input.originalContent, note: input.note, url: input.url, platform: input.platform, source_type: input.sourceType, capture_method: input.captureMethod, author: input.author, thumbnail: input.thumbnail, ai_score: input.aiScore, status: input.status, tags: input.tags, captured_at: input.capturedAt, metrics: input.metrics, mode: input.mode };
}

function serializeInboxPatch(input: InboxUpdateInput | Partial<InboxItem>) {
  const item = input as Partial<InboxItem> & InboxUpdateInput;
  return {
    ...(item.title === undefined ? {} : { title: item.title }),
    ...(item.summary === undefined ? {} : { summary: item.summary }),
    ...(item.originalContent === undefined ? {} : { original_content: item.originalContent }),
    ...(item.original_content === undefined ? {} : { original_content: item.original_content }),
    ...(item.note === undefined ? {} : { note: item.note }),
    ...(item.url === undefined ? {} : { url: item.url }),
    ...(item.platform === undefined ? {} : { platform: item.platform }),
    ...(item.sourceType === undefined ? {} : { source_type: item.sourceType }),
    ...(item.source_type === undefined ? {} : { source_type: item.source_type }),
    ...(item.captureMethod === undefined ? {} : { capture_method: item.captureMethod }),
    ...(item.capture_method === undefined ? {} : { capture_method: item.capture_method }),
    ...(item.author === undefined ? {} : { author: item.author }),
    ...(item.thumbnail === undefined ? {} : { thumbnail: item.thumbnail }),
    ...(item.aiScore === undefined ? {} : { ai_score: item.aiScore }),
    ...(item.ai_score === undefined ? {} : { ai_score: item.ai_score }),
    ...(item.status === undefined ? {} : { status: item.status }),
    ...(item.tags === undefined ? {} : { tags: item.tags }),
    ...(item.capturedAt === undefined ? {} : { captured_at: item.capturedAt }),
    ...(item.captured_at === undefined ? {} : { captured_at: item.captured_at }),
    ...(item.metrics === undefined ? {} : { metrics: item.metrics }),
    ...(item.mode === undefined ? {} : { mode: item.mode }),
  };
}

function serializeIntelligence(input: IntelligenceItem | IntelligenceCreateInput): IntelligenceCreateInput {
  if (!isDomainIntelligence(input)) return input;
  return { title: input.title, summary: input.summary, original_content: input.originalContent, note: input.note, url: input.url, platform: input.platform, source_type: input.sourceType, capture_method: input.captureMethod, author: input.author, thumbnail: input.thumbnail, ai_score: input.aiScore, status: input.status, tags: input.tags, captured_at: input.capturedAt, metrics: input.metrics };
}

function serializeIntelligencePatch(input: IntelligenceUpdateInput | Partial<IntelligenceItem>) {
  return serializeInboxPatch(input as Partial<InboxItem> & IntelligenceUpdateInput);
}

function serializeCompetitor(input: Competitor | CompetitorCreateInput): CompetitorCreateInput {
  if (!isDomainCompetitor(input)) return input;
  return { name: input.name, handle: input.handle, platform: input.platform, avatar: input.avatar, description: input.description, followers: input.followers, posts_7d: input.posts7d, avg_views: input.avgViews, avg_engagement: input.avgEngagement, outlier_index: input.outlierIndex, recent_topics: input.recentTopics, monitored: input.monitored, trend: input.trend, hooks: input.hooks, insights: input.insights };
}

function normalizeCompetitorPatch(input: CompetitorUpdateInput | Partial<Competitor>): CompetitorUpdateInput {
  const item = input as Partial<Competitor> & CompetitorUpdateInput;
  return { ...(item.name === undefined ? {} : { name: item.name }), ...(item.handle === undefined ? {} : { handle: item.handle }), ...(item.platform === undefined ? {} : { platform: item.platform }), ...(item.avatar === undefined ? {} : { avatar: item.avatar }), ...(item.description === undefined ? {} : { description: item.description }), ...(item.followers === undefined ? {} : { followers: item.followers }), ...(item.posts7d === undefined ? {} : { posts_7d: item.posts7d }), ...(item.posts_7d === undefined ? {} : { posts_7d: item.posts_7d }), ...(item.avgViews === undefined ? {} : { avg_views: item.avgViews }), ...(item.avg_views === undefined ? {} : { avg_views: item.avg_views }), ...(item.avgEngagement === undefined ? {} : { avg_engagement: item.avgEngagement }), ...(item.avg_engagement === undefined ? {} : { avg_engagement: item.avg_engagement }), ...(item.outlierIndex === undefined ? {} : { outlier_index: item.outlierIndex }), ...(item.outlier_index === undefined ? {} : { outlier_index: item.outlier_index }), ...(item.recentTopics === undefined ? {} : { recent_topics: item.recentTopics }), ...(item.recent_topics === undefined ? {} : { recent_topics: item.recent_topics }), ...(item.monitored === undefined ? {} : { monitored: item.monitored }), ...(item.trend === undefined ? {} : { trend: item.trend }), ...(item.hooks === undefined ? {} : { hooks: item.hooks }), ...(item.insights === undefined ? {} : { insights: item.insights }) };
}

function serializeIdea(input: Idea | IdeaCreateInput): IdeaCreateInput {
  if (!isDomainIdea(input)) return input;
  return { title: input.title, angle: input.angle, priority: input.priority, platforms: input.platforms, status: input.status, tags: input.tags, score: input.score, core: input.core, audience: input.audience, cta: input.cta, title_variants: input.titles, outline: input.outline, hook: input.hook, script: input.script, materials: input.materials, strategy: input.strategy, metadata: input.metadata };
}

function serializeIdeaPatch(input: IdeaUpdateInput | Partial<Idea>): IdeaUpdateInput {
  const item = input as Partial<Idea> & IdeaUpdateInput;
  return { ...(item.title === undefined ? {} : { title: item.title }), ...(item.angle === undefined ? {} : { angle: item.angle }), ...(item.priority === undefined ? {} : { priority: item.priority }), ...(item.platforms === undefined ? {} : { platforms: item.platforms }), ...(item.status === undefined ? {} : { status: item.status }), ...(item.tags === undefined ? {} : { tags: item.tags }), ...(item.score === undefined ? {} : { score: item.score }), ...(item.core === undefined ? {} : { core: item.core }), ...(item.audience === undefined ? {} : { audience: item.audience }), ...(item.cta === undefined ? {} : { cta: item.cta }), ...(item.titles === undefined ? {} : { title_variants: item.titles }), ...(item.title_variants === undefined ? {} : { title_variants: item.title_variants }), ...(item.outline === undefined ? {} : { outline: item.outline }), ...(item.hook === undefined ? {} : { hook: item.hook }), ...(item.script === undefined ? {} : { script: item.script }), ...(item.materials === undefined ? {} : { materials: item.materials }), ...(item.strategy === undefined ? {} : { strategy: item.strategy }), ...(item.metadata === undefined ? {} : { metadata: item.metadata }) };
}

function serializeContent(input: ContentItem | ContentCreateInput): ContentCreateInput {
  if (!isDomainContent(input)) return input;
  return { title: input.title, platform: input.platform, status: input.status as ContentCreateInput["status"], scheduled_at: input.scheduledAt ?? null, idea_id: input.ideaId ?? null, assignee: input.assignee };
}

function serializeContentPatch(input: ContentUpdateInput | Partial<ContentItem>): ContentUpdateInput {
  const item = input as Partial<ContentItem> & ContentUpdateInput;
  return { ...(item.title === undefined ? {} : { title: item.title }), ...(item.platform === undefined ? {} : { platform: item.platform }), ...(item.status === undefined ? {} : { status: item.status as ContentCreateInput["status"] }), ...(item.scheduledAt === undefined ? {} : { scheduled_at: item.scheduledAt ?? null }), ...(item.scheduled_at === undefined ? {} : { scheduled_at: item.scheduled_at }), ...(item.ideaId === undefined ? {} : { idea_id: item.ideaId ?? null }), ...(item.idea_id === undefined ? {} : { idea_id: item.idea_id }), ...(item.assignee === undefined ? {} : { assignee: item.assignee }) };
}
