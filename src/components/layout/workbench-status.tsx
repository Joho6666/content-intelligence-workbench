"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useWorkbench } from "../../hooks/use-workbench";

export function WorkbenchStatus() {
  const { loading, error, refresh } = useWorkbench();
  if (!loading && !error) return null;
  return (
    <div className={error ? "backend-status is-error" : "backend-status"} role={error ? "alert" : "status"}>
      {error ? <span>{error}</span> : <><Loader2 className="size-4 animate-spin" /> 正在连接本地数据服务…</>}
      {error && <button type="button" onClick={() => void refresh()} aria-label="重试连接数据服务"><RefreshCw className="size-4" /> 重试</button>}
    </div>
  );
}
