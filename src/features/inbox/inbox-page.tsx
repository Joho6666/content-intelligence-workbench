"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Inbox,
  Search,
  Plus,
  Link as LinkIcon,
  FileText,
  Bookmark,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Lightbulb,
  LayoutGrid,
  List,
  Clock,
  Loader2,
} from "lucide-react";
import { useWorkbench } from "../../hooks/use-workbench";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { toast } from "../../components/ui/sonner";
import {
  PageHead,
  Stat,
} from "../../components/shared/legacy";
import {
  PlatformBadge,
  StatusBadge,
  TagList,
  MockBoundary,
  RightDetailPanel,
  EmptyState,
} from "../../components/shared/primitives";
import { platforms, type Platform, type InboxItem } from "../../types";
import { validUrl, formatDate } from "../../lib/utils";

export default function InboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, dispatch } = useWorkbench();

  // Search and Filter states
  const [search, setSearch] = React.useState("");
  const [selectedPlatform, setSelectedPlatform] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState("");
  const [selectedMode, setSelectedMode] = React.useState("");
  const [selectedSource, setSelectedSource] = React.useState("");
  const [selectedCaptureMethod, setSelectedCaptureMethod] = React.useState("");
  const [selectedTag, setSelectedTag] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"time-desc" | "time-asc" | "score-desc" | "score-asc">("time-desc");
  const [viewMode, setViewMode] = React.useState<"list" | "card">("list");

  // Selection state (from URL ?item=<id> or local fallback)
  const itemParam = searchParams.get("item");
  const [localSelectedId, setLocalSelectedId] = React.useState<string | null>(null);
  const selectedId = localSelectedId !== null ? localSelectedId : itemParam;

  const selectItem = React.useCallback((id: string | null) => {
    setLocalSelectedId(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("item", id);
    } else {
      params.delete("item");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Add Item Modal state
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [createMode, setCreateMode] = React.useState<"链接" | "选中内容" | "我的重点">("链接");
  const [formTitle, setFormTitle] = React.useState("");
  const [formUrl, setFormUrl] = React.useState("");
  const [formContent, setFormContent] = React.useState("");
  const [formNote, setFormNote] = React.useState("");
  const [formPlatform, setFormPlatform] = React.useState<Platform>("小红书");
  const [formTags, setFormTags] = React.useState("AI 工具, 灵感");
  const [formError, setFormError] = React.useState("");

  // AI Analysis Loading simulation state per item
  const [analyzingIds, setAnalyzingIds] = React.useState<Set<string>>(new Set());

  // Handle AI analysis simulation
  const handleRunAnalysis = (item: InboxItem) => {
    if (analyzingIds.has(item.id)) return;

    setAnalyzingIds((prev) => new Set(prev).add(item.id));
    toast.info("正在执行 AI 深度分析...", "提炼核心论点与选题角度");

    setTimeout(() => {
      dispatch({
        type: "analyze",
        id: item.id,
        patch: {
          aiScore: item.aiScore || 88,
          status: item.status === "待处理" ? "高潜" : item.status,
          analysis: {
            summary: item.originalContent.slice(0, 80) + "……",
            core: "以真实使用经验切入，验证可复制的方法论框架。",
            reasons: ["切入角度清晰易引起目标受众共鸣", "具备明确的实操步骤与对比证据", "适合进一步拆解成系列图文或脚本"],
            angles: ["从痛点切入：为什么大多数人执行受阻", "三步拆解：我是如何把它变成工作流的", "避坑复盘：实施过程中的两个常见误区"],
          },
        },
      });
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      toast.success("AI 分析完成！", `已为「${item.title.slice(0, 16)}」生成分析报告`);
    }, 1000);
  };

  // Filter items
  const filteredItems = React.useMemo(() => {
    return state.inbox.filter((item) => {
      if (search) {
        const query = search.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchContent = item.originalContent.toLowerCase().includes(query);
        const matchNote = item.note.toLowerCase().includes(query);
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchTitle && !matchContent && !matchNote && !matchTags) return false;
      }
      if (selectedPlatform && item.platform !== selectedPlatform) return false;
      if (selectedStatus && item.status !== selectedStatus) return false;
      if (selectedMode && item.mode !== selectedMode) return false;
      if (selectedSource && item.sourceType !== selectedSource) return false;
      if (selectedCaptureMethod && item.captureMethod !== selectedCaptureMethod) return false;
      if (selectedTag && !item.tags.includes(selectedTag)) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === "time-desc") return new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime();
      if (sortBy === "time-asc") return new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime();
      if (sortBy === "score-desc") return (b.aiScore || 0) - (a.aiScore || 0);
      if (sortBy === "score-asc") return (a.aiScore || 0) - (b.aiScore || 0);
      return 0;
    });
  }, [state.inbox, search, selectedPlatform, selectedStatus, selectedMode, selectedSource, selectedCaptureMethod, selectedTag, sortBy]);

  const availableTags = React.useMemo(
    () => Array.from(new Set(state.inbox.flatMap((item) => item.tags))).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [state.inbox]
  );

  const selectedItem = state.inbox.find((x) => x.id === selectedId) || null;

  // Check if current selected item already has an associated idea
  const associatedIdea = React.useMemo(() => {
    if (!selectedItem) return null;
    return state.ideas.find((idea) =>
      idea.sourceIds.some((s) => s.kind === "inbox" && s.id === selectedItem.id)
    );
  }, [selectedItem, state.ideas]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (createMode === "链接") {
      if (!formUrl.trim()) {
        setFormError("请输入链接地址");
        return;
      }
      if (!validUrl(formUrl.trim())) {
        setFormError("请输入合法的 HTTP(S) URL（例如 https://example.com）");
        return;
      }
    } else if (createMode === "选中内容") {
      if (!formContent.trim()) {
        setFormError("文本内容不能为空");
        return;
      }
    } else {
      if (!formTitle.trim() && !formContent.trim()) {
        setFormError("标题或重点笔记不能为空");
        return;
      }
    }

    const title =
      formTitle.trim() ||
      (createMode === "链接"
        ? `收藏链接: ${new URL(formUrl.trim()).hostname}`
        : formContent.trim().slice(0, 24) + "...");

    const newItem: InboxItem = {
      id: `inbox-${Date.now()}`,
      title,
      summary: formContent.trim() ? formContent.trim().slice(0, 60) + "..." : "外部链接内容，点击进行 AI 分析。",
      originalContent: formContent.trim() || `链接: ${formUrl.trim()}\n${formNote.trim() ? `备注: ${formNote.trim()}` : ""}`,
      note: formNote.trim() || "待阅读消化",
      url: formUrl.trim(),
      platform: formPlatform,
      sourceType: createMode === "链接" ? "手动发现" : "自己想到",
      captureMethod: createMode === "链接" ? "手动收藏" : "自己想到",
      author: createMode === "链接" ? "外部来源" : "我",
      thumbnail: "#dbe7f5",
      aiScore: null,
      status: "待处理",
      tags: formTags.split(/[,，\s]+/).filter(Boolean),
      capturedAt: new Date().toISOString(),
      metrics: { views: 0, likes: 0 },
      mode: createMode,
    };

    dispatch({ type: "addInbox", item: newItem });
    toast.success("已成功加入灵感 Inbox！", title);
    handleRunAnalysis(newItem);
    setShowAddModal(false);
    setFormTitle("");
    setFormUrl("");
    setFormContent("");
    setFormNote("");
    selectItem(newItem.id);
  };

  const handleConvertToIdea = (item: InboxItem) => {
    if (associatedIdea) {
      router.push(`/ideas/${associatedIdea.id}`);
      return;
    }
    dispatch({ type: "convert", source: { kind: "inbox", id: item.id } });
    toast.success("已成功将灵感转化为选题！", item.title);
  };

  return (
    <MockBoundary>
      <PageHead
        eyebrow="COLLECTION & IDEATION"
        title={
          <>
            灵感 Inbox <span className="sparkle">✦</span>
          </>
        }
        desc="把零散的想法、链接与高价值片段快速收集，借助 AI 解析为可执行的选题方向。"
        action={
          <button
            type="button"
            className="primary inline-flex items-center gap-1.5 rounded-lg bg-[#152039] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#203052] transition-colors"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} /> 收集灵感
          </button>
        }
      />

      {/* Stats Bar */}
      <div className="stats">
        <Stat icon={Inbox} label="灵感总数" value={String(state.inbox.length)} delta="24%" sub="全部收集记录" />
        <Stat
          icon={Clock}
          label="待处理"
          value={String(state.inbox.filter((x) => x.status === "待处理").length)}
          delta="8%"
          color="#f1a535"
          sub="需分类或分析"
        />
        <Stat
          icon={Bookmark}
          label="高潜力"
          value={String(state.inbox.filter((x) => x.status === "高潜").length)}
          delta="32%"
          color="#856eea"
          sub="适合快速做选题"
        />
        <Stat
          icon={CheckCircle2}
          label="已转选题"
          value={String(state.inbox.filter((x) => x.status === "已转选题").length)}
          delta="40%"
          color="#37b986"
          sub="已进入生产排期"
        />
      </div>

      {/* Filters and Search Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e7ebf2] bg-white p-3 shadow-2xs">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8791a7]" />
            <Input
              placeholder="搜索灵感标题、原文、笔记、标签..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <Select value={selectedMode} onChange={(e) => setSelectedMode(e.target.value)} className="w-32">
            <option value="">全部模式</option>
            <option value="链接">链接模式</option>
            <option value="选中内容">选中内容</option>
            <option value="我的重点">我的重点</option>
          </Select>

          <Select aria-label="来源渠道" value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)} className="w-32">
            <option value="">来源渠道</option>
            <option value="手动发现">手动发现</option>
            <option value="对手监控">对手监控</option>
            <option value="AI 搜索">AI 搜索</option>
            <option value="RSS">RSS</option>
            <option value="自己想到">自己想到</option>
          </Select>

          <Select aria-label="采集方式" value={selectedCaptureMethod} onChange={(e) => setSelectedCaptureMethod(e.target.value)} className="w-32">
            <option value="">采集方式</option>
            <option value="手动收藏">手动收藏</option>
            <option value="快速添加">快速添加</option>
            <option value="浏览器插件">浏览器插件</option>
            <option value="自己想到">自己想到</option>
          </Select>

          <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="w-32">
            <option value="">全部状态</option>
            <option value="待处理">待处理</option>
            <option value="待分析">待分析</option>
            <option value="高潜">高潜</option>
            <option value="已转选题">已转选题</option>
            <option value="已归档">已归档</option>
            <option value="已忽略">已忽略</option>
          </Select>

          <Select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)} className="w-32">
            <option value="">全部平台</option>
            {platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>

          <Select aria-label="标签" value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} className="w-32">
            <option value="">全部标签</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </Select>

          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="w-36">
            <option value="time-desc">时间倒序 (最新)</option>
            <option value="time-asc">时间正序 (最早)</option>
            <option value="score-desc">AI 评分最高</option>
            <option value="score-asc">AI 评分最低</option>
          </Select>
        </div>

        <div className="flex items-center gap-1.5 border-l border-[#e8edf4] pl-3">
          <Button
            size="icon"
            variant={viewMode === "list" ? "secondary" : "ghost"}
            aria-label="列表视图"
            onClick={() => setViewMode("list")}
          >
            <List size={16} />
          </Button>
          <Button
            size="icon"
            variant={viewMode === "card" ? "secondary" : "ghost"}
            aria-label="卡片视图"
            onClick={() => setViewMode("card")}
          >
            <LayoutGrid size={16} />
          </Button>
        </div>
      </div>

      {/* Main Content Area with Split View when Item Selected */}
      <div className="flex items-start gap-5">
        <div className="flex-1 min-w-0">
          {filteredItems.length === 0 ? (
            <EmptyState
              title="Inbox 中没有匹配的灵感"
              description={search || selectedStatus || selectedPlatform || selectedMode || selectedSource || selectedCaptureMethod || selectedTag ? "尝试清空筛选条件查看全部内容。" : "点击右上角「收集灵感」记录你的第一条想法。"}
            >
              {(search || selectedStatus || selectedPlatform || selectedMode || selectedSource || selectedCaptureMethod || selectedTag) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setSelectedPlatform("");
                    setSelectedStatus("");
                    setSelectedMode("");
                    setSelectedSource("");
                    setSelectedCaptureMethod("");
                    setSelectedTag("");
                  }}
                >
                  清除所有筛选
                </Button>
              )}
            </EmptyState>
          ) : viewMode === "list" ? (
            <div className="divide-y divide-[#edf0f5] rounded-xl border border-[#e7ebf2] bg-white shadow-2xs">
              {filteredItems.map((item) => {
                const isSelected = item.id === selectedId;
                const isAnalyzing = analyzingIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => selectItem(item.id)}
                    className={`group flex items-start gap-4 p-4 transition-colors cursor-pointer ${
                      isSelected ? "bg-[#eaf1ff]/40" : "hover:bg-[#fbfcfe]"
                    }`}
                  >
                    <div
                      className="size-11 rounded-lg shrink-0 flex items-center justify-center text-xs font-semibold text-white shadow-2xs"
                      style={{ background: item.thumbnail || "#3378f6" }}
                    >
                      {item.mode === "链接" ? <LinkIcon size={16} className="text-[#152039]" /> : <FileText size={16} className="text-[#152039]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <PlatformBadge value={item.platform} />
                        <span className="text-[11px] font-medium text-[#8791a7] bg-[#f4f6fa] px-1.5 py-0.5 rounded">
                          {item.mode}
                        </span>
                        <StatusBadge value={item.status} />
                        {item.aiScore !== null && (
                          <span className="text-[11px] font-bold text-[#3378f6] bg-[#edf4ff] px-2 py-0.5 rounded">
                            {item.aiScore}分
                          </span>
                        )}
                        <span className="ml-auto text-xs text-[#9aa4b6] whitespace-nowrap">
                          {formatDate(item.capturedAt)}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-[#152039] group-hover:text-[#3378f6] transition-colors leading-snug line-clamp-1 mb-1">
                        {item.title}
                      </h3>

                      <p className="text-xs text-[#64748b] line-clamp-1 leading-relaxed mb-2">
                        {item.originalContent}
                      </p>

                      <div className="flex items-center gap-2">
                        <TagList tags={item.tags} />
                        {item.note && (
                          <span className="text-[11px] text-[#8791a7] bg-[#f9fafb] px-2 py-0.5 rounded border border-[#edf0f5] line-clamp-1 max-w-xs">
                            备注: {item.note}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-center pl-2" onClick={(e) => e.stopPropagation()}>
                      {!item.analysis && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2.5 text-[#3378f6] border-[#d8e6ff] hover:bg-[#edf4ff]"
                          disabled={isAnalyzing}
                          onClick={() => handleRunAnalysis(item)}
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 size={12} className="animate-spin" /> 分析中
                            </>
                          ) : (
                            <>
                              <Sparkles size={12} /> AI 分析
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs h-7 px-2.5"
                        onClick={() => handleConvertToIdea(item)}
                      >
                        {item.status === "已转选题" ? "查看选题" : "转选题"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredItems.map((item) => {
                const isSelected = item.id === selectedId;

                return (
                  <div
                    key={item.id}
                    onClick={() => selectItem(item.id)}
                    className={`flex flex-col justify-between rounded-xl border p-4 bg-white shadow-2xs transition-all cursor-pointer ${
                      isSelected ? "border-[#3378f6] ring-1 ring-[#3378f6]" : "border-[#e7ebf2] hover:border-[#8db5ff] hover:-translate-y-0.5"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <PlatformBadge value={item.platform} />
                          <span className="text-[11px] text-[#8791a7] bg-[#f4f6fa] px-1.5 py-0.5 rounded font-medium">
                            {item.mode}
                          </span>
                        </div>
                        <StatusBadge value={item.status} />
                      </div>

                      <h3 className="text-sm font-semibold text-[#152039] line-clamp-2 leading-snug mb-2">
                        {item.title}
                      </h3>

                      <p className="text-xs text-[#64748b] line-clamp-3 leading-relaxed mb-3">
                        {item.originalContent}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#edf0f5] mt-2">
                      <div className="flex items-center justify-between text-xs text-[#9aa4b6] mb-2.5">
                        <span>{formatDate(item.capturedAt)}</span>
                        {item.aiScore !== null && (
                          <span className="font-bold text-[#3378f6]">AI {item.aiScore}分</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                        <TagList tags={item.tags.slice(0, 2)} />
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs h-7 px-2"
                          onClick={() => handleConvertToIdea(item)}
                        >
                          {item.status === "已转选题" ? "查看选题" : "转选题"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Detail Panel when selected */}
        {selectedItem && (
          <RightDetailPanel
            title={selectedItem.title}
            onClose={() => selectItem(null)}
          >
            <div className="space-y-4 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <PlatformBadge value={selectedItem.platform} />
                <StatusBadge value={selectedItem.status} />
                <span className="text-xs text-[#8791a7] bg-[#f4f6fa] px-2 py-0.5 rounded">
                  采集模式: {selectedItem.mode}
                </span>
                {selectedItem.aiScore !== null && (
                  <span className="text-xs font-bold text-[#3378f6] bg-[#edf4ff] px-2 py-0.5 rounded">
                    AI 评分: {selectedItem.aiScore}
                  </span>
                )}
              </div>

              {selectedItem.url && (
                <div className="flex items-center gap-1.5 text-xs text-[#3378f6] break-all bg-[#f4f7fc] p-2.5 rounded-lg border border-[#e8edf4]">
                  <ExternalLink size={14} className="shrink-0" />
                  <a
                    href={selectedItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline line-clamp-1"
                  >
                    {selectedItem.url}
                  </a>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-[#8791a7] uppercase tracking-wider mb-1.5">原文内容</h4>
                <div className="rounded-lg border border-[#edf0f5] bg-[#fbfcfe] p-3 text-xs leading-relaxed text-[#334155] whitespace-pre-wrap max-h-48 overflow-y-auto thin-scroll">
                  {selectedItem.originalContent}
                </div>
              </div>

              {selectedItem.note && (
                <div>
                  <h4 className="text-xs font-semibold text-[#8791a7] uppercase tracking-wider mb-1.5">我的备注</h4>
                  <div className="rounded-lg border border-[#edf0f5] bg-[#fffbf0] p-2.5 text-xs leading-relaxed text-[#854d0e]">
                    {selectedItem.note}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-[#8791a7] uppercase tracking-wider mb-1.5">关联标签</h4>
                <TagList tags={selectedItem.tags} />
              </div>

              {/* AI Analysis Section */}
              <div className="rounded-xl border border-[#d8e6ff] bg-[#f3f7ff] p-4 text-left">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-[#286cf2]">
                    <Sparkles size={16} /> AI 智能解析
                  </div>
                  {!selectedItem.analysis && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs h-7"
                      disabled={analyzingIds.has(selectedItem.id)}
                      onClick={() => handleRunAnalysis(selectedItem)}
                    >
                      {analyzingIds.has(selectedItem.id) ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> 分析中...
                        </>
                      ) : (
                        "立即分析"
                      )}
                    </Button>
                  )}
                </div>

                {selectedItem.analysis ? (
                  <div className="space-y-3 text-xs text-[#40506a]">
                    <div>
                      <span className="font-semibold text-[#152039] block mb-0.5">核心论点：</span>
                      <p className="m-0 leading-relaxed text-[#334155]">{selectedItem.analysis.core}</p>
                    </div>

                    <div>
                      <span className="font-semibold text-[#152039] block mb-0.5">入选理由：</span>
                      <ul className="list-disc list-inside space-y-0.5 text-[#475569]">
                        {selectedItem.analysis.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="font-semibold text-[#152039] block mb-0.5">推荐切入角度：</span>
                      <ul className="list-disc list-inside space-y-0.5 text-[#475569]">
                        {selectedItem.analysis.angles.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#64748b] m-0">
                    该内容尚未生成 AI 解析。点击「立即分析」提炼核心论点、爆款原因与选题切入角度。
                  </p>
                )}
              </div>

              {/* State Transitions & Actions */}
              <div className="pt-2 border-t border-[#edf0f5] space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant={selectedItem.status === "高潜" ? "secondary" : "outline"}
                    className="text-xs"
                    onClick={() => {
                      dispatch({ type: "status", kind: "inbox", ids: [selectedItem.id], status: "高潜" });
                      toast.success("已标记为高潜力灵感！");
                    }}
                  >
                    标为高潜
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedItem.status === "已归档" ? "secondary" : "outline"}
                    className="text-xs"
                    onClick={() => {
                      dispatch({ type: "status", kind: "inbox", ids: [selectedItem.id], status: "已归档" });
                      toast.info("灵感已归档");
                    }}
                  >
                    归档
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedItem.status === "已忽略" ? "secondary" : "outline"}
                    className="text-xs text-slate-500"
                    onClick={() => {
                      dispatch({ type: "status", kind: "inbox", ids: [selectedItem.id], status: "已忽略" });
                      toast.info("已忽略该灵感");
                    }}
                  >
                    忽略
                  </Button>
                </div>

                <Button
                  className="w-full justify-center bg-[#3378f6] hover:bg-[#2563eb]"
                  onClick={() => handleConvertToIdea(selectedItem)}
                >
                  <Lightbulb size={16} />
                  {associatedIdea || selectedItem.status === "已转选题"
                    ? "已转为选题 · 查看选题详情"
                    : "加入选题并创建内容任务"}
                </Button>
              </div>
            </div>
          </RightDetailPanel>
        )}
      </div>

      {/* Manual Collection Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent title="收集灵感" description="支持通过链接、文本片段或思考笔记添加至灵感 Inbox">
          <DialogHeader>
            <DialogTitle>收集灵感至 Inbox</DialogTitle>
            <DialogDescription>
              选择收集模式，保存后将自动进入待处理池，并可随时触发 AI 深度分析。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="flex rounded-lg bg-[#f0f3f8] p-1 border border-[#e8edf4]">
              {(["链接", "选中内容", "我的重点"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setCreateMode(m); setFormError(""); }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    createMode === m ? "bg-white text-[#152039] font-semibold shadow-xs" : "text-[#64748b] hover:text-[#152039]"
                  }`}
                >
                  {m === "链接" ? "链接模式" : m === "选中内容" ? "文本摘录" : "深度重点"}
                </button>
              ))}
            </div>

            {formError && (
              <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
                {formError}
              </div>
            )}

            {createMode === "链接" && (
              <div>
                <label className="block text-xs font-semibold text-[#40506a] mb-1.5">公开文章/视频链接 *</label>
                <Input
                  autoFocus
                  placeholder="https://..."
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">
                {createMode === "链接" ? "灵感标题 (可选，留空将自动提取)" : "灵感标题"}
              </label>
              <Input
                placeholder="给这条灵感起个标题..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            {createMode !== "链接" && (
              <div>
                <label className="block text-xs font-semibold text-[#40506a] mb-1.5">
                  {createMode === "选中内容" ? "摘录内容 / 核心文本 *" : "重点思考与分析 *"}
                </label>
                <Textarea
                  rows={4}
                  placeholder="粘贴或输入你看到的好内容、好句子、数据观点..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#40506a] mb-1.5">涉及平台</label>
                <Select value={formPlatform} onChange={(e) => setFormPlatform(e.target.value as Platform)}>
                  {platforms.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#40506a] mb-1.5">标签 (逗号分隔)</label>
                <Input value={formTags} onChange={(e) => setFormTags(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">我的备注与后续动作</label>
              <Textarea
                rows={2}
                placeholder="为什么关注这个？可以怎么用在自己的选题中？"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                取消
              </Button>
              <Button type="submit">
                保存至 Inbox
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MockBoundary>
  );
}
