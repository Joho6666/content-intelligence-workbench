"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useWorkbench } from "../../hooks/use-workbench";
import { apiRequest } from "../../lib/api-client";
import {
  canonicalUrl,
  draftMarkdown,
  extractShare,
  latestSnapshots,
  metricsSchema,
  operationPlatforms,
  stages,
  totalMetric,
  type Account,
  type Content,
  type Draft,
  type Metrics,
  type OpsIdea,
  type PublicState,
  type Source,
} from "./model";
import {
  dateText,
  download,
  Empty,
  Field,
  ImageUpload,
  localDateValue,
  MetricFields,
  metricLabels,
  metricText,
  Modal,
  Notice,
  Panel,
  toISO,
} from "./ui";

export type View =
  | "today"
  | "inbox"
  | "intelligence"
  | "ideas"
  | "detail"
  | "production"
  | "calendar"
  | "analytics"
  | "settings"
  | "competitors"
  | "patterns"
  | "workflows";
function subscribeAccount(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("ciw-account-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("ciw-account-change", callback);
  };
}
function readAccount() {
  return localStorage.getItem("ciw-account") || "";
}
function useOps() {
  const { state: legacy, refresh, error: loadError, loading } = useWorkbench();
  const state = legacy as unknown as PublicState;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const run = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T | undefined> => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      setError("");
      try {
        const result = await operation();
        await refresh();
        return result;
      } catch (error) {
        setError((error as Error).message);
        return;
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    [refresh],
  );
  const request = <T,>(path: string, body: unknown, method = "POST") =>
    run(() =>
      apiRequest<T>(`/api/v1/${path}`, {
        method,
        body: method === "DELETE" ? undefined : JSON.stringify(body),
      }),
    );
  return {
    state,
    refresh,
    error: error || loadError,
    setError,
    busy,
    run,
    request,
    loading,
  };
}
export function OperationsPage({ view }: { view: View }) {
  const ops = useOps();
  const { state } = ops;
  const selectedAccount = useSyncExternalStore(
    subscribeAccount,
    readAccount,
    () => "",
  );
  const selected = state.accounts?.find((a) => a.id === selectedAccount);
  const choose = (id: string) => {
    localStorage.setItem("ciw-account", id);
    window.dispatchEvent(new Event("ciw-account-change"));
  };
  const labels: Record<View, [string, string]> = {
    today: ["今日工作台", "从一条参考内容开始，完成今天的创作。"],
    inbox: ["灵感 Inbox", "保存分享链接与正文，分析后转为可执行选题。"],
    intelligence: ["情报库", "积累可追溯的参考材料，区分事实和创作建议。"],
    ideas: ["选题", "按账号推进选题，每个平台保留独立稿件。"],
    detail: ["选题与稿件", "手工修改会保留；AI 结果预览后由你采用。"],
    production: ["内容执行", "管理制作状态、素材、排期和实际发布记录。"],
    calendar: ["发布日历", "查看并修改排期，发布后登记真实时间与链接。"],
    analytics: ["数据复盘", "录入真实表现快照，找到下一次值得尝试的内容。"],
    settings: ["设置", "账号档案、AI 连接、存储状态与备份恢复。"],
    competitors: ["参考账号", "手动维护对手资料；自动采集尚未接入。"],
    patterns: ["内容方法库", "从已分析的材料中沉淀切入点。"],
    workflows: ["工作流", "查看实际步骤与待办，按自己的节奏推进。"],
  };
  if (!state.workspace)
    return (
      <div className="op-root">
        <h1>{labels[view][0]}</h1>
        {ops.error ? (
          <p className="op-error" role="alert">
            {ops.error}
          </p>
        ) : (
          <p role="status">正在读取本机工作区…</p>
        )}
        <button onClick={() => void ops.refresh()}>重新连接</button>
        <Link href="/settings">设置</Link>
      </div>
    );
  return (
    <div className="op-root">
      <header className="page-head">
        <div>
          <h1>{labels[view][0]}</h1>
          <p>{labels[view][1]}</p>
        </div>
        <Field label="当前运营账号">
          <select
            aria-label="当前运营账号"
            value={selected?.id || ""}
            onChange={(e) => choose(e.target.value)}
          >
            <option value="">全部账号 / 未分配</option>
            {state.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.platform}
              </option>
            ))}
          </select>
        </Field>
      </header>
      {ops.error && (
        <p className="op-error" role="alert">
          {ops.error}
        </p>
      )}
      {!state.accounts.length && view !== "settings" && (
        <Notice>
          先在<Link href="/settings">设置中创建运营账号</Link>
          ，让分析和稿件贴合你的领域与受众。
        </Notice>
      )}
      {view === "today" && <Today ops={ops} accountId={selected?.id} />}
      {(view === "inbox" || view === "intelligence") && (
        <Sources kind={view} ops={ops} accountId={selected?.id} />
      )}
      {view === "ideas" && <Ideas ops={ops} accountId={selected?.id} />}
      {view === "detail" && <IdeaDetail ops={ops} accountId={selected?.id} />}
      {(view === "production" || view === "calendar") && (
        <Publishing
          ops={ops}
          accountId={selected?.id}
          calendar={view === "calendar"}
        />
      )}
      {view === "analytics" && <Analytics ops={ops} accountId={selected?.id} />}
      {view === "settings" && <Settings ops={ops} />}
      {view === "competitors" && <Competitors ops={ops} />}
      {view === "patterns" && (
        <Panel title="材料中提炼的内容切入点">
          {[...state.inbox, ...state.intelligence]
            .filter(
              (s) => s.analysis && (!selected || s.accountId === selected.id),
            )
            .map((s) => (
              <article className="op-row" key={s.id}>
                <Link
                  href={`/${state.inbox.some((item) => item.id === s.id) ? "inbox" : "intelligence"}?item=${s.id}`}
                >
                  {s.title}
                </Link>
                <ul>
                  {s.analysis!.angles.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
                <small>
                  {s.analysis!.model} · {dateText(s.analysis!.analyzedAt)}
                </small>
              </article>
            ))}
          {![...state.inbox, ...state.intelligence].some((s) => s.analysis) && (
            <Empty>完成第一条真实分析后，切入点会出现在这里。</Empty>
          )}
        </Panel>
      )}
      {view === "workflows" && (
        <div className="op-grid">
          <Panel title="实际运营流程">
            <ol className="op-steps">
              {[
                ["收集与补充原文", "/inbox"],
                ["分析与筛选", "/intelligence"],
                ["选题与稿件", "/ideas"],
                ["制作与排期", "/production"],
                ["发布与复盘", "/analytics"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href}>{label}</Link>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="能力状态">
            <p>手动导入、AI 分析、稿件、排期与复盘可在对应页面使用。</p>
            <p>
              自动采集、定时监测和自动发布尚未接入。当前没有后台自动采集任务。
            </p>
          </Panel>
        </div>
      )}
    </div>
  );
}
type Ops = ReturnType<typeof useOps>;
function AccountSelect({
  accounts,
  value,
  onChange,
  optional = true,
}: {
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
  optional?: boolean;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{optional ? "未分配" : "请选择运营账号"}</option>
      {accounts.map((a) => (
        <option value={a.id} key={a.id}>
          {a.name} · {a.platform}
        </option>
      ))}
    </select>
  );
}
function Today({ ops, accountId }: { ops: Ops; accountId?: string }) {
  const { state } = ops;
  const match = (row: { accountId: string | null }) =>
    !accountId || row.accountId === accountId;
  const sources = [...state.inbox, ...state.intelligence].filter(match);
  const ideas = state.ideas.filter(match);
  const content = state.content.filter(match);
  const week = new Date();
  week.setHours(0, 0, 0, 0);
  week.setDate(week.getDate() - ((week.getDay() + 6) % 7));
  return (
    <>
      <div className="stats">
        {[
          [
            "本周新增材料",
            sources.filter((s) => new Date(s.capturedAt) >= week).length,
          ],
          [
            "待分析材料",
            sources.filter((s) => !s.analysis && s.status !== "已归档").length,
          ],
          ["制作中内容", content.filter((c) => c.status === "制作中").length],
          ["已发布内容", content.filter((c) => c.status === "已发布").length],
        ].map(([label, value]) => (
          <div className="stat" key={label}>
            <div>
              <p className="eyebrow">{label}</p>
              <strong className="stat-value">{value}</strong>
            </div>
          </div>
        ))}
      </div>
      <div className="op-grid">
        <Panel title="下一步行动">
          <div className="op-actions">
            <Link className="op-primary" href="/inbox">
              添加参考内容
            </Link>
            <Link href="/ideas">
              继续写稿 · {ideas.filter((i) => i.status !== "已发布").length}
            </Link>
            <Link href="/calendar">查看排期</Link>
          </div>
          <h3>接下来要发布</h3>
          {content
            .filter((c) => c.status !== "已发布" && c.status !== "已归档")
            .sort((a, b) =>
              (a.scheduledAt || "9999").localeCompare(b.scheduledAt || "9999"),
            )
            .slice(0, 5)
            .map((c) => (
              <div key={c.id} className="op-row">
                <Link href="/production">{c.title}</Link>
                <small>
                  {c.platform} · {dateText(c.scheduledAt)} · {c.status}
                </small>
              </div>
            ))}
          {!content.some(
            (c) => c.status !== "已发布" && c.status !== "已归档",
          ) && (
            <Empty>暂无待发布任务。完成稿件后，创建制作任务和发布时间。</Empty>
          )}
        </Panel>
        <Panel title="最近真实操作">
          {state.events.slice(0, 8).map((e) => (
            <div className="op-row" key={e.id}>
              <Link href={e.href}>{e.text}</Link>
              <small>{dateText(e.at)}</small>
            </div>
          ))}
          {!state.events.length && (
            <Empty>你的收藏、编辑和发布操作会记录在这里。</Empty>
          )}
        </Panel>
      </div>
      <Notice>
        {state.storageMode}，数据保存在服务端。AI 密钥不会随业务备份导出。
      </Notice>
    </>
  );
}
function Sources({
  kind,
  ops,
  accountId,
}: {
  kind: "inbox" | "intelligence";
  ops: Ops;
  accountId?: string;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const [manualEditing, setEditing] = useState<Source | null>(null);
  const editing =
    manualEditing ||
    ops.state[kind].find((s) => s.id === params.get("item")) ||
    null;
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [platform, setPlatform] = useState("");

  const rows = ops.state[kind].filter(
    (s) =>
      (!accountId || s.accountId === accountId) &&
      (!status || s.status === status) &&
      (!platform || s.platform === platform) &&
      [s.title, s.originalContent, s.note, s.author, s.url, ...s.tags]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="op-toolbar">
        <input
          aria-label="搜索收藏"
          placeholder="搜索标题、原文、作者或链接"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="材料平台筛选"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        >
          <option value="">所有平台</option>
          {operationPlatforms.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select
          aria-label="材料状态筛选"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">所有状态</option>
          {["待补充", "待处理", "已转选题", "已归档"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button className="op-primary" onClick={() => setAdding(true)}>
          添加参考内容
        </button>
      </div>
      <Panel title={`共 ${rows.length} 条材料`}>
        {rows.map((source) => (
          <article className="op-row op-source" key={source.id}>
            <div>
              <button className="op-title" onClick={() => setEditing(source)}>
                {source.title}
              </button>
              <small>
                {source.platform} ·{" "}
                {ops.state.accounts.find((a) => a.id === source.accountId)
                  ?.name || "未分配"}{" "}
                · {dateText(source.capturedAt)}
              </small>
              <p>
                {source.analysis?.summary ||
                  source.originalContent.slice(0, 130) ||
                  "只有链接，请补充原文或视频字幕。"}
              </p>
              <span className="badge">{source.status}</span>
              {source.analysis && (
                <span className="badge badge-green">已分析</span>
              )}
            </div>
            <div className="op-actions">
              <button
                disabled={ops.busy}
                onClick={() =>
                  void ops.request(`${kind}/${source.id}/analyze`, {
                    accountId: accountId || source.accountId,
                  })
                }
              >
                AI 分析
              </button>
              <button
                disabled={ops.busy}
                onClick={() =>
                  void ops.request(`${kind}/${source.id}/convert`, {})
                }
              >
                转为选题
              </button>
            </div>
          </article>
        ))}
        {!rows.length && (
          <Empty>没有匹配的材料。粘贴抖音或小红书分享文本，开始收集。</Empty>
        )}
      </Panel>
      {(adding || editing) && (
        <Modal
          title={editing ? "编辑参考内容" : "添加参考内容"}
          close={() => {
            setAdding(false);
            setEditing(null);
            router.replace(`/${kind}`);
          }}
        >
          <SourceForm
            key={editing?.id || "new"}
            source={editing}
            kind={kind}
            ops={ops}
            accountId={accountId}
            done={() => {
              setAdding(false);
              setEditing(null);
              router.replace(`/${kind}`);
            }}
          />
        </Modal>
      )}
    </>
  );
}
function SourceForm({
  source,
  kind,
  ops,
  accountId,
  done,
}: {
  source: Source | null;
  kind: string;
  ops: Ops;
  accountId?: string;
  done: () => void;
}) {
  const [share, setShare] = useState("");
  const [title, setTitle] = useState(source?.title || "");
  const [url, setUrl] = useState(source?.url || "");
  const [platform, setPlatform] = useState<string>(
    source?.platform || "小红书",
  );
  const [body, setBody] = useState(source?.originalContent || "");
  const [note, setNote] = useState(source?.note || "");
  const [author, setAuthor] = useState(source?.author || "");
  const [tags, setTags] = useState(source?.tags.join(", ") || "");
  const [account, setAccount] = useState(source?.accountId || accountId || "");
  const [metrics, setMetrics] = useState(
    source?.metrics || metricsSchema.parse({}),
  );
  const [assets, setAssets] = useState(source?.assetIds || []);
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        try {
          if (url) canonicalUrl(url);
          const result = await ops.request(
            `${kind}${source ? "/" + source.id : ""}`,
            {
              title,
              platform,
              url,
              originalContent: body,
              note,
              author,
              tags: tags
                .split(/[,，]/)
                .map((t) => t.trim())
                .filter(Boolean),
              accountId: account || null,
              metrics,
              assetIds: assets,
              status: source?.status || "待处理",
            },
            source ? "PATCH" : "POST",
          );
          if (result) done();
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      {!source && (
        <Field
          label="粘贴平台分享文本"
          hint="只提取链接和平台，不自动读取网页内容。"
        >
          <textarea
            value={share}
            onChange={(e) => {
              setShare(e.target.value);
              const parsed = extractShare(e.target.value);
              if (parsed.url) {
                setUrl(parsed.url);
                setPlatform(parsed.platform);
              }
            }}
            placeholder="粘贴抖音 / 小红书分享内容…"
          />
        </Field>
      )}
      <Field label="标题 *">
        <input
          required
          maxLength={240}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <div className="op-grid">
        <Field label="平台">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            {operationPlatforms.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="用于哪个运营账号">
          <AccountSelect
            accounts={ops.state.accounts}
            value={account}
            onChange={setAccount}
          />
        </Field>
      </div>
      <Field label="原始链接">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
        />
      </Field>
      <Field
        label="正文 / 视频字幕"
        hint="AI 只分析这里的真实材料，只有链接时保留为待补充。"
      >
        <textarea
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>
      <div className="op-grid">
        <Field label="作者">
          <input value={author} onChange={(e) => setAuthor(e.target.value)} />
        </Field>
        <Field label="标签（逗号分隔）">
          <input value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>
      </div>
      <Field label="自己的观察与备注">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <ImageUpload assetIds={assets} onChange={setAssets} />
      <details>
        <summary>补充真实表现指标</summary>
        <MetricFields value={metrics} onChange={setMetrics} />
      </details>
      {source?.analysis && (
        <Panel title="已有分析">
          <p>{source.analysis.summary}</p>
          <h3>材料事实</h3>
          <ul>
            {source.analysis.facts.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
          <h3>创作建议</h3>
          <ul>
            {source.analysis.suggestions.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
          <small>
            {source.analysis.model} · {dateText(source.analysis.analyzedAt)}
          </small>
        </Panel>
      )}
      {(error || ops.error) && (
        <p role="alert" className="op-error">
          {error || ops.error}
        </p>
      )}
      <div className="op-actions">
        <button className="op-primary" disabled={ops.busy}>
          {ops.busy ? "保存中…" : "保存材料"}
        </button>
        {source && (
          <>
            <button
              type="button"
              disabled={ops.busy}
              onClick={async () => {
                const result = await ops.request(
                  `${kind}/${source.id}`,
                  { status: "已归档" },
                  "PATCH",
                );
                if (result) done();
              }}
            >
              归档
            </button>
            <button
              type="button"
              disabled={ops.busy}
              onClick={async () => {
                if (confirm("删除这条材料？有关联选题时将阻止删除。")) {
                  const result = await ops.request(
                    `${kind}/${source.id}`,
                    {},
                    "DELETE",
                  );
                  if (result) done();
                }
              }}
            >
              删除
            </button>
          </>
        )}
      </div>
    </form>
  );
}
function Ideas({ ops, accountId }: { ops: Ops; accountId?: string }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [core, setCore] = useState("");
  const [account, setAccount] = useState(accountId || "");
  const [search, setSearch] = useState("");
  const rows = ops.state.ideas.filter(
    (i) =>
      (!accountId || i.accountId === accountId) &&
      [i.title, i.core].join(" ").includes(search),
  );
  return (
    <>
      <div className="op-toolbar">
        <input
          aria-label="搜索选题"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索选题…"
        />
        <button className="op-primary" onClick={() => setAdding(true)}>
          新建选题
        </button>
      </div>
      <div className="op-kanban">
        {stages.map((stage) => (
          <Panel key={stage} title={stage}>
            {rows
              .filter((i) => i.status === stage)
              .map((i) => (
                <article className="op-idea" key={i.id}>
                  <Link href={`/ideas/${i.id}`}>{i.title}</Link>
                  <p>{i.angle || i.core.slice(0, 90)}</p>
                  <small>
                    {ops.state.accounts.find((a) => a.id === i.accountId)
                      ?.name || "未分配"}
                  </small>
                  <select
                    aria-label={`更改 ${i.title} 的状态`}
                    value={i.status}
                    disabled={ops.busy}
                    onChange={(e) =>
                      void ops.request(
                        `ideas/${i.id}`,
                        { status: e.target.value },
                        "PATCH",
                      )
                    }
                  >
                    {stages.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </article>
              ))}
            {!rows.some((i) => i.status === stage) && <Empty>暂无选题</Empty>}
          </Panel>
        ))}
      </div>
      {adding && (
        <Modal title="新建选题" close={() => setAdding(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await ops.request("ideas", {
                title,
                core,
                accountId: account || null,
                platforms: [
                  ops.state.accounts.find((a) => a.id === account)?.platform ||
                    "小红书",
                ],
              });
              if (result) {
                setAdding(false);
                setTitle("");
                setCore("");
              }
            }}
          >
            <Field label="标题 *">
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label="运营账号">
              <AccountSelect
                accounts={ops.state.accounts}
                value={account}
                onChange={setAccount}
              />
            </Field>
            <Field label="核心观点与依据">
              <textarea
                rows={5}
                value={core}
                onChange={(e) => setCore(e.target.value)}
              />
            </Field>
            {ops.error && <p className="op-error">{ops.error}</p>}
            <button disabled={ops.busy} className="op-primary">
              创建选题
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function IdeaDetail({ ops, accountId }: { ops: Ops; accountId?: string }) {
  const params = useParams<{ id: string }>();
  const idea = ops.state.ideas.find((i) => i.id === params.id);
  const [account, setAccount] = useState(accountId || idea?.accountId || "");
  const [platform, setPlatform] = useState<string>(
    () =>
      ops.state.accounts.find((a) => a.id === account)?.platform ||
      idea?.platforms[0] ||
      "小红书",
  );
  if (!idea)
    return (
      <Empty>
        选题不存在。<Link href="/ideas">返回选题列表</Link>
      </Empty>
    );
  const target = ops.state.accounts.find((a) => a.id === account);
  const draft = ops.state.drafts.find(
    (d) =>
      d.ideaId === idea.id &&
      d.accountId === account &&
      d.platform === platform,
  );
  return (
    <>
      <div className="op-actions">
        <Link href="/ideas">← 返回选题</Link>
        <select
          aria-label="选题状态"
          value={idea.status}
          onChange={(e) =>
            void ops.request(
              `ideas/${idea.id}`,
              { status: e.target.value },
              "PATCH",
            )
          }
        >
          {stages.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <Panel title={idea.title}>
        <IdeaNotes key={idea.id} idea={idea} ops={ops} />
        <div className="op-grid">
          <Field label="稿件运营账号">
            <AccountSelect
              accounts={ops.state.accounts}
              value={account}
              onChange={(id) => {
                setAccount(id);
                setPlatform(
                  ops.state.accounts.find((a) => a.id === id)?.platform ||
                    "小红书",
                );
              }}
              optional={false}
            />
          </Field>
          <Field label="稿件平台">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              {operationPlatforms
                .filter((p) => !["网页", "自己想到"].includes(p))
                .map((p) => (
                  <option key={p}>{p}</option>
                ))}
            </select>
          </Field>
        </div>
        {target && (
          <Notice>
            {target.name}：{target.domain}；面向 {target.audience}；目标：
            {target.goal || "尚未填写"}
          </Notice>
        )}
      </Panel>
      {target ? (
        <DraftEditor
          key={`${idea.id}:${account}:${platform}`}
          ops={ops}
          idea={idea}
          account={target}
          platform={platform}
          existing={draft}
        />
      ) : (
        <Empty>
          选择运营账号后开始写稿。可以先手工编辑，也可以生成 AI 草稿。
        </Empty>
      )}
    </>
  );
}
function IdeaNotes({ idea, ops }: { idea: OpsIdea; ops: Ops }) {
  const [title, setTitle] = useState(idea.title);
  const [core, setCore] = useState(idea.core);
  const [angle, setAngle] = useState(idea.angle);
  const [account, setAccount] = useState(idea.accountId || "");
  return (
    <details>
      <summary>编辑选题与参考依据</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await ops.request(
            `ideas/${idea.id}`,
            { title, core, angle, accountId: account || null },
            "PATCH",
          );
        }}
      >
        <Field label="选题标题">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="选题所属账号">
          <AccountSelect
            accounts={ops.state.accounts}
            value={account}
            onChange={setAccount}
          />
        </Field>
        <Field label="核心观点">
          <textarea value={core} onChange={(e) => setCore(e.target.value)} />
        </Field>
        <Field label="切入点">
          <textarea value={angle} onChange={(e) => setAngle(e.target.value)} />
        </Field>
        <button disabled={ops.busy}>保存选题</button>
      </form>
      <ul>
        {idea.sourceIds.map((ref) => (
          <li key={ref.id}>
            <Link href={`/${ref.kind}?item=${ref.id}`}>
              {ops.state[ref.kind].find((s) => s.id === ref.id)?.title ||
                ref.id}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
const draftFields = {
  title: "稿件标题",
  hook: "开场 Hook",
  outline: "内容大纲",
  script: "视频脚本",
  caption: "平台发布文案",
  materials: "素材清单",
} as const;
type DraftText = Pick<Draft, keyof typeof draftFields>;
function DraftEditor({
  ops,
  idea,
  account,
  platform,
  existing,
}: {
  ops: Ops;
  idea: OpsIdea;
  account: Account;
  platform: string;
  existing?: Draft;
}) {
  const storageKey = `ciw-unsaved:${idea.id}:${account.id}:${platform}`;
  const initial: DraftText = {
    title: existing?.title || idea.title,
    hook: existing?.hook || "",
    outline: existing?.outline || "",
    script: existing?.script || "",
    caption: existing?.caption || "",
    materials: existing?.materials || "",
  };
  const [text, setText] = useState(initial);
  const latest = useRef(text);
  const record = useRef(existing);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState("");
  const [status, setStatus] = useState(
    existing ? "已保存" : "开始编辑后自动保存",
  );
  const [preview, setPreview] = useState<
    (DraftText & { model: string; sourceIds: string[] }) | null
  >(null);
  const [generating, setGenerating] = useState(false);
  const model = useRef(existing?.model || "手动编辑");
  const sourceIds = useRef(
    existing?.sourceIds || idea.sourceIds.map((s) => s.id),
  );
  const [recovery, setRecovery] = useState<{
    text: DraftText;
    version?: number;
  } | null>(null);
  useEffect(() => {
    void Promise.resolve().then(() => {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          setRecovery(saved);
        } catch {
          /* Invalid local recovery is not applied. */
        }
      }
    });
  }, [storageKey]);
  const edit = (next: DraftText) => {
    latest.current = next;
    setText(next);
    setDirty(true);
    setStatus("有修改，等待保存");
    localStorage.setItem(
      storageKey,
      JSON.stringify({ text: next, version: record.current?.version }),
    );
  };
  const refresh = ops.refresh;
  const save = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    const snapshot = { ...latest.current };
    try {
      const current = record.current;
      const saved = await apiRequest<Draft>(
        `/api/v1/drafts${current ? "/" + current.id : ""}`,
        {
          method: current ? "PATCH" : "POST",
          body: JSON.stringify({
            ...snapshot,
            ideaId: idea.id,
            accountId: account.id,
            platform,
            model: model.current,
            sourceIds: sourceIds.current,
            version: current?.version,
          }),
        },
      );
      record.current = saved;
      setStatus("已保存 · " + dateText(saved.updatedAt));
      if (JSON.stringify(snapshot) === JSON.stringify(latest.current)) {
        setDirty(false);
        localStorage.removeItem(storageKey);
      } else {
        setDirty(true);
        localStorage.setItem(
          storageKey,
          JSON.stringify({ text: latest.current, version: saved.version }),
        );
      }
      await refresh();
    } catch (e) {
      setSaveError((e as Error).message);
      setStatus("保存失败，修改保留在本机");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [idea.id, account.id, platform, storageKey, refresh]);
  useEffect(() => {
    if (!dirty || saving || saveError || recovery) return;
    const timer = setTimeout(() => void save(), 1200);
    return () => clearTimeout(timer);
  }, [dirty, saving, text, save, saveError, recovery]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  return (
    <Panel
      title={`${platform} · ${account.name} 稿件`}
      action={<small role="status">{status}</small>}
    >
      {recovery && (
        <Notice>
          发现未保存草稿。
          <button
            onClick={() => {
              if (
                recovery.version !== undefined &&
                record.current?.version !== recovery.version
              ) {
                setSaveError(
                  "服务端版本已更新，先复制恢复文本再合并，不能自动覆盖。",
                );
                return;
              }
              edit(recovery.text);
              setRecovery(null);
            }}
          >
            恢复草稿
          </button>
          <button
            onClick={() => {
              download(
                "未保存草稿.json",
                JSON.stringify(recovery.text, null, 2),
                "application/json",
              );
            }}
          >
            下载恢复文本
          </button>
          <button
            onClick={() => {
              if (confirm("丢弃本机未保存草稿？")) {
                localStorage.removeItem(storageKey);
                setRecovery(null);
              }
            }}
          >
            丢弃
          </button>
        </Notice>
      )}
      <div className="op-actions">
        <button
          className="op-primary"
          disabled={generating}
          onClick={async () => {
            setGenerating(true);
            setSaveError("");
            try {
              const generated = await apiRequest<
                DraftText & { model: string; sourceIds: string[] }
              >(`/api/v1/ideas/${idea.id}/generate`, {
                method: "POST",
                body: JSON.stringify({ accountId: account.id, platform }),
              });
              setPreview(generated);
            } catch (e) {
              setSaveError((e as Error).message);
            } finally {
              setGenerating(false);
            }
          }}
        >
          {generating ? "生成中…" : "生成 AI 草稿并预览"}
        </button>
        <button disabled={saving} onClick={() => void save()}>
          立即保存
        </button>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                draftMarkdown(
                  {
                    ...existing,
                    ...latest.current,
                    platform,
                    sourceIds: sourceIds.current,
                    model: model.current,
                  } as Draft,
                  account.name,
                ),
              );
              setStatus("已复制稿件");
            } catch {
              setSaveError("无法访问剪贴板，请使用导出。");
            }
          }}
        >
          复制稿件
        </button>
        <button
          onClick={() =>
            download(
              `${text.title || "稿件"}-${platform}.md`,
              draftMarkdown(
                {
                  ...existing,
                  ...latest.current,
                  platform,
                  sourceIds: sourceIds.current,
                  model: model.current,
                } as Draft,
                account.name,
              ),
            )
          }
        >
          导出 Markdown
        </button>
      </div>
      {saveError && (
        <p className="op-error" role="alert">
          {saveError}
        </p>
      )}
      {Object.entries(draftFields).map(([key, label]) => (
        <Field key={key} label={label}>
          {key === "title" ? (
            <input
              value={text.title}
              onChange={(e) =>
                edit({ ...latest.current, title: e.target.value })
              }
            />
          ) : (
            <textarea
              rows={key === "script" || key === "caption" ? 7 : 4}
              value={text[key as keyof DraftText]}
              onChange={(e) =>
                edit({ ...latest.current, [key]: e.target.value })
              }
            />
          )}
        </Field>
      ))}
      <button
        className="op-primary"
        disabled={saving || ops.busy}
        onClick={async () => {
          await save();
          if (
            !record.current ||
            JSON.stringify({ ...latest.current }) !==
              JSON.stringify(
                Object.fromEntries(
                  Object.keys(draftFields).map((k) => [
                    k,
                    record.current![k as keyof DraftText],
                  ]),
                ),
              )
          )
            return;
          await ops.request("content", {
            title: latest.current.title || idea.title,
            platform,
            accountId: account.id,
            ideaId: idea.id,
            draftId: record.current.id,
            materials: latest.current.materials,
            status: "待制作",
          });
        }}
      >
        加入内容执行
      </button>
      <p className="op-muted">
        生成与重新生成都只打开预览。采用后才替换编辑区；每次稿件修改前保留服务端历史备份。
      </p>
      {preview && (
        <Modal title="AI 草稿预览" close={() => setPreview(null)}>
          {Object.entries(draftFields).map(([key, label]) => (
            <section key={key}>
              <h3>{label}</h3>
              <pre>{preview[key as keyof DraftText]}</pre>
            </section>
          ))}
          <small>模型：{preview.model}</small>
          <div className="op-actions">
            <button
              className="op-primary"
              onClick={() => {
                if (
                  Object.values(latest.current).some((v) => v.trim()) &&
                  !confirm("采用会替换编辑区当前内容，是否继续？")
                )
                  return;
                model.current = preview.model;
                sourceIds.current = preview.sourceIds;
                edit(
                  Object.fromEntries(
                    Object.keys(draftFields).map((k) => [
                      k,
                      preview[k as keyof DraftText],
                    ]),
                  ) as DraftText,
                );
                setPreview(null);
              }}
            >
              采用这份草稿
            </button>
            <button onClick={() => setPreview(null)}>保留原稿</button>
          </div>
        </Modal>
      )}
    </Panel>
  );
}
function Publishing({
  ops,
  accountId,
  calendar,
}: {
  ops: Ops;
  accountId?: string;
  calendar: boolean;
}) {
  const [editing, setEditing] = useState<Content | null>(null);
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const rows = ops.state.content.filter(
    (c) =>
      (!accountId || c.accountId === accountId) &&
      (!status || c.status === status),
  );
  const [year, m] = month.split("-").map(Number);
  const start = new Date(year, m - 1, 1);
  const offset = (start.getDay() + 6) % 7;
  const days = new Date(year, m, 0).getDate();
  const render = (c: Content) => (
    <button
      className="op-calendar-item"
      key={c.id}
      onClick={() => setEditing(c)}
    >
      <strong>{c.title}</strong>
      <small>
        {c.platform} · {c.status}
      </small>
    </button>
  );
  return (
    <>
      <div className="op-toolbar">
        {calendar && (
          <input
            type="month"
            aria-label="日历月份"
            value={month}
            onChange={(e) =>
              setMonth(e.target.value || new Date().toISOString().slice(0, 7))
            }
          />
        )}
        <select
          aria-label="执行状态筛选"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">所有状态</option>
          {["待制作", "制作中", "待发布", "已发布", "已归档"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button className="op-primary" onClick={() => setAdding(true)}>
          新建制作任务
        </button>
      </div>
      {calendar ? (
        <>
          <div className="op-calendar">
            {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
              <div className="op-day-name" key={d}>
                周{d}
              </div>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <div className="op-day blank" key={`blank-${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, "0")}`;
              return (
                <div className="op-day" key={date}>
                  <b>{i + 1}</b>
                  {rows
                    .filter(
                      (c) =>
                        localDateValue(
                          c.status === "已发布" ? c.publishedAt : c.scheduledAt,
                        ).slice(0, 10) === date,
                    )
                    .map(render)}
                </div>
              );
            })}
          </div>
          <Panel title="尚未排期">
            {rows
              .filter((c) => !c.scheduledAt && c.status !== "已发布")
              .map(render)}
            {!rows.some((c) => !c.scheduledAt && c.status !== "已发布") && (
              <Empty>所有制作任务已安排时间。</Empty>
            )}
          </Panel>
        </>
      ) : (
        <Panel title={`共 ${rows.length} 条内容`}>
          {rows.map((c) => (
            <article className="op-row op-source" key={c.id}>
              <div>
                <button className="op-title" onClick={() => setEditing(c)}>
                  {c.title}
                </button>
                <small>
                  {ops.state.accounts.find((a) => a.id === c.accountId)?.name ||
                    "未分配"}{" "}
                  · {c.platform} · {c.status}
                </small>
                <p>
                  {c.status === "已发布"
                    ? `实际发布 ${dateText(c.publishedAt)}`
                    : `排期 ${dateText(c.scheduledAt)}`}
                </p>
                {c.ideaId && (
                  <Link href={`/ideas/${c.ideaId}`}>打开选题与稿件</Link>
                )}
                {c.publishedUrl && (
                  <a href={c.publishedUrl} target="_blank" rel="noreferrer">
                    查看发布内容
                  </a>
                )}
              </div>
              <button onClick={() => setEditing(c)}>编辑 / 登记发布</button>
            </article>
          ))}
          {!rows.length && (
            <Empty>从稿件加入内容执行，或直接创建制作任务。</Empty>
          )}
        </Panel>
      )}
      {(editing || adding) && (
        <Modal
          title={editing ? "编辑制作与发布记录" : "新建制作任务"}
          close={() => {
            setEditing(null);
            setAdding(false);
          }}
        >
          <ContentForm
            key={editing?.id || "new"}
            row={editing}
            ops={ops}
            accountId={accountId}
            done={() => {
              setEditing(null);
              setAdding(false);
            }}
          />
        </Modal>
      )}
    </>
  );
}
function ContentForm({
  row,
  ops,
  accountId,
  done,
}: {
  row: Content | null;
  ops: Ops;
  accountId?: string;
  done: () => void;
}) {
  const [title, setTitle] = useState(row?.title || "");
  const [account, setAccount] = useState(row?.accountId || accountId || "");
  const [platform, setPlatform] = useState<string>(row?.platform || "小红书");
  const [status, setStatus] = useState(row?.status || "待制作");
  const [scheduled, setScheduled] = useState(localDateValue(row?.scheduledAt));
  const [published, setPublished] = useState(localDateValue(row?.publishedAt));
  const [url, setUrl] = useState(row?.publishedUrl || "");
  const [materials, setMaterials] = useState(row?.materials || "");
  const [assets, setAssets] = useState(row?.assetIds || []);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const result = await ops.request(
          `content${row ? "/" + row.id : ""}`,
          {
            title,
            accountId: account || null,
            platform,
            status,
            scheduledAt: toISO(scheduled),
            publishedAt: toISO(published),
            publishedUrl: url,
            materials,
            assetIds: assets,
          },
          row ? "PATCH" : "POST",
        );
        if (result) done();
      }}
    >
      <Field label="内容标题 *">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <div className="op-grid">
        <Field label="运营账号">
          <AccountSelect
            accounts={ops.state.accounts}
            value={account}
            onChange={setAccount}
          />
        </Field>
        <Field label="发布平台">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            {operationPlatforms.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="制作状态">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Content["status"])}
          >
            {["待制作", "制作中", "待发布", "已发布", "已归档"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="计划发布时间">
          <input
            type="datetime-local"
            value={scheduled}
            onChange={(e) => setScheduled(e.target.value)}
          />
        </Field>
      </div>
      <Field label="素材与制作清单">
        <textarea
          rows={5}
          value={materials}
          onChange={(e) => setMaterials(e.target.value)}
        />
      </Field>
      <ImageUpload assetIds={assets} onChange={setAssets} />
      <Field label="实际发布时间">
        <input
          type="datetime-local"
          value={published}
          onChange={(e) => setPublished(e.target.value)}
          required={status === "已发布"}
        />
      </Field>
      <Field label="真实发布链接" hint="发布由你在平台完成，这里登记结果。">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required={status === "已发布"}
        />
      </Field>
      {ops.error && <p className="op-error">{ops.error}</p>}
      <div className="op-actions">
        <button className="op-primary" disabled={ops.busy}>
          保存内容记录
        </button>
        {row && (
          <button
            type="button"
            disabled={ops.busy}
            onClick={async () => {
              if (confirm("删除这条制作任务及其表现快照？")) {
                if (await ops.request(`content/${row.id}`, {}, "DELETE"))
                  done();
              }
            }}
          >
            删除任务
          </button>
        )}
      </div>
    </form>
  );
}
function Analytics({ ops, accountId }: { ops: Ops; accountId?: string }) {
  const [record, setRecord] = useState<Content | null>(null);
  const [review, setReview] = useState<{
    result: {
      summary: string;
      findings: { contentId: string; observation: string }[];
      nextSteps: string[];
    };
    model: string;
    generatedAt: string;
  } | null>(null);
  const [period, setPeriod] = useState("30");
  const [clock] = useState(() => Date.now());
  const content = ops.state.content.filter(
    (c) => c.status === "已发布" && (!accountId || c.accountId === accountId),
  );
  const snapshots = ops.state.snapshots.filter((s) =>
    content.some((c) => c.id === s.contentId),
  );
  const latest = latestSnapshots(snapshots);
  const cutoff = clock - Number(period) * 86400000;
  const recent = snapshots
    .filter((s) => new Date(s.capturedAt).getTime() >= cutoff)
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  return (
    <>
      <div className="op-toolbar">
        <select
          aria-label="快照时间范围"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="7">最近 7 天</option>
          <option value="30">最近 30 天</option>
          <option value="365">最近一年</option>
        </select>
        <button
          className="op-primary"
          disabled={ops.busy}
          onClick={async () => {
            const result = await ops.request<typeof review>(
              "analytics/review",
              { accountId: accountId || null },
            );
            if (result) setReview(result);
          }}
        >
          生成真实数据复盘
        </button>
      </div>
      <div className="stats">
        {(["views", "likes", "saves", "leads"] as const).map((key) => (
          <div className="stat" key={key}>
            <div>
              <p className="eyebrow">{metricLabels[key]}（最新累计）</p>
              <strong className="stat-value">
                {metricText(totalMetric(snapshots, key))}
              </strong>
              <small>按每条内容最新快照计算</small>
            </div>
          </div>
        ))}
      </div>
      <Panel title="已发布内容表现">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>内容</th>
                <th>账号 / 平台</th>
                <th>发布</th>
                <th>播放 / 阅读</th>
                <th>点赞</th>
                <th>收藏</th>
                <th>快照时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {content.map((c) => {
                const s = latest.find((s) => s.contentId === c.id);
                return (
                  <tr key={c.id}>
                    <td>
                      <a href={c.publishedUrl} target="_blank" rel="noreferrer">
                        {c.title}
                      </a>
                    </td>
                    <td>
                      {
                        ops.state.accounts.find((a) => a.id === c.accountId)
                          ?.name
                      }{" "}
                      / {c.platform}
                    </td>
                    <td>{dateText(c.publishedAt)}</td>
                    <td>{metricText(s?.metrics.views)}</td>
                    <td>{metricText(s?.metrics.likes)}</td>
                    <td>{metricText(s?.metrics.saves)}</td>
                    <td>{dateText(s?.capturedAt)}</td>
                    <td>
                      <button onClick={() => setRecord(c)}>录入表现</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!content.length && (
          <Empty>先在内容执行中登记真实发布，再录入表现。</Empty>
        )}
      </Panel>
      <Panel title="累计表现变化记录">
        <Notice>
          每行是采集时的累计数，不把同一内容的多次累计数相加。不同内容和平台分别展示，不推断缺失日期。
        </Notice>
        {recent.map((s) => (
          <div className="op-row" key={s.id}>
            <strong>{content.find((c) => c.id === s.contentId)?.title}</strong>
            <small>
              {dateText(s.capturedAt)} · 播放 / 阅读{" "}
              {metricText(s.metrics.views)} · 点赞 {metricText(s.metrics.likes)}{" "}
              · 获客 {metricText(s.metrics.leads)}
            </small>
          </div>
        ))}
        {!recent.length && <Empty>当前时间范围内尚无表现快照。</Empty>}
      </Panel>
      {review && (
        <Panel title="AI 复盘">
          <p>{review.result.summary}</p>
          {review.result.findings.map((f, i) => (
            <p key={i}>
              <strong>
                {content.find((c) => c.id === f.contentId)?.title ||
                  "来源待核验"}
                ：
              </strong>
              {f.observation}
            </p>
          ))}
          <ul>
            {review.result.nextSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          <small>
            {review.model} · {dateText(review.generatedAt)}
          </small>
        </Panel>
      )}
      {record && (
        <Modal
          title={`录入表现 · ${record.title}`}
          close={() => setRecord(null)}
        >
          <SnapshotForm
            content={record}
            ops={ops}
            done={() => setRecord(null)}
          />
        </Modal>
      )}
    </>
  );
}
function SnapshotForm({
  content,
  ops,
  done,
}: {
  content: Content;
  ops: Ops;
  done: () => void;
}) {
  const [metrics, setMetrics] = useState<Metrics>(metricsSchema.parse({}));
  const [at, setAt] = useState(localDateValue(new Date().toISOString()));
  const [note, setNote] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          await ops.request("snapshots", {
            contentId: content.id,
            capturedAt: toISO(at),
            metrics,
            note,
          })
        )
          done();
      }}
    >
      <Notice>填写平台当前显示的累计数据；不知道的字段留空。</Notice>
      <Field label="采集时间 *">
        <input
          type="datetime-local"
          required
          value={at}
          onChange={(e) => setAt(e.target.value)}
        />
      </Field>
      <MetricFields value={metrics} onChange={setMetrics} />
      <Field label="数据来源与备注">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {ops.error && <p className="op-error">{ops.error}</p>}
      <button className="op-primary" disabled={ops.busy}>
        保存表现快照
      </button>
    </form>
  );
}
function Settings({ ops }: { ops: Ops }) {
  const [editing, setEditing] = useState<Account | null>(null);
  const [adding, setAdding] = useState(false);
  const [connection, setConnection] = useState({
    baseUrl: "",
    model: "",
    configured: false,
  });
  const [key, setKey] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [backupError, setBackupError] = useState("");
  useEffect(() => {
    void apiRequest<typeof connection>("/api/v1/connection")
      .then(setConnection)
      .catch((e) => setBackupError(e.message));
  }, []);
  return (
    <>
      <Panel
        title="运营账号档案"
        action={
          <button className="op-primary" onClick={() => setAdding(true)}>
            添加账号
          </button>
        }
      >
        {ops.state.accounts.map((a) => (
          <article className="op-row op-source" key={a.id}>
            <div>
              <strong>
                {a.name} · {a.platform}
              </strong>
              <p>
                {a.domain} · {a.audience}
              </p>
              <small>
                语气：{a.tone || "未设置"}；目标：{a.goal || "未设置"}
              </small>
            </div>
            <button onClick={() => setEditing(a)}>编辑账号</button>
          </article>
        ))}
        {!ops.state.accounts.length && (
          <Empty>
            按不同领域创建账号，例如 AI 工具分享、酒店运营或生活方式。
          </Empty>
        )}
      </Panel>
      <div className="op-grid">
        <Panel title="AI 连接">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setMessage("");
              const result = await ops.request<typeof connection>(
                "connection",
                {
                  baseUrl: connection.baseUrl,
                  model: connection.model,
                  apiKey: key,
                },
                "PUT",
              );
              if (result) {
                setConnection(result);
                setKey("");
                setMessage("连接配置已保存到本机服务端。");
              }
            }}
          >
            <Field label="接口 Base URL">
              <input
                type="url"
                required
                value={connection.baseUrl}
                onChange={(e) =>
                  setConnection({ ...connection, baseUrl: e.target.value })
                }
                placeholder="https://api.deepseek.com/v1"
              />
            </Field>
            <Field label="模型">
              <input
                required
                value={connection.model}
                onChange={(e) =>
                  setConnection({ ...connection, model: e.target.value })
                }
              />
            </Field>
            <Field
              label="API Key"
              hint={
                connection.configured
                  ? "已配置；留空保留现有密钥。"
                  : "尚未配置，填写后才能真实分析。"
              }
            >
              <input
                type="password"
                autoComplete="off"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </Field>
            <div className="op-actions">
              <button className="op-primary" disabled={ops.busy}>
                保存连接
              </button>
              <button
                type="button"
                disabled={ops.busy}
                onClick={async () => {
                  setMessage("");
                  if (await ops.request("connection/test", {}))
                    setMessage("真实接口连接测试通过。");
                }}
              >
                测试已保存连接
              </button>
              <button
                type="button"
                disabled={ops.busy}
                onClick={async () => {
                  if (confirm("清除本机保存的 AI 密钥？")) {
                    const result = await ops.request<typeof connection>(
                      "connection",
                      {
                        baseUrl: connection.baseUrl,
                        model: connection.model,
                        clearKey: true,
                      },
                      "PUT",
                    );
                    if (result) setConnection(result);
                  }
                }}
              >
                清除密钥
              </button>
            </div>
            {message && <Notice>{message}</Notice>}
          </form>
        </Panel>
        <Panel title="数据与备份">
          <p>
            当前存储：<strong>{ops.state.storageMode}</strong>
          </p>
          <p>工作区：{ops.state.workspace.name}</p>
          <p className="op-muted">
            业务备份包含记录和参考图片，不包含 API 密钥或 Supabase
            身份凭据。更换浏览器不会创建新工作区。
          </p>
          <a className="op-button" href="/api/v1/backup" download>
            下载完整业务备份
          </a>
          <Field label="恢复业务备份">
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Field>
          <button
            disabled={!file || ops.busy}
            onClick={async () => {
              if (
                !file ||
                !confirm(
                  "恢复将替换当前业务记录。服务端会先备份现有数据，是否继续？",
                )
              )
                return;
              setBackupError("");
              try {
                if (file.size > 60 * 1024 * 1024)
                  throw new Error("备份最大 60MB。");
                const backup = JSON.parse(await file.text());
                if (await ops.request("backup", { backup, confirm: true }))
                  setMessage("备份已恢复。");
              } catch (e) {
                setBackupError((e as Error).message);
              }
            }}
          >
            确认恢复
          </button>
          {backupError && <p className="op-error">{backupError}</p>}
          <hr />
          <h3>未使用附件</h3>
          {ops.state.assets
            .filter(
              (asset) =>
                ![
                  ...ops.state.inbox,
                  ...ops.state.intelligence,
                  ...ops.state.content,
                ].some((row) => row.assetIds.includes(asset.id)),
            )
            .map((asset) => (
              <div className="op-row" key={asset.id}>
                <a
                  href={`/api/v1/assets/${asset.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {asset.name}
                </a>
                <button
                  disabled={ops.busy}
                  onClick={() => {
                    if (confirm("永久删除这个未引用附件？"))
                      void ops.request(`assets/${asset.id}`, {}, "DELETE");
                  }}
                >
                  删除附件
                </button>
              </div>
            ))}
          <h3>采集与发布能力</h3>
          <p>抖音、小红书：手动分享文本、正文和图片导入。</p>
          <p>自动采集与自动发布尚未接入；发布由你在平台完成。</p>
          <button onClick={() => void ops.refresh()}>重新读取工作区</button>
        </Panel>
      </div>
      {(adding || editing) && (
        <Modal
          title={editing ? "编辑运营账号" : "添加运营账号"}
          close={() => {
            setAdding(false);
            setEditing(null);
          }}
        >
          <AccountForm
            key={editing?.id || "new"}
            account={editing}
            ops={ops}
            done={() => {
              setAdding(false);
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}
function AccountForm({
  account,
  ops,
  done,
}: {
  account: Account | null;
  ops: Ops;
  done: () => void;
}) {
  const [form, setForm] = useState({
    name: account?.name || "",
    platform: account?.platform || "小红书",
    domain: account?.domain || "",
    audience: account?.audience || "",
    tone: account?.tone || "",
    goal: account?.goal || "",
  });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          await ops.request(
            `accounts${account ? "/" + account.id : ""}`,
            form,
            account ? "PATCH" : "POST",
          )
        )
          done();
      }}
    >
      {[
        ["name", "账号名称 *"],
        ["domain", "内容领域 *"],
        ["audience", "目标受众 *"],
        ["tone", "表达语气"],
        ["goal", "运营目标"],
      ].map(([key, label]) => (
        <Field key={key} label={label}>
          <input
            required={["name", "domain", "audience"].includes(key)}
            value={form[key as keyof typeof form]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        </Field>
      ))}
      <Field label="主要平台">
        <select
          value={form.platform}
          onChange={(e) =>
            setForm({
              ...form,
              platform: e.target.value as Account["platform"],
            })
          }
        >
          {operationPlatforms.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </Field>
      {ops.error && <p className="op-error">{ops.error}</p>}
      <div className="op-actions">
        <button className="op-primary" disabled={ops.busy}>
          保存账号
        </button>
        {account && (
          <button
            type="button"
            disabled={ops.busy}
            onClick={async () => {
              if (confirm("删除这个账号档案？有关联记录时将阻止删除。")) {
                if (await ops.request(`accounts/${account.id}`, {}, "DELETE"))
                  done();
              }
            }}
          >
            删除账号
          </button>
        )}
      </div>
    </form>
  );
}
function Competitors({ ops }: { ops: Ops }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState("小红书");
  const [description, setDescription] = useState("");
  const [followers, setFollowers] = useState("");
  return (
    <>
      <Notice>
        这里维护手动参考账号。收藏具体内容后可以进行真实分析；尚无定时监测或自动更新粉丝数据。
      </Notice>
      <Panel
        title="参考账号"
        action={<button onClick={() => setAdding(true)}>添加参考账号</button>}
      >
        {ops.state.competitors.map((c) => (
          <article className="op-row op-source" key={c.id}>
            <div>
              <strong>
                {c.name} · {c.platform}
              </strong>
              <small>
                {c.handle} · 粉丝 {metricText(c.followers)} ·{" "}
                {c.metricsVerified ? "手动录入" : "旧数据待核验"}
              </small>
              <p>{c.description}</p>
            </div>
            <button
              disabled={ops.busy}
              onClick={() => {
                if (confirm("删除参考账号？"))
                  void ops.request(`competitors/${c.id}`, {}, "DELETE");
              }}
            >
              删除
            </button>
          </article>
        ))}
        {!ops.state.competitors.length && (
          <Empty>添加你希望学习的创作者，记录其定位和你的观察。</Empty>
        )}
      </Panel>
      {adding && (
        <Modal title="添加参考账号" close={() => setAdding(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await ops.request("competitors", {
                  name,
                  handle,
                  platform,
                  description,
                  followers: followers ? Number(followers) : null,
                })
              ) {
                setAdding(false);
                setName("");
                setHandle("");
                setDescription("");
                setFollowers("");
              }
            }}
          >
            <Field label="名称">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="账号标识 / 主页链接">
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </Field>
            <Field label="平台">
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                {operationPlatforms.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="粉丝（不知道请留空）">
              <input
                type="number"
                min="0"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
              />
            </Field>
            <Field label="观察与定位">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            {ops.error && <p className="op-error">{ops.error}</p>}
            <button className="op-primary" disabled={ops.busy}>
              保存参考账号
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
