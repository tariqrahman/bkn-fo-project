import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className={cn("group/tooltip relative inline-block", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border bg-background px-2 py-1 text-xs text-foreground opacity-0 shadow-md transition-opacity group-hover/tooltip:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}
