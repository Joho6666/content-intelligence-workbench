import * as React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "blue" | "purple" | "green" | "orange" | "red" | "gray";
  tone?: string;
}

export function Badge({ className, variant, tone, children, ...props }: BadgeProps) {
  const chosenVariant = variant || (tone ? (tone as BadgeProps["variant"]) : "default");

  const variants: Record<string, string> = {
    default: "bg-[#edf4ff] text-[#3475e8]",
    secondary: "bg-[#f2f5fb] text-[#67748b]",
    outline: "border border-[#e7ebf2] text-[#40506a] bg-transparent",
    blue: "bg-[#edf4ff] text-[#3475e8]",
    purple: "bg-[#f1edff] text-[#7961dc]",
    green: "bg-[#e7f8f0] text-[#29a477]",
    orange: "bg-[#fff4e2] text-[#d99630]",
    red: "bg-[#fff0f0] text-[#e05c68]",
    gray: "bg-[#f0f2f5] text-[#64748b]",
  };

  const styleClass = variants[chosenVariant || "default"] || variants.default;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-tight transition-colors",
        styleClass,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
