"use client";
import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  Link as LinkIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { useWorkbench } from "../../hooks/use-workbench";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select } from "../../components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { toast } from "../../components/ui/sonner";
import {
  PriorityBadge,
  StatusBadge,
  PlatformBadge,
  EmptyState,
} from "../../components/shared/primitives";
import {
  platforms,
  ideaStatuses,
  type Platform,
  type Priority,
  type IdeaStatus,
  type Idea,
} from "../../types";
import { generationTemplates } from "../../data/mock-ideas";
import { SchedulePublishingDialog } from "./schedule-publishing-dialog";

function IdeaDetailContent({ idea }: { idea: Idea }) {
  const { dispatch } = useWorkbench();

  const [activeTab, setActiveTab] = React.useState("overview");
  const [showScheduleDialog, setShowScheduleDialog] = React.useState(false);

  // Initialized directly from idea
  const [title, setTitle] = React.useState(idea.title);
  const [angle, setAngle] = React.useState(idea.angle);
  const [priority, setPriority] = React.useState<Priority>(idea.priority);
  const [status, setStatus] = React.useState<IdeaStatus>(idea.status);
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<Platform[]>(idea.platforms);
  const [core, setCore] = React.useState(idea.core);
  const [audience, setAudience] = React.useState(idea.audience);
  const [cta, setCta] = React.useState(idea.cta);
  const [titles, setTitles] = React.useState<string[]>(idea.titles || [idea.title]);
  const [newTitleInput, setNewTitleInput] = React.useState("");
  const [outline, setOutline] = React.useState(idea.outline || (idea.id === "demo-1" ? generationTemplates.outline : ""));
  const [hook, setHook] = React.useState(idea.hook || (idea.id === "demo-1" ? generationTemplates.hook : ""));
  const [script, setScript] = React.useState(idea.script || (idea.id === "demo-1" ? generationTemplates.script : ""));
  const [materials, setMaterials] = React.useState(idea.materials || "1. 真实操作屏幕录屏\n2. 产出文档/效果截图\n3. 使用前后数据对比表");
  const [strategy, setStrategy] = React.useState(idea.strategy || "先发布小红书图文测试完播率与讨论度，再将高价值论点扩展为深度视频分发至 Bilibili / YouTube。");
  const [tags, setTags] = React.useState(idea.tags.join(", "));

  const handleSave = (patch: Partial<Idea>) => {
    dispatch({
      type: "editIdea",
      id: idea.id,
      patch,
    });
    toast.success("选题已保存并同步！");
  };

  const handleAddTitle = () => {
    if (!newTitleInput.trim()) return;
    const nextTitles = [...titles, newTitleInput.trim()];
    setTitles(nextTitles);
    setNewTitleInput("");
    handleSave({ titles: nextTitles });
  };

  const handleRemoveTitle = (idx: number) => {
    const nextTitles = titles.filter((_, i) => i !== idx);
    setTitles(nextTitles);
    handleSave({ titles: nextTitles });
  };

  const handleGenerateOutline = () => {
    const next = generationTemplates.outline;
    setOutline(next);
    handleSave({ outline: next });
    toast.success("AI 已生成 6 步大纲！", "包含 Hook、痛点、案例与方法结构");
  };

  const handleGenerateHook = () => {
    const next = `【悬念型 Hook】\n${generationTemplates.hook}\n\n【反常识 Hook】\n90% 的人以为多收藏就能学到东西，但真正拉开差距的，其实是这套 3 分钟整理法。\n\n【结果先行 Hook】\n只用了 3 天，这套工作流帮我把收藏夹里的零散信息，直接变成了 10w+ 播放的选题。`;
    setHook(next);
    handleSave({ hook: next });
    toast.success("AI 已生成 3 组不同风格 Hook！");
  };

  const handleGenerateScript = () => {
    const next = generationTemplates.script;
    setScript(next);
    handleSave({ script: next });
    toast.success("AI 已生成分幕逐字稿！");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e8edf4] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/ideas"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e7ebf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#40506a] hover:bg-[#f4f6fa] hover:text-[#152039] transition-colors"
          >
            <ArrowLeft size={14} /> 返回看板
          </Link>
          <div className="flex items-center gap-2">
            <PriorityBadge value={priority} />
            <StatusBadge value={status} />`n            <span className="flex items-center gap-1">{selectedPlatforms.map((p) => <PlatformBadge key={p} value={p} />)}</span>
            <span className="text-xs font-bold text-[#3378f6] bg-[#edf4ff] px-2 py-0.5 rounded">
              AI 评分 {idea.score}分
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            className="text-xs h-8"
            onClick={() =>
              handleSave({
                title,
                angle,
                priority,
                status,
                platforms: selectedPlatforms,
                core,
                audience,
                cta,
                outline,
                hook,
                script,
                materials,
                strategy,
                tags: tags.split(/[,，\s]+/).filter(Boolean),
              })
            }
          >
            保存修改
          </Button>

          <Button
            className="bg-[#3378f6] hover:bg-[#2563eb] text-xs h-8"
            onClick={() => setShowScheduleDialog(true)}
          >
            <Calendar size={14} /> 加入发布计划
          </Button>
        </div>
      </div>

      {/* Main Title Section */}
      <div className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => handleSave({ title })}
          className="w-full text-2xl font-bold tracking-tight text-[#152039] bg-transparent border-0 border-b border-transparent hover:border-[#cbd5e1] focus:border-[#3378f6] focus:outline-none py-1"
          placeholder="输入选题标题..."
        />
        <div className="flex items-center gap-2 text-xs text-[#8791a7]">
          <span>选题切入点:</span>
          <input
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            onBlur={() => handleSave({ angle })}
            className="flex-1 bg-transparent text-[#40506a] border-0 border-b border-transparent hover:border-[#cbd5e1] focus:border-[#3378f6] focus:outline-none"
            placeholder="说明切入点..."
          />
        </div>
      </div>

      {/* 6 Tabs Detail Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex justify-start gap-1 overflow-x-auto thin-scroll">
          <TabsTrigger value="overview">概览设定 (Overview)</TabsTrigger>
          <TabsTrigger value="outline">大纲 (Outline)</TabsTrigger>
          <TabsTrigger value="hook">Hook 库 (Hook)</TabsTrigger>
          <TabsTrigger value="script">逐字稿 (Script)</TabsTrigger>
          <TabsTrigger value="materials">素材清单 (Materials)</TabsTrigger>
          <TabsTrigger value="strategy">发布策略 (Strategy)</TabsTrigger>
        </TabsList>

        {/* 1. Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="rounded-xl border border-[#e7ebf2] bg-white p-5 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-[#152039] border-b border-[#edf0f5] pb-2">
                  核心价值与论点
                </h3>
                <div>
                  <label className="block text-xs font-semibold text-[#68758d] mb-1.5">
                    核心论点 (Core Thesis)
                  </label>
                  <Textarea
                    rows={3}
                    value={core}
                    onChange={(e) => setCore(e.target.value)}
                    onBlur={() => handleSave({ core })}
                    placeholder="这篇内容要为受众解答什么、传达什么核心判断？"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#68758d] mb-1.5">
                      目标受众画像 (Target Audience)
                    </label>
                    <Input
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      onBlur={() => handleSave({ audience })}
                      placeholder="例如：对 AI 工具感兴趣的独立创作者..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#68758d] mb-1.5">
                      结尾行动呼吁 (CTA)
                    </label>
                    <Input
                      value={cta}
                      onChange={(e) => setCta(e.target.value)}
                      onBlur={() => handleSave({ cta })}
                      placeholder="例如：在评论区留下你的工作流..."
                    />
                  </div>
                </div>
              </div>

              {/* Titles Pool */}
              <div className="rounded-xl border border-[#e7ebf2] bg-white p-5 shadow-2xs space-y-3">
                <h3 className="text-sm font-bold text-[#152039] border-b border-[#edf0f5] pb-2">
                  备选爆款标题库 (AB 测试备选)
                </h3>
                <div className="space-y-2">
                  {titles.map((t, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[#edf0f5] bg-[#fbfcfe] p-2.5 text-xs text-[#334155]"
                    >
                      <span className="font-semibold text-[#8791a7]">{idx + 1}.</span>
                      <span className="flex-1 min-w-0 font-medium">{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTitle(idx)}
                        className="text-[#9aa4b6] hover:text-red-500 p-1"
                        aria-label="删除标题"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Input
                    placeholder="添加新的候选标题..."
                    value={newTitleInput}
                    onChange={(e) => setNewTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTitle();
                      }
                    }}
                    className="text-xs h-8"
                  />
                  <Button size="sm" variant="outline" onClick={handleAddTitle} className="text-xs h-8 shrink-0">
                    <Plus size={14} /> 添加
                  </Button>
                </div>
              </div>
            </div>

            {/* Sidebar Meta Info */}
            <div className="space-y-4">
              <div className="rounded-xl border border-[#e7ebf2] bg-white p-5 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-[#152039] border-b border-[#edf0f5] pb-2">
                  属性与分发控制
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-[#68758d] mb-1.5">
                    优先级级别
                  </label>
                  <Select
                    value={priority}
                    onChange={(e) => {
                      const val = e.target.value as Priority;
                      setPriority(val);
                      handleSave({ priority: val });
                    }}
                  >
                    <option value="S">S 级 (核心高潜优先)</option>
                    <option value="A">A 级 (标准主力内容)</option>
                    <option value="B">B 级 (常态备选内容)</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#68758d] mb-1.5">
                    看板生产状态
                  </label>
                  <Select
                    value={status}
                    onChange={(e) => {
                      const val = e.target.value as IdeaStatus;
                      setStatus(val);
                      handleSave({ status: val });
                    }}
                  >
                    {ideaStatuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#68758d] mb-2">
                    目标分发平台
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {platforms.map((p) => {
                      const checked = selectedPlatforms.includes(p);
                      return (
                        <label
                          key={p}
                          className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors ${
                            checked ? "border-[#3378f6] bg-[#edf4ff] text-[#286cf2] font-semibold" : "border-[#edf0f5] text-[#64748b]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...selectedPlatforms, p]
                                : selectedPlatforms.filter((x) => x !== p);
                              setSelectedPlatforms(next);
                              handleSave({ platforms: next });
                            }}
                            className="size-3.5 text-[#3378f6]"
                          />
                          <span>{p}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#68758d] mb-1.5">
                    标签分类
                  </label>
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    onBlur={() => handleSave({ tags: tags.split(/[,，\s]+/).filter(Boolean) })}
                    placeholder="AI 工具, 内容创作..."
                  />
                </div>
              </div>

              {/* Source References */}
              <div className="rounded-xl border border-[#e7ebf2] bg-white p-5 shadow-2xs space-y-3">
                <h3 className="text-sm font-bold text-[#152039] border-b border-[#edf0f5] pb-2 flex items-center gap-1.5">
                  <LinkIcon size={14} className="text-[#3378f6]" /> 关联原始情报 / 灵感
                </h3>
                {idea.sourceIds && idea.sourceIds.length > 0 ? (
                  <div className="space-y-2">
                    {idea.sourceIds.map((ref, idx) => {
                      const linkTarget = ref.kind === "inbox" ? `/inbox?item=${ref.id}` : `/intelligence?item=${ref.id}`;
                      const label = ref.kind === "inbox" ? `灵感 Inbox (#${ref.id})` : `情报库 (#${ref.id})`;
                      return (
                        <Link
                          key={idx}
                          href={linkTarget}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-[#e8edf4] bg-[#fbfcfe] text-xs text-[#3378f6] hover:bg-[#edf4ff] transition-colors"
                        >
                          <span className="font-semibold">{label}</span>
                          <span className="text-[11px] text-[#8791a7]">点击查看源记录 →</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#8791a7] m-0">
                    直接新建的选题，暂无绑定的原始收集记录。
                  </p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 2. Outline Tab */}
        <TabsContent value="outline">
          <div className="rounded-xl border border-[#e7ebf2] bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0f5] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#152039]">结构化内容大纲</h3>
                <p className="text-xs text-[#8791a7] mt-0.5">
                  包含钩子引入、痛点共鸣、核心方法拆解、案例对比与结尾行动呼吁。
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-[#3378f6] border-[#d8e6ff] hover:bg-[#edf4ff]"
                onClick={handleGenerateOutline}
              >
                <Sparkles size={13} /> AI 生成大纲
              </Button>
            </div>

            <Textarea
              rows={12}
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
              onBlur={() => handleSave({ outline })}
              className="font-mono text-xs leading-relaxed"
              placeholder="编写或点击上方按钮让 AI 生成 6 步大纲..."
            />
          </div>
        </TabsContent>

        {/* 3. Hook Tab */}
        <TabsContent value="hook">
          <div className="rounded-xl border border-[#e7ebf2] bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0f5] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#152039]">前 3 秒黄金 Hook 库</h3>
                <p className="text-xs text-[#8791a7] mt-0.5">
                  抓人眼球的开篇脚本，包含悬念型、反常识型与结果先行型。
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-[#3378f6] border-[#d8e6ff] hover:bg-[#edf4ff]"
                onClick={handleGenerateHook}
              >
                <Sparkles size={13} /> AI 推荐 Hook
              </Button>
            </div>

            <Textarea
              rows={10}
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              onBlur={() => handleSave({ hook })}
              className="font-mono text-xs leading-relaxed"
              placeholder="编写开篇钩子或点击上方按钮让 AI 智能推荐..."
            />
          </div>
        </TabsContent>

        {/* 4. Script Tab */}
        <TabsContent value="script">
          <div className="rounded-xl border border-[#e7ebf2] bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0f5] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#152039]">分幕逐字稿脚本</h3>
                <p className="text-xs text-[#8791a7] mt-0.5">
                  开场、问题提出、操作演示与结尾，随时修改润色。
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-[#3378f6] border-[#d8e6ff] hover:bg-[#edf4ff]"
                onClick={handleGenerateScript}
              >
                <Sparkles size={13} /> AI 生成逐字稿
              </Button>
            </div>

            <Textarea
              rows={14}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              onBlur={() => handleSave({ script })}
              className="font-mono text-xs leading-relaxed"
              placeholder="输入逐字脚本或点击上方按钮让 AI 生成分幕逐字稿..."
            />
          </div>
        </TabsContent>

        {/* 5. Materials Tab */}
        <TabsContent value="materials">
          <div className="rounded-xl border border-[#e7ebf2] bg-white p-5 shadow-2xs space-y-4">
            <div className="border-b border-[#edf0f5] pb-3">
              <h3 className="text-sm font-bold text-[#152039]">所需素材清单与规划</h3>
              <p className="text-xs text-[#8791a7] mt-0.5">
                记录视频 B-roll、操作录屏、演示截图、音效及辅助展示物料。
              </p>
            </div>

            <Textarea
              rows={8}
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              onBlur={() => handleSave({ materials })}
              className="font-mono text-xs leading-relaxed"
              placeholder="列举本次内容制作所需要的素材..."
            />
          </div>
        </TabsContent>

        {/* 6. Strategy Tab */}
        <TabsContent value="strategy">
          <div className="rounded-xl border border-[#e7ebf2] bg-white p-5 shadow-2xs space-y-4">
            <div className="border-b border-[#edf0f5] pb-3">
              <h3 className="text-sm font-bold text-[#152039]">多平台发布与分发策略</h3>
              <p className="text-xs text-[#8791a7] mt-0.5">
                发布时间窗口、封面设计重点、评论区置顶与粉丝引导预案。
              </p>
            </div>

            <Textarea
              rows={8}
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              onBlur={() => handleSave({ strategy })}
              className="font-mono text-xs leading-relaxed"
              placeholder="记录分发策略与运营预案..."
            />
          </div>
        </TabsContent>
      </Tabs>

      <SchedulePublishingDialog
        idea={idea}
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
      />
    </div>
  );
}

export default function IdeaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { state } = useWorkbench();

  const idea = state.ideas.find((i) => i.id === id);

  if (!idea) {
    return (
      <div className="py-16 text-center max-w-lg mx-auto">
        <EmptyState
          title="未找到该选题记录"
          description={`ID 为「${id}」的选题不存在或已被删除。你可以返回选题看板查看现有选题。`}
        >
          <Button onClick={() => router.push("/ideas")} className="mt-2">
            <ArrowLeft className="size-4" /> 返回选题看板
          </Button>
        </EmptyState>
      </div>
    );
  }

  return <IdeaDetailContent key={idea.id} idea={idea} />;
}
