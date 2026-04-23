import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  active?: boolean;
}

export function Card({ children, className, style, onClick, active }: CardProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      style={style}
      className={cn(
        "w-full text-left rounded-xl border border-line bg-panel p-4 transition-colors",
        active && "border-ember/60 bg-panel-raised",
        onClick && "hover:border-line-soft/80 active:bg-panel-raised",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
