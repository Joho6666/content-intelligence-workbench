"use client";
import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "../../lib/utils";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
}

type Listener = (toasts: ToastItem[]) => void;

let toastsState: ToastItem[] = [];
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l([...toastsState]));
}

export const toast = {
  success(message: string, description?: string) {
    const id = Math.random().toString(36).slice(2);
    toastsState = [...toastsState, { id, type: "success", message, description }];
    notify();
    setTimeout(() => {
      toastsState = toastsState.filter((t) => t.id !== id);
      notify();
    }, 3500);
  },
  error(message: string, description?: string) {
    const id = Math.random().toString(36).slice(2);
    toastsState = [...toastsState, { id, type: "error", message, description }];
    notify();
    setTimeout(() => {
      toastsState = toastsState.filter((t) => t.id !== id);
      notify();
    }, 4500);
  },
  info(message: string, description?: string) {
    const id = Math.random().toString(36).slice(2);
    toastsState = [...toastsState, { id, type: "info", message, description }];
    notify();
    setTimeout(() => {
      toastsState = toastsState.filter((t) => t.id !== id);
      notify();
    }, 3500);
  },
};

export function Toaster({ richColors }: { richColors?: boolean }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="系统通知"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full"
    >
      {toasts.map((t) => {
        const Icon =
          t.type === "success"
            ? CheckCircle2
            : t.type === "error"
            ? AlertCircle
            : Info;
        const colorStyle =
          t.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : t.type === "error"
            ? "border-red-200 bg-red-50 text-red-900"
            : "border-blue-200 bg-blue-50 text-blue-900";

        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-xs transition-all animate-in slide-in-from-bottom-3 fade-in duration-200 bg-white",
              richColors ? colorStyle : "border-[#e7ebf2] bg-white text-[#152039]"
            )}
          >
            <Icon
              className={cn(
                "size-5 shrink-0 mt-0.5",
                t.type === "success"
                  ? "text-emerald-600"
                  : t.type === "error"
                  ? "text-red-500"
                  : "text-blue-500"
              )}
            />
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-semibold leading-tight">{t.message}</div>
              {t.description && (
                <div className="mt-1 text-xs opacity-80 leading-relaxed">
                  {t.description}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                toastsState = toastsState.filter((item) => item.id !== t.id);
                notify();
              }}
              className="rounded-md p-1 opacity-60 hover:opacity-100 hover:bg-black/5 transition-opacity"
              aria-label="关闭通知"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
