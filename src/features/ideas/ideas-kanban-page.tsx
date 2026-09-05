"use client";
import * as React from "react";
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  Lightbulb,
  Plus,
  Layers,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useWorkbench } from "../../hooks/use-workbench";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { toast } from "../../components/ui/sonner";
import { PageHead, Stat } from "../../components/shared/legacy";
import { MockBoundary } from "../../components/shared/primitives";
import { ideaStatuses, type Idea, type IdeaStatus, type Priority, platforms, type Platform } from "../../types";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";

export default function IdeasKanbanPage() {
  const { state, actions, dispatch } = useWorkbench();

  const [activeIdea, setActiveIdea] = React.useState<Idea | null>(null);

  const [showAddModal, setShowAddModal] = React.useState(false);
  const [formTitle, setFormTitle] = React.useState("");
  const [formAngle, setFormAngle] = React.useState("");
  const [formPriority, setFormPriority] = React.useState<Priority>("A");
  const [formPlatform, setFormPlatform] = React.useState<Platform>("小红书");
  const [formCore, setFormCore] = React.useState("");
  const [formTags, setFormTags] = React.useState("内容创作, 实践复盘");
  const [formError, setFormError] = React.useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columnsData = React.useMemo(() => {
    const map: Record<IdeaStatus, Idea[]> = {
      待筛选: [],
      候选选题: [],
      待制作: [],
      制作中: [],
      待发布: [],
      已发布: [],
    };
    state.ideas.forEach((idea) => {
      if (map[idea.status]) {
        map[idea.status].push(idea);
      } else {
        map["待筛选"].push(idea);
      }
    });
    return map;
  }, [state.ideas]);

  const handleDragStart = (event: DragStartEvent) => {
    const idea = event.active.data.current?.idea as Idea;
    if (idea) {
      setActiveIdea(idea);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveIdea(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (ideaStatuses.includes(overId as IdeaStatus)) {
      const targetStatus = overId as IdeaStatus;
      dispatch({
        type: "moveIdea",
        id: activeId,
        status: targetStatus,
      });
      return;
    }

    const overIdea = state.ideas.find((i) => i.id === overId);
    if (overIdea) {
      dispatch({
        type: "moveIdea",
        id: activeId,
        status: overIdea.status,
        beforeId: overId,
      });
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formTitle.trim()) {
      setFormError("请输入选题标题");
      return;
    }

    const newIdea: Idea = {
      id: "idea-" + Date.now(),
      title: formTitle.trim(),
      angle: formAngle.trim() || "从真实业务场景切入",
      priority: formPriority,
      platforms: [formPlatform],
      status: "待筛选",
      tags: formTags.split(/[,，\s]+/).filter(Boolean),
      sourceIds: [],
      score: 86,
      core: formCore.trim() || "工具辅助思考，真实经验创造价值。",
      audience: "关注该领域的深度创作者与学习者",
      cta: "欢迎在评论区探讨更多实践方案",
      titles: [formTitle.trim(), "如何用三步搞定内容工作流", "深度实践拆解指南"],
      outline: "",
      hook: "",
      script: "",
      materials: "录屏、案例截图、前后效果对比",
      strategy: "首发核心平台验证数据，再多平台矩阵分发。",
    };

    const created = await actions.addIdea(newIdea);
    if (!created) {
      setFormError("保存失败，请确认本地 Supabase 正常运行后重试。");
      return;
    }
    toast.success("已创建新选题！", formTitle.trim());
    setShowAddModal(false);
    setFormTitle("");
    setFormAngle("");
    setFormCore("");
  };

  return (
    <MockBoundary>
      <PageHead
        eyebrow="EDITORIAL WORKBENCH"
        title={
          <>
            选题看板 <span className="sparkle">✦</span>
          </>
        }
        desc="全流程驱动内容从线索到选题、大纲、脚本、制作与发布的六列看板。"
        action={
          <button
            type="button"
            className="primary inline-flex items-center gap-1.5 rounded-lg bg-[#152039] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#203052] transition-colors"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} /> 新建选题
          </button>
        }
      />

      <div className="stats">
        <Stat icon={Lightbulb} label="选题总库" value={String(state.ideas.length)} delta="15%" sub="各阶段累计" />
        <Stat
          icon={Sparkles}
          label="S 级重点选题"
          value={String(state.ideas.filter((x) => x.priority === "S").length)}
          delta="30%"
          color="#e05c68"
          sub="高潜优先推进"
        />
        <Stat
          icon={Layers}
          label="制作中 / 待发布"
          value={String(state.ideas.filter((x) => x.status === "制作中" || x.status === "待发布").length)}
          delta="20%"
          color="#856eea"
          sub="处于流水线阶段"
        />
        <Stat
          icon={CheckCircle2}
          label="本周已发布"
          value={String(state.ideas.filter((x) => x.status === "已发布").length)}
          delta="40%"
          color="#37b986"
          sub="完成成果交付"
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        accessibility={{
          screenReaderInstructions: {
            draggable: "按空格键开始拖动选题，使用方向键移动，按空格键放下，按 Esc 取消。",
          },
          announcements: {
            onDragStart: ({ active }) => {
              const idea = state.ideas.find((item) => item.id === String(active.id));
              return `已拿起选题：${idea?.title || active.id}`;
            },
            onDragOver: ({ active, over }) => {
              const idea = state.ideas.find((item) => item.id === String(active.id));
              return over ? `选题 ${idea?.title || active.id} 已移动到 ${over.id}` : undefined;
            },
            onDragEnd: ({ active, over }) => {
              const idea = state.ideas.find((item) => item.id === String(active.id));
              return over ? `选题 ${idea?.title || active.id} 已放置到 ${over.id}` : `选题 ${idea?.title || active.id} 已放置`;
            },
            onDragCancel: ({ active }) => {
              const idea = state.ideas.find((item) => item.id === String(active.id));
              return `已取消拖动：${idea?.title || active.id}`;
            },
          },
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveIdea(null)}
      >
        <div className="kanban flex items-start gap-3.5 overflow-x-auto pb-4 pt-1 thin-scroll">
          {ideaStatuses.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              ideas={columnsData[status] || []}
            />
          ))}
        </div>

        <DragOverlay>
          {activeIdea ? <KanbanCard idea={activeIdea} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent title="新建选题" description="录入新的内容选题并指定优先级与平台">
          <DialogHeader>
            <DialogTitle>新建选题卡片</DialogTitle>
            <DialogDescription>
              选题将进入「待筛选」列，你可以在详情页中借助 AI 生成大纲、Hook 和脚本。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">选题标题 *</label>
              <Input
                autoFocus
                placeholder="吸引眼球的候选标题..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#40506a] mb-1.5">优先级等级</label>
                <Select value={formPriority} onChange={(e) => setFormPriority(e.target.value as Priority)}>
                  <option value="S">S 级 (核心高潜优先)</option>
                  <option value="A">A 级 (标准主力内容)</option>
                  <option value="B">B 级 (常态备选/素材)</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#40506a] mb-1.5">主要发布平台</label>
                <Select value={formPlatform} onChange={(e) => setFormPlatform(e.target.value as Platform)}>
                  {platforms.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">切入角度 (Angle)</label>
              <Input
                placeholder="例如：反常识对比、避坑复盘、保姆级步骤..."
                value={formAngle}
                onChange={(e) => setFormAngle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">核心论点 / 价值点</label>
              <Textarea
                rows={3}
                placeholder="这篇内容要为受众解决什么问题或提供什么洞见？"
                value={formCore}
                onChange={(e) => setFormCore(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">标签 (逗号分隔)</label>
              <Input value={formTags} onChange={(e) => setFormTags(e.target.value)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                取消
              </Button>
              <Button type="submit">
                确认创建
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MockBoundary>
  );
}
