"use client";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Bookmark,
  FileText,
  Lightbulb,
  Target,
  Zap,
  Sparkles,
} from "lucide-react";
import { Badge, Stat, PageHead, Section, cn } from "../../components/shared/legacy";
import { useWorkbench } from "../../hooks/use-workbench";
import { formatDate } from "../../lib/utils";

export default function Today() {
  const router = useRouter();
  const { state } = useWorkbench();
  const insights = state.intelligence.slice(0, 3);
  const inboxPreview = state.inbox.slice(0, 4);
  const analyzedCount = state.inbox.filter((item) => item.analysis).length + state.intelligence.filter((item) => item.analysis).length;
  const competitorActivities = state.competitors.flatMap((competitor) => competitor.recentContent.slice(0, 2).map((content) => ({
    id: content.id,
    name: competitor.name,
    title: content.title,
    avatar: competitor.avatar || competitor.name.slice(0, 1),
  }))).slice(0, 5);
  const recommendations = state.intelligence.slice(0, 3).map((item) => ({
    title: item.title,
    reason: item.analysis ? "基于已完成的 AI 分析，适合继续拆解" : "来自当前工作区的最新情报",
    label: item.aiScore !== null && item.aiScore >= 85 ? "高潜力" : "适合你",
  }));
  const currentDate = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date());

  return (
    <>
      <PageHead
        title={
          <>
            早上好，<br />
            让好内容从今天开始 <span className="sparkle">✦</span>
          </>
        }
        desc="收集灵感，洞察趋势，借助 AI 生成更好的内容。"
        action={
          <div className="date">
            {currentDate}
            <br />
            <span>“优秀的创作者，都善于从日常中发现不寻常。”</span>
          </div>
        }
      />

      <div className="stats">
        <Stat icon={FileText} label="今日收集" value={String(state.inbox.length + state.intelligence.length)} delta="" sub="来自当前工作区" />
        <Stat
          icon={Lightbulb}
          label="待处理灵感"
          value={String(state.inbox.filter((item) => item.status === "待处理").length)}
          delta=""
          color="#f1a535"
          sub={`其中 ${analyzedCount} 条已 AI 分析`}
        />
        <Stat icon={Target} label="候选选题" value={String(state.ideas.length)} delta="" color="#856eea" sub="来自当前工作区" />
        <Stat icon={Zap} label="已发布内容" value={String(state.content.filter((item) => item.status === "已发布").length)} delta="" color="#37b986" sub="当前工作区累计" />
      </div>

      <div className="three-col">
        <Section
          title="今日最有价值的洞察"
          action={
            <button
              type="button"
              className="link"
              onClick={() => router.push("/intelligence")}
            >
              查看全部 <ChevronRight size={14} />
            </button>
          }
          className="wide"
        >
          <div className="insights">
            {insights.map((x) => (
              <button
                type="button"
                className="insight"
                key={x.title}
                onClick={() => router.push("/intelligence")}
              >
                <div className="thumb" style={{ background: x.thumbnail }}>
                  <div className="thumb-shape" />
                </div>
                <div className="insight-copy">
                  <strong>{x.title}</strong>
                  <p>{x.summary}</p>
                  <Badge tone="blue">{x.tags[0] || x.platform}</Badge>
                  <span className="time">{formatDate(x.capturedAt)}</span>
                </div>
                <Bookmark size={16} className="bookmark" />
              </button>
            ))}
          </div>
        </Section>

        <Section
          title="对手动态"
          action={
            <button
              type="button"
              className="link"
              onClick={() => router.push("/competitors")}
            >
              查看全部 <ChevronRight size={14} />
            </button>
          }
        >
          <div className="activity-list">
            {competitorActivities.length === 0 ? <p className="empty-copy">暂无对手动态</p> : competitorActivities.map((activity, i) => (
              <div
                className="activity cursor-pointer"
                key={activity.id}
                onClick={() => router.push("/competitors")}
              >
                <div className={cn("mini-logo", `logo-${i}`)}>{activity.avatar}</div>
                <div>
                  <strong>{activity.name}</strong>
                  <p>{activity.title}</p>
                </div>
                <span>当前工作区</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="灵感 Inbox"
          action={
            <button
              type="button"
              className="link"
              onClick={() => router.push("/inbox")}
            >
              查看全部 <ChevronRight size={14} />
            </button>
          }
        >
          <div className="inbox-preview">
            {inboxPreview.map((x, i) => (
              <div
                className="inbox-row cursor-pointer"
                key={x.title}
                onClick={() => router.push("/inbox")}
              >
                <div className="tiny-thumb" style={{ background: x.thumbnail }} />
                <div>
                  <strong>{x.title.slice(0, 15)}...</strong>
                  <p>{x.sourceType}</p>
                </div>
                <span>{i * 2 + 1} 小时前</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="AI 推荐" action={<button type="button" className="link">换一批 ↻</button>} className="recommend">
        <div className="recommend-grid">
          <div className="recommend-list">
            {recommendations.length === 0 ? <p className="empty-copy">暂无推荐，先在情报库收集一些内容。</p> : recommendations.map((recommendation, i) => (
              <div className="recommend-item" key={recommendation.title}>
                <div className="number">{i + 1}</div>
                <div>
                  <strong>{recommendation.title}</strong>
                  <p>{recommendation.reason}</p>
                </div>
                <Badge tone={recommendation.label === "高潜力" ? "red" : "purple"}>{recommendation.label}</Badge>
                <button
                  type="button"
                  className="outline"
                  onClick={() => router.push("/ideas")}
                >
                  生成选题 <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="ai-card">
            <Sparkles size={25} />
            <strong>
              让 AI 成为你的
              <br />
              内容搭档
            </strong>
            <p>从信息到洞见，从灵感到成稿。</p>
          </div>
        </div>
      </Section>
    </>
  );
}
