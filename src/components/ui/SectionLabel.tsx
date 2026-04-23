import type { ReactNode } from "react";

interface SectionLabelProps {
  children: ReactNode;
  num?: string;
  action?: string;
  onAction?: () => void;
}

export function SectionLabel({ children, num, action, onAction }: SectionLabelProps) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <div className="flex items-baseline gap-2">
        {num && (
          <span className="font-mono text-[10px] text-ink-mute tracking-widest">
            ▸ {num}
          </span>
        )}
        <h2 className="font-display text-sm uppercase tracking-[0.24em] text-ink-soft">
          {children}
        </h2>
      </div>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="text-[11px] uppercase tracking-wider text-ember hover:text-ink"
        >
          {action}
        </button>
      )}
    </div>
  );
}
