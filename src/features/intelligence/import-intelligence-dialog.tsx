"use client";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { useWorkbench } from "../../hooks/use-workbench";
import { toast } from "../../components/ui/sonner";
import { platforms, type Platform, type IntelligenceItem } from "../../types";

export function ImportIntelligenceDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (id: string) => void;
}) {
  const { dispatch } = useWorkbench();
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [platform, setPlatform] = React.useState<Platform>("小红书");
  const [author, setAuthor] = React.useState("外部创作者");
  const [url, setUrl] = React.useState("");
  const [tags, setTags] = React.useState("AI 工具, 知识管理");
  const [score, setScore] = React.useState("85");
  const [error, setError] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("请输入情报标题");
      return;
    }
    if (!content.trim()) {
      setError("请输入原始内容详情");
      return;
    }

    const newItem: IntelligenceItem = {
      id: `intel-${Date.now()}`,
      title: title.trim(),
      summary: content.trim().slice(0, 80) + "...",
      originalContent: content.trim(),
      note: "手动导入的高价值情报",
      url: url.trim() || "https://example.com/manual-import",
      platform,
      sourceType: "手动发现",
      captureMethod: "手动收藏",
      author: author.trim() || "外部创作者",
      thumbnail: "#dbe7f5",
      aiScore: Number(score) || 85,
      status: "待分析",
      tags: tags.split(/[,，\s]+/).filter(Boolean),
      capturedAt: new Date().toISOString(),
      metrics: { views: 5000, likes: 200 },
      analysis: {
        summary: content.trim().slice(0, 80) + "...",
        core: "结合真实场景提供可验证的论点与案例支持。",
        reasons: ["核心论据扎实", "有清晰的受众切入点"],
        angles: ["实践案例深度复盘", "方法论与行动指南"],
      },
    };

    dispatch({ type: "addIntelligence", item: newItem });
    toast.success("已成功导入情报！", title.trim());
    onOpenChange(false);
    setTitle("");
    setContent("");
    setUrl("");
    onSuccess?.(newItem.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="导入全网情报" description="手动添加优质图文、深度文章或行业案例">
        <DialogHeader>
          <DialogTitle>导入新情报记录</DialogTitle>
          <DialogDescription>
            录入内容后系统将自动进行数据沉淀与结构化分类，支持后续一键转为选题。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#40506a] mb-1.5">情报标题 *</label>
            <Input
              autoFocus
              placeholder="例如：短视频时代，深度内容如何破局..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">发布平台</label>
              <Select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
                {platforms.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">作者 / 创作者</label>
              <Input
                placeholder="作者或博主名字..."
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#40506a] mb-1.5">原始链接</label>
            <Input
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#40506a] mb-1.5">内容详情 / 核心论点 *</label>
            <Textarea
              rows={4}
              placeholder="详细记录该情报的主要内容、数据论证或逻辑框架..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">标签 (逗号分隔)</label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">初始 AI 评估分 (0-100)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">
              确认导入
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
