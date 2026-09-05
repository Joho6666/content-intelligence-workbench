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
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  Database,
  Search,
  Plus,
  ArrowUpDown,
  CheckCircle2,
  Bookmark,
  List,
  LayoutGrid,
  FileText,
  Clock,
} from "lucide-react";
import { useWorkbench } from "../../hooks/use-workbench";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { toast } from "../../components/ui/sonner";
import { PageHead, Stat } from "../../components/shared/legacy";
import {
  PlatformBadge,
  StatusBadge,
  TagList,
  MockBoundary,
  EmptyState,
} from "../../components/shared/primitives";
import { platforms, type Platform, type IntelligenceItem, type RecordStatus } from "../../types";
import { formatDate } from "../../lib/utils";
import { ImportIntelligenceDialog } from "./import-intelligence-dialog";
import { IntelligenceDetailDrawer } from "./intelligence-detail-drawer";

export default function IntelligencePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, dispatch } = useWorkbench();

  // Search & Filter state
  const [search, setSearch] = React.useState("");
  const [selectedPlatform, setSelectedPlatform] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState("");
  const [selectedSourceType, setSelectedSourceType] = React.useState("");
  const [selectedScoreTier, setSelectedScoreTier] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"table" | "card">("table");

  // Selection
  const itemParam = searchParams.get("item");
  const [localSelectedId, setLocalSelectedId] = React.useState<string | null>(null);
  const selectedId = localSelectedId !== null ? localSelectedId : itemParam;

  const selectItem = React.useCallback((id: string | null) => {
    setLocalSelectedId(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("item", id);
    else params.delete("item");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);
  // Table Sorting & Selection
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "capturedAt", desc: true },
  ]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Pagination (10/page)
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  const handleFilterChange = (setter: (v: string) => void, val: string) => {
    setter(val);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setRowSelection({});
  };

  const [showAddModal, setShowAddModal] = React.useState(false);

  // Filtered data
  const filteredData = React.useMemo(() => {
    return state.intelligence.filter((item) => {
      if (search) {
        const query = search.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchContent = item.originalContent.toLowerCase().includes(query);
        const matchAuthor = item.author.toLowerCase().includes(query);
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchTitle && !matchContent && !matchAuthor && !matchTags) return false;
      }
      if (selectedPlatform && item.platform !== selectedPlatform) return false;
      if (selectedStatus && item.status !== selectedStatus) return false;
      if (selectedSourceType && item.sourceType !== selectedSourceType) return false;
      if (selectedScoreTier) {
        const score = item.aiScore || 0;
        if (selectedScoreTier === "high" && score < 85) return false;
        if (selectedScoreTier === "mid" && (score < 70 || score >= 85)) return false;
        if (selectedScoreTier === "low" && score >= 70) return false;
      }
      return true;
    });
  }, [state.intelligence, search, selectedPlatform, selectedStatus, selectedSourceType, selectedScoreTier]);

  const selectedItem = state.intelligence.find((x) => x.id === selectedId) || null;

  // Columns definition
  const columns = React.useMemo<ColumnDef<IntelligenceItem>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            className="size-4 rounded border-[#cbd5e1] text-[#3378f6] focus:ring-[#3378f6] cursor-pointer"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="全选当前页"
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              className="size-4 rounded border-[#cbd5e1] text-[#3378f6] focus:ring-[#3378f6] cursor-pointer"
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onChange={row.getToggleSelectedHandler()}
              aria-label={`选择 ${row.original.title}`}
            />
          </div>
        ),
      },
      {
        accessorKey: "title",
        header: "标题与内容",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-3 min-w-[260px] max-w-md">
              <div
                className="size-10 rounded-lg shrink-0 flex items-center justify-center text-xs text-[#152039] font-medium shadow-2xs"
                style={{ background: item.thumbnail || "#dbe7f5" }}
              >
                <FileText size={16} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-[#152039] hover:text-[#3378f6] transition-colors leading-snug line-clamp-1">
                  {item.title}
                </div>
                <div className="text-xs text-[#8791a7] line-clamp-1 mt-0.5">
                  {item.author} · {item.originalContent.slice(0, 36)}...
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "platform",
        header: "平台",
        cell: ({ getValue }) => <PlatformBadge value={getValue<Platform>()} />,
      },
      {
        accessorKey: "sourceType",
        header: "来源渠道",
        cell: ({ row }) => (
          <div className="text-xs">
            <span className="font-medium text-[#40506a]">{row.original.sourceType}</span>
            <div className="text-[11px] text-[#9aa4b6]">{row.original.captureMethod}</div>
          </div>
        ),
      },
      {
        accessorKey: "capturedAt",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-xs text-[#68758d] hover:text-[#152039]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            采集时间
            <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ getValue }) => (
          <span className="text-xs text-[#8791a7] whitespace-nowrap">
            {formatDate(getValue<string>())}
          </span>
        ),
      },
      {
        accessorKey: "aiScore",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-xs text-[#68758d] hover:text-[#152039]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            AI 评分
            <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ getValue }) => {
          const score = getValue<number | null>();
          if (score === null) return <span className="text-xs text-[#9aa4b6]">未分析</span>;
          return (
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                score >= 85
                  ? "bg-[#edf4ff] text-[#286cf2]"
                  : score >= 70
                  ? "bg-[#eaf8f1] text-[#29a477]"
                  : "bg-[#f4f6fa] text-[#64748b]"
              }`}
            >
              {score}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ getValue }) => <StatusBadge value={getValue<RecordStatus>()} />,
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-[#3378f6] hover:bg-[#edf4ff]"
                onClick={() => selectItem(item.id)}
              >
                详情
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  if (item.status === "已转选题") {
                    const idea = state.ideas.find((i) =>
                      i.sourceIds.some((s) => s.kind === "intelligence" && s.id === item.id)
                    );
                    if (idea) router.push(`/ideas/${idea.id}`);
                  } else {
                    dispatch({ type: "convert", source: { kind: "intelligence", id: item.id } });
                    toast.success("已将情报加入选题！", item.title);
                  }
                }}
              >
                {item.status === "已转选题" ? "看选题" : "转选题"}
              </Button>
            </div>
          );
        },
      },
    ],
    [dispatch, router, selectItem, state.ideas]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, rowSelection, pagination },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedRowIds = React.useMemo(() => {
    return Object.keys(rowSelection).map((idx) => {
      const row = table.getRowModel().rowsById[idx] || table.getRowModel().rows[Number(idx)];
      return row?.original?.id;
    }).filter(Boolean);
  }, [rowSelection, table]);

  const handleBatchStatus = (status: RecordStatus) => {
    if (selectedRowIds.length === 0) return;
    dispatch({ type: "status", kind: "intelligence", ids: selectedRowIds, status });
    toast.success(`已批量更新 ${selectedRowIds.length} 条情报为「${status}」`);
    setRowSelection({});
  };

  return (
    <MockBoundary>
      <PageHead
        eyebrow="INTELLIGENCE REPOSITORY"
        title={
          <>
            全网情报库 <span className="sparkle">✦</span>
          </>
        }
        desc="汇聚全网优质灵感、行业爆款与对标案例，提供结构化分析和跨维度筛选。"
        action={
          <button
            type="button"
            className="primary inline-flex items-center gap-1.5 rounded-lg bg-[#152039] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#203052] transition-colors"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} /> 导入情报
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="stats">
        <Stat icon={Database} label="情报总数" value={String(state.intelligence.length)} delta="18%" sub="全网多渠道覆盖" />
        <Stat
          icon={Bookmark}
          label="高潜力情报"
          value={String(state.intelligence.filter((x) => x.status === "高潜").length)}
          delta="25%"
          color="#856eea"
          sub="AI 评分 85+"
        />
        <Stat
          icon={CheckCircle2}
          label="已转选题"
          value={String(state.intelligence.filter((x) => x.status === "已转选题").length)}
          delta="38%"
          color="#37b986"
          sub="转化率 34%"
        />
        <Stat
          icon={Clock}
          label="待分析"
          value={String(state.intelligence.filter((x) => x.status === "待分析").length)}
          delta="10%"
          color="#f1a535"
          sub="待提炼核心论点"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e7ebf2] bg-white p-3 shadow-2xs">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8791a7]" />
            <Input
              placeholder="全文搜索标题、原文、作者、标签..."
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <Select
            value={selectedPlatform}
            onChange={(e) => handleFilterChange(setSelectedPlatform, e.target.value)}
            className="w-32"
          >
            <option value="">全部平台</option>
            {platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>

          <Select
            value={selectedStatus}
            onChange={(e) => handleFilterChange(setSelectedStatus, e.target.value)}
            className="w-32"
          >
            <option value="">全部状态</option>
            <option value="待分析">待分析</option>
            <option value="高潜">高潜</option>
            <option value="已转选题">已转选题</option>
            <option value="已归档">已归档</option>
            <option value="已忽略">已忽略</option>
          </Select>

          <Select
            value={selectedSourceType}
            onChange={(e) => handleFilterChange(setSelectedSourceType, e.target.value)}
            className="w-32"
          >
            <option value="">来源渠道</option>
            <option value="手动发现">手动发现</option>
            <option value="对手监控">对手监控</option>
            <option value="AI 搜索">AI 搜索</option>
            <option value="RSS">RSS</option>
            <option value="自己想到">自己想到</option>
          </Select>

          <Select
            value={selectedScoreTier}
            onChange={(e) => handleFilterChange(setSelectedScoreTier, e.target.value)}
            className="w-36"
          >
            <option value="">AI 评分全部</option>
            <option value="high">85分以上 (高潜)</option>
            <option value="mid">70 - 84分 (良好)</option>
            <option value="low">70分以下</option>
          </Select>
        </div>

        <div className="flex items-center gap-2 border-l border-[#e8edf4] pl-3">
          <Button
            size="icon"
            variant={viewMode === "table" ? "secondary" : "ghost"}
            aria-label="表格视图"
            onClick={() => setViewMode("table")}
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

      {/* Batch Action Floating Bar when rows selected */}
      {selectedRowIds.length > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#3378f6]/30 bg-[#edf4ff] p-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#152039]">
            <CheckCircle2 className="size-4 text-[#3378f6]" />
            已选择 <strong className="text-[#3378f6]">{selectedRowIds.length}</strong> 条情报
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-white text-xs h-8"
              onClick={() => handleBatchStatus("高潜")}
            >
              设为高潜
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-white text-xs h-8"
              onClick={() => handleBatchStatus("已归档")}
            >
              归档
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-white text-xs h-8"
              onClick={() => handleBatchStatus("已忽略")}
            >
              忽略
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-8"
              onClick={() => setRowSelection({})}
            >
              取消选择
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex items-start gap-5">
        <div className="flex-1 min-w-0">
          {filteredData.length === 0 ? (
            <EmptyState
              title="情报库中没有匹配的记录"
              description="尝试清除搜索关键词或筛选条件，或者点击右上角「导入情报」手动录入。"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedPlatform("");
                  setSelectedStatus("");
                  setSelectedSourceType("");
                  setSelectedScoreTier("");
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
              >
                重置所有筛选
              </Button>
            </EmptyState>
          ) : viewMode === "table" ? (
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
                        tabIndex={0}
                        onClick={() => selectItem(row.original.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") selectItem(row.original.id);
                        }}
                        className={`transition-colors cursor-pointer focus-visible:bg-[#edf4ff] focus-visible:outline-none ${
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
                  共 <strong>{filteredData.length}</strong> 条记录 · 每页 10 条 · 第{" "}
                  {table.getState().pagination.pageIndex + 1} / {table.getPageCount()} 页
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredData.slice(pagination.pageIndex * 10, (pagination.pageIndex + 1) * 10).map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <div
                    key={item.id}
                    onClick={() => selectItem(item.id)}
                    className={`flex flex-col justify-between rounded-xl border p-4 bg-white shadow-2xs transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#3378f6] ring-1 ring-[#3378f6]"
                        : "border-[#e7ebf2] hover:border-[#8db5ff] hover:-translate-y-0.5"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <PlatformBadge value={item.platform} />
                        <StatusBadge value={item.status} />
                      </div>

                      <h3 className="text-sm font-semibold text-[#152039] line-clamp-2 leading-snug mb-1.5">
                        {item.title}
                      </h3>

                      <p className="text-xs text-[#64748b] line-clamp-3 leading-relaxed mb-3">
                        {item.originalContent}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#edf0f5] mt-2">
                      <div className="flex items-center justify-between text-xs text-[#9aa4b6] mb-2.5">
                        <span>{item.author}</span>
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
                          onClick={() => {
                            if (item.status === "已转选题") {
                              const idea = state.ideas.find((i) =>
                                i.sourceIds.some((s) => s.kind === "intelligence" && s.id === item.id)
                              );
                              if (idea) router.push(`/ideas/${idea.id}`);
                            } else {
                              dispatch({ type: "convert", source: { kind: "intelligence", id: item.id } });
                              toast.success("已将情报加入选题！", item.title);
                            }
                          }}
                        >
                          {item.status === "已转选题" ? "看选题" : "转选题"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Detail Panel */}
        {selectedItem && (
          <IntelligenceDetailDrawer
            item={selectedItem}
            onClose={() => selectItem(null)}
          />
        )}
      </div>

      <ImportIntelligenceDialog
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={(id) => selectItem(id)}
      />
    </MockBoundary>
  );
}
