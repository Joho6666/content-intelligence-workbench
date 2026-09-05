"use client";
import * as React from "react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical,  Link as LinkIcon } from "lucide-react";
import type { Idea } from "../../types";
import { PriorityBadge, PlatformBadge } from "../../components/shared/primitives";
import { cn } from "../../lib/utils";

export function KanbanCard({
  idea,
  isOverlay = false,
}: {
  idea: Idea;
  isOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: idea.id,
    data: {
      type: "Idea",
      idea,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasSource = idea.sourceIds && idea.sourceIds.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      aria-roledescription="sortable"
      className={cn(
        "group relative flex flex-col rounded-xl border border-[#e7ebf2] bg-white p-3.5 shadow-2xs transition-all text-left",
        isDragging && "opacity-40 border-dashed border-[#3378f6]",
        isOverlay && "rotate-2 shadow-2xl border-[#3378f6] ring-2 ring-[#3378f6]/30 cursor-grabbing bg-white z-50",
        !isDragging && !isOverlay && "hover:border-[#8db5ff] hover:shadow-xs"
      )}
    >
      {/* Header with Drag Handle & Priority */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <PriorityBadge value={idea.priority} />
          {hasSource && (
            <span
              title="有原始灵感/情报关联"
              className="inline-flex items-center gap-0.5 text-[10px] text-[#3378f6] bg-[#edf4ff] px-1.5 py-0.5 rounded font-medium"
            >
              <LinkIcon size={10} /> 溯源
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {idea.score && (
            <span className="text-[11px] font-bold text-[#3378f6]">
              {idea.score}分
            </span>
          )}
          {/* Drag Handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-[#f4f6fa] text-[#9aa4b6] hover:text-[#152039] transition-colors"
            aria-label={`拖拽重排 ${idea.title}`}
          >
            <GripVertical size={14} />
          </button>
        </div>
      </div>

      {/* Clickable Card Link to Idea Detail */}
      <Link
        href={`/ideas/${idea.id}`}
        className="block group-hover:text-[#3378f6] transition-colors"
      >
        <h4 className="text-sm font-semibold text-[#152039] line-clamp-2 leading-snug mb-1.5">
          {idea.title}
        </h4>
        <p className="text-xs text-[#64748b] line-clamp-2 leading-relaxed mb-3">
          {idea.core || idea.angle}
        </p>
      </Link>

      {/* Footer with Platform Badges & Tags */}
      <div className="mt-auto pt-2.5 border-t border-[#edf0f5] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {idea.platforms.slice(0, 2).map((p) => (
            <PlatformBadge key={p} value={p} />
          ))}
        </div>
        {idea.tags.length > 0 && (
          <span className="text-[10px] text-[#8791a7] bg-[#f8fafc] px-1.5 py-0.5 rounded border border-[#edf0f5] truncate max-w-[80px]">
            {idea.tags[0]}
          </span>
        )}
      </div>
    </div>
  );
}
