export const platforms = ["小红书", "TikTok", "YouTube", "X", "Bilibili", "微信公众号", "网页", "自己想到"] as const;
export type Platform = typeof platforms[number];
export const ideaStatuses = ["待筛选","候选选题","待制作","制作中","待发布","已发布"] as const;
export type IdeaStatus = typeof ideaStatuses[number];
export type Priority = "S" | "A" | "B";
export type SourceRef = { kind: "inbox" | "intelligence"; id: string };
export type CaptureMethod = "手动收藏" | "快速添加" | "浏览器插件" | "自己想到";
export type RecordStatus = "待处理" | "待分析" | "高潜" | "已转选题" | "已归档" | "已忽略";
export type ContentStatus = "待制作" | "制作中" | "待发布" | "已发布" | "已归档";
export interface Analysis { summary: string; core: string; reasons: string[]; angles: string[]; }
export interface IntelligenceItem {
  id: string; title: string; summary: string; originalContent: string; note: string;
  url: string; platform: Platform; sourceType: string; captureMethod: CaptureMethod;
  author: string; thumbnail: string; aiScore: number | null; status: RecordStatus; tags: string[];
  capturedAt: string; updatedAt?: string; metrics: {views:number; likes:number}; analysis?: Analysis;
}
export interface InboxItem extends IntelligenceItem { mode: "链接" | "选中内容" | "我的重点"; }
export interface Competitor {
  id: string; name: string; handle: string; platform: Platform; avatar: string; description: string;
  followers: number; posts7d: number; avgViews: number; avgEngagement: number; outlierIndex: number;
  recentTopics: string[]; updatedAt: string; monitored: boolean;
  recentContent: {id:string; title:string; thumbnail:string; views:number; likes:number; outlier:number}[];
  trend: {date:string; views:number; baseline:number}[];
  hooks: {label:string; value:number}[]; insights: string[];
}
export interface Workspace { id: string; name: string; slug: string; ownerId: string; }
export interface Profile { id: string; displayName: string; avatarUrl?: string | null; }
export interface Idea {
  id: string; title: string; angle: string; priority: Priority; platforms: Platform[];
  status: IdeaStatus; tags: string[]; sourceIds: SourceRef[]; score: number;
  core: string; audience: string; cta: string; titles: string[];
  outline: string; hook: string; script: string; materials: string; strategy: string;
  metadata?: Record<string, unknown>; sortOrder?: number;
}
export interface CompetitorContent {id:string; competitorId:string; title:string; thumbnail:string; views:number; likes:number; outlier:number; publishedAt?:string | null;}
export interface ContentItem {id:string; title:string; platform:Platform; status:ContentStatus|string; scheduledAt?:string; ideaId?:string; assignee:string;}
export interface WorkbenchState {intelligence:IntelligenceItem[]; inbox:InboxItem[]; competitors:Competitor[]; ideas:Idea[]; content:ContentItem[]; workspace?: Workspace; profile?: Profile;}
