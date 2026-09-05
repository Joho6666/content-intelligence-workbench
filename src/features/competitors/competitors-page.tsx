"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  TrendingUp,
  Search,
  Plus,
  Users,
  Eye,
  Flame,
  LineChart as LineChartIcon,
  ArrowUpDown,
  Play,
  Pause,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useWorkbench } from "../../hooks/use-workbench";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
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
import {
  PlatformBadge,
  TagList,
  MockBoundary,
  RightDetailPanel,
  EmptyState,
} from "../../components/shared/primitives";
import { platforms, type Platform, type Competitor } from "../../types";
import { getOutlierLevel, getOutlierLabel, getOutlierBadgeTone } from "../../lib/outlier";
import { formatCount } from "../../lib/utils";

export default function CompetitorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, actions, dispatch } = useWorkbench();

  // Search and Filter states
  const [search, setSearch] = React.useState("");
  const [selectedPlatform, setSelectedPlatform] = React.useState<string>("");
  const [activeChipId, setActiveChipId] = React.useState<string | null>(null);

  // Table sorting
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "outlierIndex", desc: true },
  ]);

  // Selection state
  const itemParam = searchParams.get("item");
  const [localSelectedId, setLocalSelectedId] = React.useState<string | null>(null);
  const selectedId = localSelectedId !== null ? localSelectedId : itemParam;

  const selectCompetitor = React.useCallback((id: string | null) => {
    setLocalSelectedId(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("item", id);
    } else {
      params.delete("item");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Add Competitor Dialog state
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [formName, setFormName] = React.useState("");
  const [formHandle, setFormHandle] = React.useState("");
  const [formPlatform, setFormPlatform] = React.useState<Platform>("小红书");
  const [formDescription, setFormDescription] = React.useState("");
  const [formTopics, setFormTopics] = React.useState("AI 工具, 知识管理");
  const [formError, setFormError] = React.useState("");

  // Filtered data
  const filteredData = React.useMemo(() => {
    return state.competitors.filter((item) => {
      if (activeChipId && item.id !== activeChipId) return false;
      if (selectedPlatform && item.platform !== selectedPlatform) return false;
      if (search) {
        const query = search.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchHandle = item.handle.toLowerCase().includes(query);
        const matchDesc = item.description.toLowerCase().includes(query);
        const matchTopics = item.recentTopics.some((t) => t.toLowerCase().includes(query));
        if (!matchName && !matchHandle && !matchDesc && !matchTopics) return false;
      }
      return true;
    });
  }, [state.competitors, selectedPlatform, activeChipId, search]);

  const selectedCompetitor = state.competitors.find((x) => x.id === selectedId) || null;

  // Stats calculation
  const totalFollowers = React.useMemo(() => {
    return state.competitors.reduce((acc, c) => acc + c.followers, 0);
  }, [state.competitors]);

  const viralCount = React.useMemo(() => {
    return state.competitors.filter((c) => getOutlierLevel(c.outlierIndex) === "viral").length;
  }, [state.competitors]);

  const avgEngagementRate = React.useMemo(() => {
    if (state.competitors.length === 0) return "0.0";
    const sum = state.competitors.reduce((acc, c) => acc + c.avgEngagement, 0);
    return (sum / state.competitors.length).toFixed(1);
  }, [state.competitors]);

  // Define TanStack Table Columns
  const columns = React.useMemo<ColumnDef<Competitor>[]>(
    () => [
      {
        accessorKey: "name",
        header: "创作者 / 账号",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-3">
              <div
                className="size-9 rounded-full bg-[#152039] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs"
              >
                {item.avatar || item.name.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-[#152039] hover:text-[#3378f6] transition-colors leading-tight">
                  {item.name}
                </div>
                <div className="text-xs text-[#8791a7]">{item.handle}</div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "platform",
        header: "主页平台",
        cell: ({ getValue }) => <PlatformBadge value={getValue<Platform>()} />,
      },
      {
        accessorKey: "followers",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-xs text-[#68758d] hover:text-[#152039]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            粉丝数
            <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ getValue }) => <span className="font-semibold text-sm text-[#152039]">{formatCount(getValue<number>())}</span>,
      },
      {
        accessorKey: "posts7d",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-xs text-[#68758d] hover:text-[#152039]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            7天发文
            <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ getValue }) => <span className="text-sm text-[#40506a]">{getValue<number>()} 条</span>,
      },
      {
        accessorKey: "avgViews",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-xs text-[#68758d] hover:text-[#152039]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            平均播放
            <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ getValue }) => <span className="text-sm text-[#40506a]">{formatCount(getValue<number>())}</span>,
      },
      {
        accessorKey: "avgEngagement",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-xs text-[#68758d] hover:text-[#152039]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            平均互动率
            <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ getValue }) => <span className="text-sm text-[#35b886] font-semibold">{getValue<number>()}%</span>,
      },
      {
        accessorKey: "outlierIndex",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-xs text-[#68758d] hover:text-[#152039]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            异常指数
            <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ getValue }) => {
          const val = getValue<number>();
          const tone = getOutlierBadgeTone(val);
          const label = getOutlierLabel(val);
          return <Badge tone={tone}>{label}</Badge>;
        },
      },
      {
        accessorKey: "monitored",
        header: "监控状态",
        cell: ({ getValue }) => {
          const monitored = getValue<boolean>();
          return (
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded ${
                monitored ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              <span className={`size-1.5 rounded-full ${monitored ? "bg-emerald-500" : "bg-slate-400"}`} />
              {monitored ? "监控中" : "已暂停"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-[#3378f6] hover:bg-[#edf4ff]"
                onClick={() => selectCompetitor(item.id)}
              >
                详情
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  dispatch({ type: "monitor", id: item.id });
                  toast.info(item.monitored ? `已暂停对「${item.name}」的监控` : `已恢复对「${item.name}」的监控`);
                }}
              >
                {item.monitored ? "暂停" : "恢复"}
              </Button>
            </div>
          );
        },
      },
    ],
    [dispatch, selectCompetitor]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formName.trim()) {
      setFormError("请输入对手创作者名称");
      return;
    }

    const newComp: Competitor = {
      id: `competitor-${Date.now()}`,
      name: formName.trim(),
      handle: formHandle.trim() ? (formHandle.startsWith("@") ? formHandle.trim() : `@${formHandle.trim()}`) : `@${formName.trim().toLowerCase().replace(/\s+/g, "")}`,
      platform: formPlatform,
      avatar: formName.trim().slice(0, 1),
      description: formDescription.trim() || "新添加的监控账号，系统将跟进内容动态。",
      followers: 12000,
      posts7d: 0,
      avgViews: 0,
      avgEngagement: 0,
      outlierIndex: 1.0,
      recentTopics: formTopics.split(/[,，\s]+/).filter(Boolean),
      updatedAt: new Date().toISOString(),
      monitored: true,
      recentContent: [], // Empty: correctly displays empty state without faking data
      trend: [],
      hooks: [{ label: "待分析", value: 100 }],
      insights: ["新添加的监控账号，尚未产生足够的历史抓取数据。系统将在下个采集周期同步内容。"],
    };

    const created = await actions.addCompetitor(newComp);
    if (!created) {
      setFormError("保存失败，请确认本地 Supabase 正常运行后重试。");
      return;
    }
    toast.success("已添加对手监控账号！", formName.trim());
    setShowAddModal(false);
    setFormName("");
    setFormHandle("");
    setFormDescription("");
    selectCompetitor(created.id);
  };

  return (
    <MockBoundary>
      <PageHead
        eyebrow="COMPETITOR RADAR"
        title={
          <>
            对手监控 <span className="sparkle">✦</span>
          </>
        }
        desc="实时跟踪同行与竞对的内容动态，发现异常爆款，解析叙事套路与增长机会。"
        action={
          <button
            type="button"
            className="primary inline-flex items-center gap-1.5 rounded-lg bg-[#152039] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#203052] transition-colors"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} /> 添加监控账号
          </button>
        }
      />

      {/* Stats Summary */}
      <div className="stats">
        <Stat icon={Users} label="监控创作者" value={String(state.competitors.length)} delta="12%" sub="跨平台活跃账号" />
        <Stat icon={TrendingUp} label="粉丝覆盖总计" value={formatCount(totalFollowers)} delta="18%" color="#856eea" sub="行业受众基数" />
        <Stat icon={Flame} label="异常爆款创作者" value={String(viralCount)} delta="50%" color="#e05c68" sub="异常指数 > 3.0x" />
        <Stat icon={Eye} label="行业平均互动率" value={`${avgEngagementRate}%`} delta="1.4%" color="#35b886" sub="近期数据均值" />
      </div>

      {/* Account Chips Filter */}
      <div className="mb-4 rounded-xl border border-[#e7ebf2] bg-white p-3 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-[#8791a7]">监控账号快速筛选</span>
          {activeChipId && (
            <button
              type="button"
              onClick={() => setActiveChipId(null)}
              className="text-xs text-[#3378f6] hover:underline"
            >
              显示全部
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveChipId(null)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeChipId === null
                ? "bg-[#152039] text-white"
                : "bg-[#f4f6fa] text-[#64748b] hover:bg-[#eaf1ff] hover:text-[#286cf2]"
            }`}
          >
            全部账号 ({state.competitors.length})
          </button>
          {state.competitors.map((comp) => {
            const isActive = activeChipId === comp.id;
            return (
              <button
                key={comp.id}
                type="button"
                onClick={() => {
                  setActiveChipId(isActive ? null : comp.id);
                  selectCompetitor(comp.id);
                }}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs transition-all ${
                  isActive
                    ? "border-[#3378f6] bg-[#eaf1ff] text-[#286cf2] font-semibold"
                    : "border-[#e8edf4] bg-white text-[#40506a] hover:bg-[#fbfcfe]"
                }`}
              >
                <div className="size-5 rounded-full bg-[#152039] text-white flex items-center justify-center text-[10px] font-bold">
                  {comp.avatar || comp.name.slice(0, 1)}
                </div>
                <span>{comp.name}</span>
                <span className="text-[10px] text-[#8791a7]">{comp.outlierIndex.toFixed(1)}x</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e7ebf2] bg-white p-3 shadow-2xs">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8791a7]" />
            <Input
              placeholder="搜索创作者、Handle、定位描述或标签..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <Select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)} className="w-36">
            <option value="">全部平台</option>
            {platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </div>

        <div className="text-xs text-[#8791a7]">
          共 <strong>{filteredData.length}</strong> 位创作者
        </div>
      </div>

      {/* Main Table Area with Split View when Item Selected */}
      <div className="flex items-start gap-5">
        <div className="flex-1 min-w-0">
          {filteredData.length === 0 ? (
            <EmptyState
              title="未找到匹配的创作者"
              description="请尝试调整搜索词或平台筛选条件。"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedPlatform("");
                  setActiveChipId(null);
                }}
              >
                重置筛选
              </Button>
            </EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#e7ebf2] bg-white shadow-2xs thin-scroll">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-[#e8edf4] bg-[#fbfcfe]">
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="py-3 px-4 text-xs font-semibold text-[#68758d]">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-[#edf0f5]">
                  {table.getRowModel().rows.map((row) => {
                    const isSelected = row.original.id === selectedId;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => selectCompetitor(row.original.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? "bg-[#eaf1ff]/40" : "hover:bg-[#fbfcfe]"
                        }`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="py-3 px-4">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Table Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#edf0f5] text-xs text-[#8791a7]">
                <span>
                  第 {table.getState().pagination.pageIndex + 1} 页，共 {table.getPageCount()} 页
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    上一页
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Detail Panel for Competitor */}
        {selectedCompetitor && (
          <RightDetailPanel
            title={selectedCompetitor.name}
            onClose={() => selectCompetitor(null)}
          >
            <div className="space-y-4 text-left">
              {/* Creator Profile Header */}
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-[#152039] text-white flex items-center justify-center font-bold text-base shadow-xs">
                  {selectedCompetitor.avatar || selectedCompetitor.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-[#152039] line-clamp-1">
                      {selectedCompetitor.name}
                    </h3>
                    <PlatformBadge value={selectedCompetitor.platform} />
                  </div>
                  <div className="text-xs text-[#8791a7] mt-0.5">{selectedCompetitor.handle}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 px-2"
                  onClick={() => {
                    dispatch({ type: "monitor", id: selectedCompetitor.id });
                    toast.info(selectedCompetitor.monitored ? "已暂停监控" : "已恢复监控");
                  }}
                >
                  {selectedCompetitor.monitored ? <Pause size={12} /> : <Play size={12} />}
                  {selectedCompetitor.monitored ? "暂停" : "监控"}
                </Button>
              </div>

              <p className="text-xs text-[#64748b] leading-relaxed m-0 bg-[#f9fafb] p-2.5 rounded-lg border border-[#edf0f5]">
                {selectedCompetitor.description}
              </p>

              {/* Stats 4-Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[#edf0f5] bg-[#fbfcfe] p-2.5">
                  <span className="text-[11px] text-[#8791a7] block">粉丝数</span>
                  <span className="text-base font-bold text-[#152039]">
                    {formatCount(selectedCompetitor.followers)}
                  </span>
                </div>
                <div className="rounded-lg border border-[#edf0f5] bg-[#fbfcfe] p-2.5">
                  <span className="text-[11px] text-[#8791a7] block">7天发文</span>
                  <span className="text-base font-bold text-[#152039]">
                    {selectedCompetitor.posts7d} 条
                  </span>
                </div>
                <div className="rounded-lg border border-[#edf0f5] bg-[#fbfcfe] p-2.5">
                  <span className="text-[11px] text-[#8791a7] block">平均播放</span>
                  <span className="text-base font-bold text-[#152039]">
                    {formatCount(selectedCompetitor.avgViews)}
                  </span>
                </div>
                <div className="rounded-lg border border-[#edf0f5] bg-[#fbfcfe] p-2.5">
                  <span className="text-[11px] text-[#8791a7] block">异常指数</span>
                  <div className="mt-0.5">
                    <Badge tone={getOutlierBadgeTone(selectedCompetitor.outlierIndex)}>
                      {getOutlierLabel(selectedCompetitor.outlierIndex)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* 14-day Trend Chart */}
              <div>
                <h4 className="text-xs font-semibold text-[#8791a7] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <LineChartIcon size={14} className="text-[#3378f6]" /> 近14天播放表现趋势
                </h4>
                {selectedCompetitor.trend.length === 0 ? (
                  <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-[#cbd5e1] bg-[#fbfcfe] p-5 text-center text-xs text-[#94a3b8]">
                    暂无趋势数据，等待下一次采集周期。
                  </div>
                ) : (
                  <div className="h-44 w-full rounded-xl border border-[#edf0f5] bg-[#fbfcfe] p-2 pt-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedCompetitor.trend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f5" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9aa4b6" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#9aa4b6" }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e7ebf2",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Line type="monotone" dataKey="views" name="实际播放" stroke="#3378f6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="baseline" name="均线基准" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Recent 3 High-Performing Contents */}
              <div>
                <h4 className="text-xs font-semibold text-[#8791a7] uppercase tracking-wider mb-2">
                  近期高表现内容 (Top 3)
                </h4>
                {selectedCompetitor.recentContent.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] p-6 text-center text-xs text-[#94a3b8]">
                    <Clock size={20} className="mx-auto mb-2 text-[#cbd5e1]" />
                    该账号刚加入监控，暂无历史内容采集。
                    <br />
                    系统将在下个更新周期自动抓取最新内容。
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedCompetitor.recentContent.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-start gap-2.5 rounded-lg border border-[#edf0f5] bg-white p-2.5 shadow-2xs hover:border-[#8db5ff] transition-colors"
                      >
                        <div
                          className="size-10 rounded-md shrink-0 flex items-center justify-center text-xs text-white"
                          style={{ background: c.thumbnail || "#3378f6" }}
                        >
                          <Flame size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-semibold text-[#152039] line-clamp-1 leading-snug">
                            {c.title}
                          </h5>
                          <div className="flex items-center gap-3 text-[11px] text-[#8791a7] mt-1">
                            <span>播放 {formatCount(c.views)}</span>
                            <span>点赞 {formatCount(c.likes)}</span>
                            <Badge tone={getOutlierBadgeTone(c.outlier)}>
                              {c.outlier.toFixed(1)}x 爆款
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Topics & Hooks */}
              <div>
                <h4 className="text-xs font-semibold text-[#8791a7] uppercase tracking-wider mb-1.5">
                  高频话题分布
                </h4>
                <TagList tags={selectedCompetitor.recentTopics} />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[#8791a7] uppercase tracking-wider mb-1.5">
                  Hook 叙事模型分布
                </h4>
                <div className="space-y-1.5">
                  {selectedCompetitor.hooks.map((h) => (
                    <div key={h.label} className="flex items-center gap-2 text-xs">
                      <span className="w-16 text-[#64748b] truncate">{h.label}</span>
                      <div className="flex-1 h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#3378f6] rounded-full"
                          style={{ width: `${Math.min(100, h.value * 2.5)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-medium text-[#152039]">{h.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insights */}
              <div className="rounded-xl border border-[#d8e6ff] bg-[#f3f7ff] p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#286cf2] mb-2">
                  <Sparkles size={15} /> AI 洞察建议
                </div>
                <ul className="space-y-1 text-xs text-[#334155] list-disc list-inside">
                  {selectedCompetitor.insights.map((ins, i) => (
                    <li key={i} className="leading-relaxed">{ins}</li>
                  ))}
                </ul>
              </div>
            </div>
          </RightDetailPanel>
        )}
      </div>

      {/* Add Competitor Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent title="添加监控创作者" description="输入目标竞对或标杆博主账号信息">
          <DialogHeader>
            <DialogTitle>添加监控创作者账号</DialogTitle>
            <DialogDescription>
              添加后将追踪发文频率、播放基线与异常爆款，提取 Hook 模型与高频选题。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">创作者名称 / 频道名 *</label>
              <Input
                autoFocus
                placeholder="例如：科技新知、少数派..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#40506a] mb-1.5">主营平台</label>
                <Select value={formPlatform} onChange={(e) => setFormPlatform(e.target.value as Platform)}>
                  {platforms.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#40506a] mb-1.5">Handle / 账号唯一ID</label>
                <Input
                  placeholder="@creator..."
                  value={formHandle}
                  onChange={(e) => setFormHandle(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">关注方向 / 标签 (逗号分隔)</label>
              <Input
                placeholder="AI 工具, 知识管理, 个人 IP..."
                value={formTopics}
                onChange={(e) => setFormTopics(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#40506a] mb-1.5">账号定位与分析备注</label>
              <Textarea
                rows={3}
                placeholder="记录该账号的核心风格、变现路径或为什么值得关注..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                取消
              </Button>
              <Button type="submit">
                确认添加
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MockBoundary>
  );
}
