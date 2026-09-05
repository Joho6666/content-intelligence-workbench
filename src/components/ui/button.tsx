import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3378f6] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer";
    
    const variants = {
      default: "bg-[#152039] text-white hover:bg-[#203052] active:bg-[#0e1628]",
      destructive: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
      outline: "border border-[#e7ebf2] bg-white text-[#40506a] hover:bg-[#f4f6fa] hover:text-[#152039]",
      secondary: "bg-[#eaf1ff] text-[#286cf2] hover:bg-[#d8e6ff] active:bg-[#c6dbff]",
      ghost: "text-[#40506a] hover:bg-[#f4f6fa] hover:text-[#152039]",
      link: "text-[#3378f6] underline-offset-4 hover:underline p-0 h-auto font-normal",
    };

    const sizes = {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-11 rounded-lg px-8 text-base",
      icon: "h-9 w-9 p-0",
    };

    const classes = cn(baseStyles, variants[variant], sizes[size], className);

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        className: cn(classes, child.props.className),
        ...props,
      });
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
