"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select } from "../../components/ui/select";
import { useWorkbench } from "../../hooks/use-workbench";
import { toast } from "../../components/ui/sonner";
import { platforms, type Platform, type Priority, type InboxItem, type Competitor, type Idea, type ContentItem } from "../../types";
import { validUrl } from "../../lib/utils";

export type AddKind = "添加链接" | "记录灵感" | "添加对手" | "新建选题" | "新建内容";

function QuickAddForm({
  kind,
  onClose,
}: {
  kind: AddKind;
  onClose: () => void;
}) {
  const { dispatch } = useWorkbench();

  // Initialized per kind
  const [title, setTitle] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [content, setContent] = React.useState("");
  const [note, setNote] = React.useState("");
  const [platform, setPlatform] = React.useState<Platform>("小红书");
  const [priority, setPriority] = React.useState<Priority>("A");
  const [handle, setHandle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [assignee, setAssignee] = React.useState("林小北");
  const [tags, setTags] = React.useState("AI 工具, 内容创作");
  const [error, setError] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (kind === "添加链接") {
      if (!url.trim()) {
        setError("请输入链接地址");
        return;
      }
      if (!validUrl(url.trim())) {
        setError("请输入合法的 HTTP(S) URL（如 https://example.com）");
        return;
      }
      const finalTitle = title.trim() || `网页链接收藏: ${new URL(url.trim()).hostname}`;
      const newItem: InboxItem = {
        id: `inbox-${Date.now()}`,
        title: finalTitle,
        summary: "刚刚通过链接添加的内容，等待 AI 深度分析。",
        originalContent: `链接地址: ${url.trim()}\n${note.trim() ? `备注: ${note.trim()}` : ""}`,
        note: note.trim() || "待阅读消化",
        url: url.trim(),
        platform,
        sourceType: "快速添加",
        captureMethod: "快速添加",
        author: "外部网页",
        thumbnail: "#dbe7f5",
        aiScore: null,
        status: "待处理",
        tags: tags.split(/[,，\s]+/).filter(Boolean),
        capturedAt: new Date().toISOString(),
        metrics: { views: 0, likes: 0 },
        mode: "链接",
      };
      dispatch({ type: "addInbox", item: newItem });
      toast.success("链接已成功加入灵感 Inbox！", finalTitle);
      onClose();
    } else if (kind === "记录灵感") {
      if (!content.trim() && !title.trim()) {
        setError("灵感内容或标题不能为空");
        return;
      }
      const finalTitle = title.trim() || content.trim().slice(0, 24) + "...";
      const newItem: InboxItem = {
        id: `inbox-${Date.now()}`,
        title: finalTitle,
        summary: content.trim().slice(0, 60) + "...",
        originalContent: content.trim(),
        note: note.trim() || "快速记录的灵感想法",
        url: "",
        platform,
        sourceType: "自己想到",
        captureMethod: "自己想到",
        author: "我",
        thumbnail: "#e5ddd5",
        aiScore: null,
        status: "待处理",
        tags: tags.split(/[,，\s]+/).filter(Boolean),
        capturedAt: new Date().toISOString(),
        metrics: { views: 0, likes: 0 },
        mode: "选中内容",
      };
      dispatch({ type: "addInbox", item: newItem });
      toast.success("灵感已成功保存至 Inbox！", finalTitle);
      onClose();
    } else if (kind === "添加对手") {
      if (!title.trim()) {
        setError("请输入对手创作者名称");
        return;
      }
      const newCompetitor: Competitor = {
        id: `competitor-${Date.now()}`,
        name: title.trim(),
        handle: handle.trim() ? (handle.startsWith("@") ? handle.trim() : `@${handle.trim()}`) : `@${title.trim().toLowerCase().replace(/\s+/g, "")}`,
        platform,
        avatar: title.trim().slice(0, 1),
        description: description.trim() || "新添加的监控账号，系统将跟进内容动态。",
        followers: 10000,
        posts7d: 0,
        avgViews: 0,
        avgEngagement: 0,
        outlierIndex: 1.0,
        recentTopics: tags.split(/[,，\s]+/).filter(Boolean),
        updatedAt: new Date().toISOString(),
        monitored: true,
        recentContent: [],
        trend: Array.from({ length: 14 }, (_, j) => ({ date: `8/${22 + j}`, views: 10000, baseline: 10000 })),
        hooks: [{ label: "待分析", value: 100 }],
        insights: ["新添加监控账号，将在下个周期同步内容与表现分析。"],
      };
      dispatch({ type: "addCompetitor", item: newCompetitor });
      toast.success("已添加对手监控账号！", title.trim());
      onClose();
    } else if (kind === "新建选题") {
      if (!title.trim()) {
        setError("请输入选题标题");
        return;
      }
      const newIdea: Idea = {
        id: `idea-${Date.now()}`,
        title: title.trim(),
        angle: note.trim() || "从真实用户场景切入",
        priority,
        platforms: [platform],
        status: "待筛选",
        tags: tags.split(/[,，\s]+/).filter(Boolean),
        sourceIds: [],
        score: 85,
        core: content.trim() || "内容核心价值点与核心论据待进一步丰富。",
        audience: "关注该领域的精准受众群体",
        cta: "欢迎在评论区交流你的看法",
        titles: [title.trim()],
        outline: "",
        hook: "",
        script: "",
        materials: "",
        strategy: "首发核心平台验证数据，再多平台矩阵分发。",
      };
      dispatch({ type: "addIdea", item: newIdea });
      toast.success("已创建新选题！", title.trim());
      onClose();
    } else if (kind === "新建内容") {
      if (!title.trim()) {
        setError("请输入内容标题");
        return;
      }
      const newContent: ContentItem = {
        id: `content-${Date.now()}`,
        title: title.trim(),
        platform,
        status: "待制作",
        scheduledAt: scheduledAt || new Date(Date.now() + 86400000).toISOString(),
        assignee: assignee.trim() || "林小北",
      };
      dispatch({ type: "addContent", item: newContent });
      toast.success("已创建内容计划，已同步至发布日历！", title.trim());
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {kind === "添加链接" && (
        <>
          <div>
            <label className="block text-xs font-semibold text-[#40506a] mb-1.5">链接地址 (URL) *</label>
            <Input
              autoFocus
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#40506a] mb-1.5">标题 (可选，留空将自动提取)</label>
            <Input
              placeholder="给这条链接起个标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">来源平台</label>
              <Select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
                {platforms.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">标签 (逗号分隔)</label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#40506a] mb-1.5">我的备注 / 思考</label>
            <Textarea
              placeholder="为什么收藏这条？有什么值得借鉴？"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </>
      )}

      {kind === "记录灵感" && (
        <>
          <div>
            <label className="block text-xs font-semibold text-[#40506a] mb-1.5">灵感标题 (可选)</label>
            <Input
              placeholder="一句话概括核心灵感..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#40506a] mb-1.5">灵感正文 / 思考内容 *</label>
            <Textarea
              autoFocus
              placeholder="详细记录你的想法、观察到的现象或内容切入点..."
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">目标平台</label>
              <Select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
                {platforms.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">标签</label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
          </div>
        </>
      )}

      {kind === "添加对手" && (
        <>
          <div>
            <label className="block text-xs font-semibold text-[#40506a] mb-1.5">创作者名称 / 账号名 *</label>
            <Input
              autoFocus
              placeholder="如：科技新知、少数派..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">主页平台</label>
              <Select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
                {platforms.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">Handle / 账号ID</label>
              <Input placeholder="@creator..." value={handle} onChange={(e) => setHandle(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#40506a] mb-1.5">定位与关注重点</label>
            <Textarea
              placeholder="该创作者的核心方向、值得跟踪的特点..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </>
      )}

      {kind === "新建选题" && (
        <>
          <div>
            <label className="block text-xs font-semibold text-[#40506a] mb-1.5">选题标题 *</label>
            <Input
              autoFocus
              placeholder="吸引人的候选标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">优先级</label>
              <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                <option value="S">S 级 (高潜力首发)</option>
                <option value="A">A 级 (标准主力)</option>
                <option value="B">B 级 (常态备选)</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">首选发布平台</label>
              <Select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
                {platforms.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#40506a] mb-1.5">核心论点 / 价值主张</label>
            <Textarea
              placeholder="这条内容要向受众传达什么最有价值的信息？"
              rows={2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </>
      )}

      {kind === "新建内容" && (
        <>
          <div>
            <label className="block text-xs font-semibold text-[#40506a] mb-1.5">内容名称 / 执行任务 *</label>
            <Input
              autoFocus
              placeholder="如：AI 个人知识管理指南 视频排期..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">分发平台</label>
              <Select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
                {platforms.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">负责人</label>
              <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#40506a] mb-1.5">预计发布日期与时间</label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
        </>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button type="submit">
          确认添加
        </Button>
      </DialogFooter>
    </form>
  );
}

export function QuickAddDialog({
  kind,
  onClose,
}: {
  kind: AddKind | null;
  onClose: () => void;
}) {
  if (!kind) return null;

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent title={kind} description={`快速在系统中${kind}`}>
        <DialogHeader>
          <DialogTitle>{kind}</DialogTitle>
          <DialogDescription>
            {kind === "添加链接" && "输入文章、视频或推文链接，支持主流公开平台。"}
            {kind === "记录灵感" && "把脑海中闪现的灵感想法快速记录下来，稍后交由 AI 整理。"}
            {kind === "添加对手" && "添加同行博主或竞对账号，跟踪爆款内容与表达套路。"}
            {kind === "新建选题" && "直接录入准备制作的内容选题与优先级。"}
            {kind === "新建内容" && "为已确定的选题或主题制定制作与排期计划。"}
          </DialogDescription>
        </DialogHeader>

        <QuickAddForm key={kind} kind={kind} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
