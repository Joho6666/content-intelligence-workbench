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
import { useWorkbench } from "../../hooks/use-workbench";
import { toast } from "../../components/ui/sonner";
import { platforms, type Platform, type Idea, type ContentItem } from "../../types";

function SchedulePublishingForm({
  idea,
  onClose,
}: {
  idea: Idea;
  onClose: () => void;
}) {
  const { dispatch } = useWorkbench();

  const [title, setTitle] = React.useState(idea.title);
  const [platform, setPlatform] = React.useState<Platform>(idea.platforms[0] || "小红书");
  const [scheduledAt, setScheduledAt] = React.useState(() => {
    const d = new Date(Date.now() + 2 * 86400000);
    d.setHours(19, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [assignee, setAssignee] = React.useState("林小北");
  const [error, setError] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("请输入内容发布标题");
      return;
    }
    if (!scheduledAt) {
      setError("请选择预计发布时间");
      return;
    }

    const contentItem: ContentItem = {
      id: `content-${Date.now()}`,
      title: title.trim(),
      platform,
      status: "待发布",
      scheduledAt: new Date(scheduledAt).toISOString(),
      ideaId: idea.id,
      assignee: assignee.trim() || "林小北",
    };

    dispatch({ type: "addContent", item: contentItem });
    dispatch({ type: "editIdea", id: idea.id, patch: { status: "待发布" } });

    toast.success("已成功加入发布计划！", `${title.trim()} · 计划于 ${scheduledAt.replace("T", " ")} 发布`);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-[#40506a] mb-1.5">发布内容标题 *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入排期发布标题..."
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
          <label className="block text-xs font-semibold text-[#40506a] mb-1.5">负责人</label>
          <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#40506a] mb-1.5">预计发布日期与时间 *</label>
        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button type="submit">
          确认排期
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SchedulePublishingDialog({
  idea,
  open,
  onOpenChange,
}: {
  idea: Idea;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="加入发布计划" description="为选题设定分发平台与预计排期时间">
        <DialogHeader>
          <DialogTitle>制定发布计划与排期</DialogTitle>
          <DialogDescription>
            排期信息将自动同步到「发布日历 / 内容计划」中，便于团队协作与进度跟踪。
          </DialogDescription>
        </DialogHeader>

        <SchedulePublishingForm
          key={idea.id}
          idea={idea}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
