"use client";
import * as React from "react";
import { cn } from "../../lib/utils";
import { Search, X } from "lucide-react";

interface CommandContextType {
  search: string;
  setSearch: (s: string) => void;
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  registerItem: (id: string, value: string, onSelect?: () => void) => () => void;
  items: { id: string; value: string; onSelect?: () => void }[];
}

const CommandContext = React.createContext<CommandContextType | null>(null);

export function CommandDialog({
  open,
  onOpenChange,
  children,
  title = "全局搜索",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  const [search, setSearch] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [items, setItems] = React.useState<{ id: string; value: string; onSelect?: () => void }[]>([]);

  const registerItem = React.useCallback((id: string, value: string, onSelect?: () => void) => {
    setItems((prev) => [...prev.filter((i) => i.id !== id), { id, value, onSelect }]);
    return () => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    };
  }, []);

  const handleClose = React.useCallback(() => {
    setSearch("");
    setActiveIndex(0);
    onOpenChange(false);
  }, [onOpenChange]);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (items.length > 0 ? (prev - 1 + items.length) % items.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (items[activeIndex]?.onSelect) {
          items[activeIndex].onSelect?.();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, items, activeIndex, handleClose]);

  if (!open) return null;

  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div
        className="fixed inset-0 bg-[#152039]/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-50 w-full max-w-2xl overflow-hidden rounded-xl border border-[#e7ebf2] bg-white shadow-2xl animate-in zoom-in-95"
      >
        <CommandContext.Provider value={{ search, setSearch, activeIndex, setActiveIndex, registerItem, items }}>
          {children}
        </CommandContext.Provider>
      </div>
    </div>
  );
}

export function CommandInput({
  placeholder = "搜索...",
}: {
  placeholder?: string;
}) {
  const ctx = React.useContext(CommandContext);
  if (!ctx) return null;

  return (
    <div className="flex items-center border-b border-[#e7ebf2] px-3.5">
      <Search className="mr-2.5 size-4.5 shrink-0 text-[#8791a7]" />
      <input
        autoFocus
        value={ctx.search}
        onChange={(e) => {
          ctx.setSearch(e.target.value);
          ctx.setActiveIndex(0);
        }}
        placeholder={placeholder}
        className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm text-[#152039] outline-none placeholder:text-[#9aa4b6] disabled:cursor-not-allowed disabled:opacity-50"
      />
      {ctx.search && (
        <button
          type="button"
          onClick={() => ctx.setSearch("")}
          className="rounded-sm p-1 text-[#8791a7] hover:bg-[#f4f6fa] hover:text-[#152039]"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function CommandList({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-h-96 overflow-y-auto overflow-x-hidden p-2 thin-scroll">
      {children}
    </div>
  );
}

export function CommandEmpty({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(CommandContext);
  if (!ctx || ctx.items.length > 0 || !ctx.search) return null;
  return <div className="py-8 text-center text-sm text-[#8791a7]">{children}</div>;
}

export function CommandGroup({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  const groupRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={groupRef} className="overflow-hidden p-1 text-[#152039]">
      <div className="px-2 py-1.5 text-xs font-semibold text-[#8791a7] uppercase tracking-wider">
        {heading}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function CommandItem({
  children,
  value,
  onSelect,
  className,
}: {
  children: React.ReactNode;
  value: string;
  onSelect?: () => void;
  className?: string;
}) {
  const ctx = React.useContext(CommandContext);
  const id = React.useId();

  const isMatched = !ctx?.search || value.toLowerCase().includes(ctx.search.toLowerCase().trim());

  React.useEffect(() => {
    if (!isMatched || !ctx) return;
    return ctx.registerItem(id, value, onSelect);
  }, [id, value, onSelect, isMatched, ctx]);

  if (!isMatched) return null;

  const itemIndex = ctx ? ctx.items.findIndex((i) => i.id === id) : -1;
  const isSelected = itemIndex !== -1 && itemIndex === ctx?.activeIndex;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={onSelect}
      onMouseEnter={() => {
        if (itemIndex !== -1) ctx?.setActiveIndex(itemIndex);
      }}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-lg px-2.5 py-2 text-sm text-[#40506a] outline-none transition-colors",
        isSelected ? "bg-[#eaf1ff] text-[#286cf2] font-medium" : "hover:bg-[#f3f6fb] hover:text-[#152039]",
        className
      )}
    >
      {children}
    </div>
  );
}
