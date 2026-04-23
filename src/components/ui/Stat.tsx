import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StatProps {
  value: ReactNode;
  unit?: string;
  label: string;
  size?: "sm" | "md" | "lg";
  color?: string;
}

export function Stat({ value, unit, label, size = "md", color }: StatProps) {
  const valueSize = size === "lg" ? "text-4xl" : size === "sm" ? "text-xl" : "text-2xl";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1">
        <span
          className={cn("font-display font-semibold leading-none tracking-tight", valueSize)}
          style={color ? { color } : undefined}
        >
          {value}
        </span>
        {unit && <span className="text-[11px] uppercase tracking-widest text-ink-dim">{unit}</span>}
      </div>
      <span className="text-[10px] uppercase tracking-[0.2em] text-ink-mute">{label}</span>
    </div>
  );
}
