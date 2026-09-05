"use client";
import * as React from "react";
import { cn } from "../../lib/utils";

interface PopoverContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const PopoverContext = React.createContext<PopoverContextType | null>(null);

export function Popover({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div ref={containerRef} className="relative inline-block text-left">
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({
  children,
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) return null;

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        if (typeof child.props.onClick === "function") {
          child.props.onClick(e);
        }
        ctx.setOpen(!ctx.open);
      },
      "aria-haspopup": "dialog",
      "aria-expanded": ctx.open,
    });
  }

  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      aria-haspopup="dialog"
      aria-expanded={ctx.open}
      {...props}
    >
      {children}
    </button>
  );
}

export function PopoverContent({
  children,
  className,
  align = "end",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
}) {
  const ctx = React.useContext(PopoverContext);
  if (!ctx?.open) return null;

  return (
    <div
      role="region"
      className={cn(
        "absolute z-50 mt-2 w-80 rounded-xl border border-[#e7ebf2] bg-white p-4 shadow-xl animate-in fade-in zoom-in-95",
        align === "end" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0",
        className
      )}
    >
      {children}
    </div>
  );
}
