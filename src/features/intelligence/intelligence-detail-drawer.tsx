"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import { useWorkbench } from "../../hooks/use-workbench";
import { Button } from "../../components/ui/button";
import { toast } from "../../components/ui/sonner";
import {
  PlatformBadge,
  StatusBadge,
  TagList,
  RightDetailPanel,
} from "../../components/shared/primitives";
import type { IntelligenceItem } from "../../types";
import { formatDate } from "../../lib/utils";

export function IntelligenceDetailDrawer({
  item,
  onClose,
}: {
  item: IntelligenceItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const { state, dispatch } = useWorkbench();

  const associatedIdea = React.useMemo(() => {
    return state.ideas.find((idea) =>
      idea.sourceIds.some((s) => s.kind === "intelligence" && s.id === item.id)
    );
  }, [item.id, state.ideas]);

  return (
    <RightDetailPanel title={item.title} onClose={onClose}>
      <div className="space-y-4 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <PlatformBadge value={item.platform} />
          <StatusBadge value={item.status} />
          {item.aiScore !== null && (
            <span className="text-xs font-bold text-[#3378f6] bg-[#edf4ff] px-2 py-0.5 rounded">
              AI 评分: {item.aiScore}
            </span>
          )}
          <span className="text-xs text-[#8791a7]">
            {item.author} · {formatDate(item.capturedAt)}
          </span>
        </div>

        {item.url && (
          <div className="flex items-center gap-1.5 text-xs text-[#3378f6] break-all bg-[#f4f7fc] p-2.5 rounded-lg border border-[#e8edf4]">
            <ExternalLink size={14} className="shrink-0" />
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline line-clamp-1"
            >
              {item.url}
            </a>
          </div>
        )}

        <div>
          <h4 className="text-xs font-semibold text-[#8791a7] uppercase tracking-wider mb-1.5">原文内容</h4>
          <div className="rounded-lg border border-[#edf0f5] bg-[#fbfcfe] p-3 text-xs leading-relaxed text-[#334155] whitespace-pre-wrap max-h-48 overflow-y-auto thin-scroll">
            {item.originalContent}
          </div>
        </div>

        {item.note && (
          <div>
            <h4 className="text-xs font-semibold text-[#8791a7] uppercase tracking-wider mb-1.5">情报笔记</h4>
            <div className="rounded-lg border border-[#edf0f5] bg-[#fffbf0] p-2.5 text-xs leading-relaxed text-[#854d0e]">
              {item.note}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-xs font-semibold text-[#8791a7] uppercase tracking-wider mb-1.5">标签</h4>
          <TagList tags={item.tags} />
        </div>

        {/* AI Analysis Card */}
        {item.analysis && (
          <div className="rounded-xl border border-[#d8e6ff] bg-[#f3f7ff] p-4 text-left">
            <div className="flex items-center gap-1.5 text-sm font-bold text-[#286cf2] mb-2.5">
              <Sparkles size={16} /> 结构化深度洞察
            </div>
            <div className="space-y-3 text-xs text-[#40506a]">
              <div>
                <span className="font-semibold text-[#152039] block mb-0.5">摘要提取：</span>
                <p className="m-0 leading-relaxed text-[#334155]">{item.analysis.summary}</p>
              </div>
              <div>
                <span className="font-semibold text-[#152039] block mb-0.5">核心价值：</span>
                <p className="m-0 leading-relaxed text-[#334155]">{item.analysis.core}</p>
              </div>
              <div>
                <span className="font-semibold text-[#152039] block mb-0.5">可复用选题角度：</span>
                <ul className="list-disc list-inside space-y-0.5 text-[#475569]">
                  {item.analysis.angles.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Status Operations */}
        <div className="pt-2 border-t border-[#edf0f5] space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Button
              size="sm"
              variant={item.status === "高潜" ? "secondary" : "outline"}
              className="text-xs"
              onClick={() => {
                dispatch({ type: "status", kind: "intelligence", ids: [item.id], status: "高潜" });
                toast.success("已标记为高潜力情报！");
              }}
            >
              标为高潜
            </Button>
            <Button
              size="sm"
              variant={item.status === "已归档" ? "secondary" : "outline"}
              className="text-xs"
              onClick={() => {
                dispatch({ type: "status", kind: "intelligence", ids: [item.id], status: "已归档" });
                toast.info("已归档该情报");
              }}
            >
              归档
            </Button>
            <Button
              size="sm"
              variant={item.status === "已忽略" ? "secondary" : "outline"}
              className="text-xs text-slate-500"
              onClick={() => {
                dispatch({ type: "status", kind: "intelligence", ids: [item.id], status: "已忽略" });
                toast.info("已忽略该情报");
              }}
            >
              忽略
            </Button>
          </div>

          <Button
            className="w-full justify-center bg-[#3378f6] hover:bg-[#2563eb]"
            onClick={() => {
              if (associatedIdea) {
                router.push(`/ideas/${associatedIdea.id}`);
                return;
              }
              dispatch({ type: "convert", source: { kind: "intelligence", id: item.id } });
              toast.success("已成功将情报加入选题！", item.title);
            }}
          >
            <Lightbulb size={16} />
            {associatedIdea || item.status === "已转选题"
              ? "已转为选题 · 查看选题详情"
              : "加入选题库"}
          </Button>
        </div>
      </div>
    </RightDetailPanel>
  );
}
