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
import { content } from "../../data/mock-analytics";
import { Badge, Stat, PageHead, Section, cn } from "../../components/shared/legacy";

export default function Today() {
  const router = useRouter();

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
            4月16日　星期二
            <br />
            <span>“优秀的创作者，都善于从日常中发现不寻常。”</span>
          </div>
        }
      />

      <div className="stats">
        <Stat icon={FileText} label="今日收集" value="18" delta="28%" sub="来自对手 11 · 灵感 7" />
        <Stat
          icon={Lightbulb}
          label="待处理灵感"
          value="24"
          delta="12%"
          color="#f1a535"
          sub="其中 8 条已 AI 分析"
        />
        <Stat icon={Target} label="候选选题" value="6" delta="50%" color="#856eea" sub="3 个高优先级" />
        <Stat icon={Zap} label="已发布内容" value="3" delta="200%" color="#37b986" sub="本周累计" />
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
            {content.slice(0, 3).map((x) => (
              <button
                type="button"
                className="insight"
                key={x.title}
                onClick={() => router.push("/intelligence")}
              >
                <div className="thumb" style={{ background: x.image }}>
                  <div className="thumb-shape" />
                </div>
                <div className="insight-copy">
                  <strong>{x.title}</strong>
                  <p>{x.summary}</p>
                  <Badge tone={x.tone}>{x.tag}</Badge>
                  <span className="time">{x.time}</span>
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
            {["TechFlow", "少数派", "极客公园", "36氪", "Notion 中文"].map((x, i) => (
              <div
                className="activity cursor-pointer"
                key={x}
                onClick={() => router.push("/competitors")}
              >
                <div className={cn("mini-logo", `logo-${i}`)}>{x[0]}</div>
                <div>
                  <strong>{x}</strong>
                  <p>{i % 2 ? "发布了视频：新工具上线" : "发布了新文章：AI 时代的工作流"}</p>
                </div>
                <span>{i + 1} 小时前</span>
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
            {content.map((x, i) => (
              <div
                className="inbox-row cursor-pointer"
                key={x.title}
                onClick={() => router.push("/inbox")}
              >
                <div className="tiny-thumb" style={{ background: x.image }} />
                <div>
                  <strong>{x.title.slice(0, 15)}...</strong>
                  <p>{x.source}</p>
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
            {[
              "AI 工具 × 个人知识管理：从混乱到清晰的完整指南",
              "短视频时代，深度内容还有机会吗？",
              "独立开发者如何做好内容获客",
            ].map((x, i) => (
              <div className="recommend-item" key={x}>
                <div className="number">{i + 1}</div>
                <div>
                  <strong>{x}</strong>
                  <p>
                    {[
                      "基于你最近收藏的内容，匹配度较高",
                      "行业话题热度上升，适合抖音 / 视频号",
                      "符合你关注的产品增长方向",
                    ][i]}
                  </p>
                </div>
                <Badge tone={i === 0 ? "red" : "purple"}>{i === 0 ? "高潜力" : "适合你"}</Badge>
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
