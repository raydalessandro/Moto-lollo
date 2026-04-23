import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ChipProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}

export function Chip({ children, active, onClick, size = "md" }: ChipProps) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium uppercase tracking-wider transition-colors",
        size === "sm" ? "px-2 py-[2px] text-[10px]" : "px-3 py-1 text-[11px]",
        active
          ? "border-ember bg-ember/10 text-ember"
          : "border-line bg-panel text-ink-dim",
        onClick && !active && "hover:border-line-soft hover:text-ink-soft",
      )}
    >
      {children}
    </Tag>
  );
}
