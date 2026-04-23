"use client";

import { PILLARS, PILLAR_ORDER, type Pillar, type ScreenKey } from "./pillars";
import { Icon } from "./Icon";
import { cn } from "@/lib/cn";
import type { Group } from "@/types/domain";

interface BottomNavProps {
  pillar: Pillar;
  screen: ScreenKey;
  onPillarChange: (p: Pillar) => void;
  onScreenChange: (s: ScreenKey) => void;
  currentGroup: Group;
}

export function BottomNav({
  pillar,
  screen,
  onPillarChange,
  onScreenChange,
  currentGroup,
}: BottomNavProps) {
  const active = PILLARS[pillar];
  const accent = pillar === "gruppo" ? currentGroup.crestColor : active.accent;
  const pillarIndex = PILLAR_ORDER.indexOf(pillar);

  return (
    <nav className="shrink-0 border-t border-line bg-bg">
      {/* Row 1 — pillar switcher */}
      <div className="px-3 pt-2 pb-1.5">
        <div
          className="relative flex overflow-hidden rounded-xl border border-line bg-panel-raised p-[3px]"
          role="tablist"
          aria-label="Pillar"
        >
          <div
            className="absolute bottom-[3px] top-[3px] rounded-lg transition-all duration-300 ease-out"
            style={{
              left: `calc(${(pillarIndex * 100) / 3}% + 3px)`,
              width: `calc(${100 / 3}% - 6px)`,
              background: `linear-gradient(135deg, ${accent}25 0%, ${accent}10 100%)`,
              border: `1px solid ${accent}60`,
              boxShadow: `0 0 12px ${accent}30`,
            }}
          />
          {PILLAR_ORDER.map((p) => {
            const def = PILLARS[p];
            const isActive = pillar === p;
            const isGruppo = p === "gruppo";
            const subtitle = isGruppo
              ? currentGroup.name.toLowerCase()
              : def.subtitle;
            const labelColor = isActive
              ? isGruppo
                ? currentGroup.crestColor
                : "var(--ink)"
              : "var(--ink-mute)";
            return (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onPillarChange(p)}
                className="relative z-10 flex flex-1 items-center justify-center gap-1.5 py-1.5 transition-opacity"
                style={{ opacity: isActive ? 1 : 0.55 }}
              >
                {isGruppo && (
                  <span
                    className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] text-[8px] font-bold uppercase"
                    style={{
                      background: `${currentGroup.crestColor}30`,
                      color: currentGroup.crestColor,
                      border: `1px solid ${currentGroup.crestColor}70`,
                    }}
                  >
                    {currentGroup.name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                )}
                <div className={isGruppo ? "text-left" : "text-center"}>
                  <div
                    className="font-display text-[10px] font-semibold uppercase leading-none tracking-[0.15em]"
                    style={{ color: labelColor }}
                  >
                    {def.label}
                  </div>
                  <div
                    className="mt-[2px] font-mono text-[7px] uppercase leading-tight tracking-[0.2em] text-ink-dim"
                  >
                    · {subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2 — tabs inside the active pillar */}
      <div
        className="flex items-center px-2 pb-2 pt-1"
        style={{
          justifyContent: active.tabs.length > 4 ? "space-between" : "space-around",
        }}
      >
        {active.tabs.map((tab) => {
          const isActive = screen === tab.key;
          const color = isActive ? accent : "var(--ink-mute)";
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onScreenChange(tab.key)}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 transition-all"
            >
              {isActive && (
                <span
                  className="absolute -top-[7px] h-[2px] w-5 rounded-full"
                  style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
                />
              )}
              <div className="relative">
                <Icon d={tab.iconPath} size={17} className={cn(isActive && "stroke-[2.2]")} />
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
              <span style={{ color }} className="sr-only">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
