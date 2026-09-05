import * as React from "react";
import { cn } from "../../lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-[#e7ebf2] bg-white px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-[#9aa4b6] focus-visible:outline-none focus-visible:border-[#3378f6] focus-visible:ring-2 focus-visible:ring-[#3378f6]/20 disabled:cursor-not-allowed disabled:opacity-50 text-[#152039]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
