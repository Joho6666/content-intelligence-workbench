"use client";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { apiRequest } from "../../lib/api-client";
import type { Metrics } from "./model";
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="op-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel op-panel">
      <div className="section-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="op-empty">{children}</div>;
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="op-notice" role="status">
      {children}
    </p>
  );
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const node = ref.current!;
    const selector =
      "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]";
    (node.querySelector(selector) as HTMLElement)?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const elements = [...node.querySelectorAll<HTMLElement>(selector)];
        const first = elements[0],
          last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="op-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        ref={ref}
        className="op-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button aria-label="关闭" onClick={close}>
            关闭
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function metricText(n: number | null | undefined) {
  return n == null ? "未录入" : n.toLocaleString("zh-CN");
}
export function dateText(s: string | null | undefined) {
  return s
    ? new Date(s).toLocaleString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "未设置";
}
export const metricLabels: Record<keyof Metrics, string> = {
  views: "播放 / 阅读",
  likes: "点赞",
  comments: "评论",
  saves: "收藏",
  shares: "分享",
  leads: "获客数",
};
export function MetricFields({
  value,
  onChange,
}: {
  value: Metrics;
  onChange: (value: Metrics) => void;
}) {
  return (
    <div className="op-grid three">
      {Object.entries(metricLabels).map(([key, label]) => (
        <Field key={key} label={label}>
          <input
            type="number"
            min="0"
            step="1"
            value={value[key as keyof Metrics] ?? ""}
            placeholder="未录入"
            onChange={(e) =>
              onChange({
                ...value,
                [key]: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </Field>
      ))}
    </div>
  );
}
export function localDateValue(s: string | null | undefined) {
  if (!s) return "";
  const d = new Date(s);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function toISO(s: string) {
  return s ? new Date(s).toISOString() : null;
}
export function download(
  name: string,
  content: string,
  type = "text/markdown;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name.replace(/[\\/:*?"<>|]/g, "-");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ImageUpload({
  assetIds,
  onChange,
}: {
  assetIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <Field
        label="参考图片"
        hint="PNG / JPEG / WebP，每张最大 5MB；图片用于参考与备份，目前 AI 分析读取你填写的正文。"
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError("");
            try {
              if (file.size > 5 * 1024 * 1024)
                throw new Error("图片最大 5MB。");
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () =>
                  resolve(String(reader.result).split(",")[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
              const asset = await apiRequest<{ id: string }>("/api/v1/assets", {
                method: "POST",
                body: JSON.stringify({
                  name: file.name,
                  mime: file.type,
                  base64,
                }),
              });
              onChange([...assetIds, asset.id]);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </Field>
      <div className="op-assets">
        {assetIds.map((id) => (
          <div key={id}>
            <a href={`/api/v1/assets/${id}`} target="_blank" rel="noreferrer">
              <img src={`/api/v1/assets/${id}`} alt="参考图片" />
            </a>
            <button
              type="button"
              onClick={() => onChange(assetIds.filter((x) => x !== id))}
            >
              移除引用
            </button>
          </div>
        ))}
      </div>
      {error && <p className="op-error">{error}</p>}
    </div>
  );
}
