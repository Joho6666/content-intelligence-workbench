"use client";
import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Idea, IdeaStatus } from "../../types";
import { KanbanCard } from "./kanban-card";
import { cn } from "../../lib/utils";

interface KanbanColumnProps {
  status: IdeaStatus;
  ideas: Idea[];
}

const statusConfig: Record<
  IdeaStatus,
  { dotColor: string; bgBadge: string }
> = {
  待筛选: { dotColor: "bg-slate-400", bgBadge: "bg-slate-100 text-slate-700" },
  候选选题: { dotColor: "bg-blue-500", bgBadge: "bg-blue-50 text-blue-700" },
  待制作: { dotColor: "bg-amber-500", bgBadge: "bg-amber-50 text-amber-700" },
  制作中: { dotColor: "bg-purple-500", bgBadge: "bg-purple-50 text-purple-700" },
  待发布: { dotColor: "bg-sky-500", bgBadge: "bg-sky-50 text-sky-700" },
  已发布: { dotColor: "bg-emerald-500", bgBadge: "bg-emerald-50 text-emerald-700" },
};

export function KanbanColumn({ status, ideas }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      type: "Column",
      status,
    },
  });

  const config = statusConfig[status] || {
    dotColor: "bg-slate-400",
    bgBadge: "bg-slate-100 text-slate-700",
  };

  const ideaIds = React.useMemo(() => ideas.map((i) => i.id), [ideas]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl border border-[#e8edf4] bg-[#f8fafc] p-2.5 min-w-[240px] max-w-[320px] flex-1 min-h-[560px] transition-colors",
        isOver && "bg-[#eaf1ff]/60 border-[#3378f6]/50 ring-2 ring-[#3378f6]/20"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 py-1.5 mb-2.5">
        <div className="flex items-center gap-2">
          <span className={cn("size-2.5 rounded-full shrink-0", config.dotColor)} />
          <h3 className="text-xs font-bold text-[#152039] uppercase tracking-wide">
            {status}
          </h3>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            config.bgBadge
          )}
        >
          {ideas.length}
        </span>
      </div>

      {/* Droppable and Sortable List */}
      <SortableContext items={ideaIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2.5 min-h-[100px]">
          {ideas.map((idea) => (
            <KanbanCard key={idea.id} idea={idea} />
          ))}

          {ideas.length === 0 && (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-[#cbd5e1] text-xs text-[#94a3b8] p-4 text-center">
              拖拽选题卡片到此处
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
