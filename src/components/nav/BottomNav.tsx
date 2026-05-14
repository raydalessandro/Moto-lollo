"use client";

import { PILLARS, type Pillar, type ScreenKey } from "./pillars";
import { Icon } from "./Icon";
import { cn } from "@/lib/cn";
import type { Group } from "@/types/domain";

interface BottomNavProps {
  pillar: Pillar;
  screen: ScreenKey;
  onScreenChange: (s: ScreenKey) => void;
  currentGroup: Group;
}

export function BottomNav({
  pillar,
  screen,
  onScreenChange,
  currentGroup,
}: BottomNavProps) {
  const active = PILLARS[pillar];
  const accent = pillar === "gruppo" ? currentGroup.crestColor : active.accent;

  return (
    <nav className="shrink-0 border-t border-line bg-bg">
      <div
        className="flex items-center px-2 pb-2 pt-2"
        style={{
          justifyContent: active.tabs.length > 4 ? "space-between" : "space-around",
        }}
      >
        {active.tabs.map((tab) => {
          const isActive = screen === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onScreenChange(tab.key)}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 transition-all"
            >
              {isActive && (
                <span
                  className="absolute -top-[8px] h-[2px] w-5 rounded-full"
                  style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
                />
              )}
              <div
                className="relative"
                style={{ color: isActive ? accent : "var(--ink-mute)" }}
              >
                <Icon
                  d={tab.iconPath}
                  size={18}
                  className={cn(isActive && "stroke-[2.2]")}
                />
                {tab.live && (
                  <span
                    className="live-pulse-dot absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--ember)", boxShadow: "0 0 4px var(--ember)" }}
                  />
                )}
              </div>
              <span
                className="max-w-full truncate font-mono text-[9px] uppercase tracking-wider"
                style={{ color: isActive ? "var(--ink)" : "var(--ink-dim)" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
