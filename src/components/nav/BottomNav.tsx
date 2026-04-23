"use client";

import { navItems, type ScreenKey } from "./navItems";
import { Icon } from "./Icon";
import { cn } from "@/lib/cn";

interface BottomNavProps {
  active: ScreenKey;
  onChange: (k: ScreenKey) => void;
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="shrink-0 border-t border-line bg-panel/95 backdrop-blur-sm">
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between gap-0 px-1">
        {navItems.map((item) => {
          const isActive = item.key === active;
          return (
            <li key={item.key} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(item.key)}
                className={cn(
                  "flex w-full flex-col items-center gap-1 py-2.5 transition-colors",
                  isActive ? "text-ember" : "text-ink-dim hover:text-ink-soft",
                )}
              >
                <Icon d={item.iconPaths} size={20} />
                <span className="text-[9px] uppercase tracking-[0.16em]">
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
