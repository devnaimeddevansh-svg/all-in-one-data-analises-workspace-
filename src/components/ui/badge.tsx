import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "secondary" | "success" | "warning" }>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-violet-600/20 text-violet-300 border-violet-600/30",
      secondary: "bg-zinc-800 text-zinc-300 border-zinc-700",
      success: "bg-emerald-600/20 text-emerald-300 border-emerald-600/30",
      warning: "bg-amber-600/20 text-amber-300 border-amber-600/30",
    };
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
