"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  CalendarDays,
  Grid2X2,
  Workflow,
  Settings,
  Plus,
  TrendingUp,
  Sparkles,
  Zap,
  ChevronRight,
  Clock,
  User,
} from "lucide-react";
import { PageHead, Stat, Section } from "../../components/shared/legacy";
import { PlatformBadge, StatusBadge } from "../../components/shared/primitives";
import { useWorkbench } from "../../hooks/use-workbench";
import { cn, formatDate } from "../../lib/utils";

interface WorkspaceOverviewProps {
  kind: "production" | "calendar" | "patterns" | "workflows" | "settings";
  title: string;
  description: string;
}

export function WorkspaceOverview({ kind, title, description }: WorkspaceOverviewProps) {
  const router = useRouter();
  const { state } = useWorkbench();

  const iconMap = {
    production: FileText,
    calendar: CalendarDays,
    patterns: Grid2X2,
    workflows: Workflow,
    settings: Settings,
  };

  const Icon = iconMap[kind] || Settings;
  const weeklyNew = state.inbox.length + state.intelligence.length + state.ideas.length + state.content.length;
  const activeContent = state.content.filter((item) => item.status !== "已归档" && item.status !== "已发布").length;
  const analyzedCount = state.inbox.filter((item) => item.analysis).length + state.intelligence.filter((item) => item.analysis).length;
  const completedCount = state.content.filter((item) => item.status === "已发布").length + state.ideas.filter((item) => item.status === "已发布").length;
  const recentActivity = [
    ...state.inbox.slice(0, 2).map((item) => "收藏了灵感：" + item.title),
    ...state.intelligence.filter((item) => item.analysis).slice(0, 2).map((item) => "完成了情报分析：" + item.title),
    ...state.ideas.slice(0, 2).map((item) => "新建了选题：" + item.title),
    ...state.content.slice(0, 2).map((item) => "创建了内容计划：" + item.title),
  ].slice(0, 5);

  return (
    <>
      <PageHead
        title={title}
        desc={description}
        action={
          <button
            type="button"
            className="primary inline-flex items-center gap-1.5 rounded-lg bg-[#152039] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#203052]"
            onClick={() => {
              if (kind === "calendar" || kind === "production") {
                router.push("/ideas");
              } else if (kind === "workflows") {
                router.push("/inbox");
              }
            }}
          >
            <Plus size={16} /> 新建{kind === "calendar" ? "排期" : kind === "production" ? "任务" : "项目"}
          </button>
        }
      />

      <div className="stats">
        <Stat icon={Icon} label="本周新增" value={String(weeklyNew)} delta="" sub="来自当前工作区" />
        <Stat icon={TrendingUp} label="活跃内容" value={String(activeContent)} delta="" color="#856eea" sub="未归档或发布" />
        <Stat icon={Sparkles} label="AI 洞察" value={String(analyzedCount)} delta="" color="#f1a535" sub="已完成分析" />
        <Stat icon={Zap} label="已完成" value={String(completedCount)} delta="" color="#37b986" sub="当前工作区累计" />
      </div>

      {kind === "calendar" && (
        <Section
          title="内容发布计划与排期列表"
          action={
            <Link href="/ideas" className="link flex items-center gap-1 text-xs text-[#67748b] hover:text-[#3378f6]">
              从选题添加排期 <ChevronRight size={14} />
            </Link>
          }
          className="mb-4"
        >
          {state.content.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#8791a7]">
              暂无发布计划。前往选题详情点击「加入发布计划」创建排期。
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {state.content.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#e7ebf2] bg-[#fbfcfe] p-4 shadow-2xs hover:border-[#8db5ff] transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <PlatformBadge value={item.platform} />
                    <StatusBadge value={item.status} />
                  </div>
                  <h4 className="text-sm font-semibold text-[#152039] mb-3 line-clamp-2">
                    {item.title}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-[#8791a7] pt-2 border-t border-[#edf0f5]">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={13} className="text-[#3378f6]" />
                      {item.scheduledAt ? formatDate(item.scheduledAt) : "待定时间"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User size={13} />
                      {item.assignee}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      <div className="generic-grid">
        <Section
          title={
            kind === "workflows"
              ? "内容生产工作流"
              : kind === "calendar"
              ? "排期日历总览"
              : "工作区概览"
          }
          action={
            <button type="button" className="link flex items-center gap-1 text-xs text-[#67748b] hover:text-[#3378f6]">
              查看更多 <ChevronRight size={14} />
            </button>
          }
        >
          <div className="hero-workspace">
            <div className="hero-icon">
              <Icon size={28} />
            </div>
            <h2>
              {kind === "workflows"
                ? "灵感采集 → AI 分析 → 内容发布"
                : kind === "calendar"
                ? "本周内容发布规划"
                : "把你的下一条好内容放在这里"}
            </h2>
            <p>
              {kind === "workflows"
                ? "所有工具已准备就绪，今天有 5 个自动化任务正在运行。"
                : kind === "calendar"
                ? "已同步选题进度与排期表，随时掌握多平台分发节奏。"
                : "从这里开始整理信息、沉淀洞察，并持续输出。"}
            </p>
            <button
              type="button"
              className="primary inline-flex items-center gap-1.5 rounded-lg bg-[#3378f6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563eb]"
              onClick={() => router.push(kind === "calendar" ? "/ideas" : "/inbox")}
            >
              开始使用 <ChevronRight size={15} />
            </button>
          </div>
        </Section>

        <Section title="最近动态">
                <div className="timeline">
            {recentActivity.length === 0 ? <p className="empty-copy">暂无最近动态</p> : recentActivity.map((activity, i) => (
              <div key={activity} className="flex items-start gap-3 py-2.5 border-b border-[#edf0f5]">
                <span className={cn("timeline-dot mt-1", `dot-${i}`)} />
                <div className="flex-1 min-w-0">
                  <strong className="text-sm text-[#152039]">{activity}</strong>
                  <p className="text-xs text-[#9aa4b6] m-0 mt-1">
                    {i % 2 ? "AI 时代的个人知识管理指南" : "来自今日工作台的最新活动"}
                  </p>
                </div>
                <time className="text-xs text-[#9aa4b6] whitespace-nowrap">{i + 1} 小时前</time>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="推荐行动" className="recommend">
        <div className="action-grid">
          {["生成大纲", "补全 Hook", "生成脚本", "素材建议"].map((x) => (
            <button
              key={x}
              type="button"
              className="action-tile group text-left hover:border-[#8db5ff] transition-all cursor-pointer"
              onClick={() => router.push("/ideas")}
            >
              <Sparkles size={19} className="text-[#3378f6]" />
              <strong className="block text-sm font-semibold text-[#152039] mt-2.5">{x}</strong>
              <p className="text-xs text-[#9aa4b6] mt-1">基于当前内容智能推荐下一步动作</p>
              <ChevronRight size={15} className="absolute right-3.5 top-10 text-[#8995a9] group-hover:text-[#3378f6]" />
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}
