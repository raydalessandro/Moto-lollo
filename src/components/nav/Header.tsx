"use client";

import { useRef } from "react";
import type { Pillar } from "./pillars";
import type { Group } from "@/types/domain";
import { useQuery } from "@/mocks/DbProvider";
import { getProfile, countUnreadNotifications } from "@/mocks/queries";
import { Icon } from "./Icon";

interface HeaderProps {
  pillar: Pillar;
  currentGroup: Group;
  onOpenMenu: () => void;
  onPillarChange: (p: Pillar) => void;
  onLongPressGruppo: () => void;
}

const LONG_PRESS_MS = 450;

export function Header({
  pillar,
  currentGroup,
  onOpenMenu,
  onPillarChange,
  onLongPressGruppo,
}: HeaderProps) {
  const me = useQuery((db, userId) => getProfile(db, userId));
  const unread = useQuery((db, userId) => countUnreadNotifications(db, userId));

  const groupTag = currentGroup.tag;
  const groupColor = currentGroup.crestColor;

  // Long-press detection on the GRUPPO chip: tap = switch pillar,
  // hold (≥ LONG_PRESS_MS) = open the group picker overlay.
  const timerRef = useRef<number | null>(null);
  const triggeredRef = useRef(false);

  const startPress = () => {
    triggeredRef.current = false;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      triggeredRef.current = true;
      onLongPressGruppo();
    }, LONG_PRESS_MS);
  };
  const cancelPress = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  const onGruppoClick = () => {
    // If the long-press already fired, swallow the click.
    if (triggeredRef.current) {
      triggeredRef.current = false;
      return;
    }
    onPillarChange("gruppo");
  };

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-line bg-panel/90 px-3 py-2.5 backdrop-blur-sm">
      {/* Left: hamburger */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Apri menu"
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-bg text-ink-soft transition-colors hover:border-line-soft hover:text-ink"
      >
        <Icon d="M3 6h18 M3 12h18 M3 18h18" size={16} />
        {unread > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 font-mono text-[9px] font-bold"
            style={{ background: "var(--ember)", color: "var(--bg)" }}
          >
            {unread}
          </span>
        )}
      </button>

      {/* Center: pillar toggle IO ↔ GRUPPO (long-press GRUPPO = picker) */}
      <div
        className="relative mx-3 flex max-w-[260px] flex-1 items-stretch overflow-hidden rounded-full border border-line bg-bg p-[2px]"
        role="tablist"
        aria-label="Pillar"
      >
        <div
          className="absolute bottom-[2px] top-[2px] rounded-full transition-all duration-300 ease-out"
          style={{
            left: pillar === "io" ? "2px" : "50%",
            width: "calc(50% - 2px)",
            background:
              pillar === "io"
                ? "linear-gradient(135deg, rgba(255,106,31,0.20) 0%, rgba(255,106,31,0.08) 100%)"
                : `linear-gradient(135deg, ${groupColor}30 0%, ${groupColor}10 100%)`,
            border: `1px solid ${pillar === "io" ? "rgba(255,106,31,0.55)" : groupColor + "70"}`,
            boxShadow: `0 0 10px ${pillar === "io" ? "rgba(255,106,31,0.25)" : groupColor + "30"}`,
          }}
        />

        {/* IO segment */}
        <button
          type="button"
          role="tab"
          aria-selected={pillar === "io"}
          onClick={() => onPillarChange("io")}
          className="relative z-10 flex flex-1 items-center justify-center py-1.5"
          style={{ opacity: pillar === "io" ? 1 : 0.55 }}
        >
          <span
            className="font-display text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: pillar === "io" ? "var(--ember)" : "var(--ink-mute)" }}
          >
            IO
          </span>
        </button>

        {/* GRUPPO segment — tap = switch pillar, hold = open picker */}
        <button
          type="button"
          role="tab"
          aria-selected={pillar === "gruppo"}
          onClick={onGruppoClick}
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerCancel={cancelPress}
          onPointerLeave={cancelPress}
          onContextMenu={(e) => e.preventDefault()}
          className="relative z-10 flex flex-1 items-center justify-center gap-1.5 py-1.5 select-none"
          style={{
            opacity: pillar === "gruppo" ? 1 : 0.55,
            WebkitTouchCallout: "none",
          }}
        >
          <span
            className="flex h-[18px] min-w-[22px] items-center justify-center rounded-[4px] px-1 font-mono text-[8px] font-bold uppercase tracking-wider"
            style={{
              background: pillar === "gruppo" ? groupColor : "var(--panel-raised)",
              color: pillar === "gruppo" ? "var(--bg)" : "var(--ink-mute)",
              border: pillar === "gruppo" ? "none" : "1px solid var(--line)",
            }}
          >
            {groupTag}
          </span>
          <span
            className="font-display text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: pillar === "gruppo" ? groupColor : "var(--ink-mute)" }}
          >
            GRUPPO
          </span>
          {/* Tiny chevron to hint long-press picker (visible only when active) */}
          {pillar === "gruppo" && (
            <span
              className="ml-0.5 leading-none"
              style={{ color: groupColor, opacity: 0.7 }}
              aria-hidden
            >
              ▾
            </span>
          )}
        </button>
      </div>

      {/* Right: user avatar */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-[11px] font-semibold"
        style={{ background: me?.accentColor ?? "var(--ember)", color: "var(--bg)" }}
      >
        {me?.initials}
      </div>
    </header>
  );
}
