"use client";

import type { Pillar } from "./pillars";
import type { Group } from "@/types/domain";
import { useQuery } from "@/mocks/DbProvider";
import { getProfile, countUnreadNotifications } from "@/mocks/queries";
import { Icon } from "./Icon";

interface HeaderProps {
  pillar: Pillar;
  currentGroup: Group;
  onOpenMenu: () => void;
}

const PILLAR_LABELS: Record<Pillar, { num: string; text: string; color: string | null }> = {
  io: { num: "01", text: "IO · personale", color: "#ff6a1f" },
  gruppo: { num: "02", text: "GRUPPO", color: null },
  mondo: { num: "03", text: "MONDO · community", color: "#6bb0ff" },
};

export function Header({ pillar, currentGroup, onOpenMenu }: HeaderProps) {
  const me = useQuery((db, userId) => getProfile(db, userId));
  const unread = useQuery((db, userId) => countUnreadNotifications(db, userId));
  const p = PILLAR_LABELS[pillar];
  const color = p.color ?? currentGroup.crestColor;
  const text = pillar === "gruppo" ? `GRUPPO · ${currentGroup.name}` : p.text;

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-line bg-panel/90 px-3 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Apri menu"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-bg text-ink-soft transition-colors hover:border-line-soft hover:text-ink"
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
        <div className="flex flex-col">
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-ember">
            ▸ Moto_App
          </span>
          <span
            className="font-mono text-[9px] uppercase tracking-[0.2em]"
            style={{ color }}
          >
            {p.num} · {text}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 pr-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          {me?.displayName}
        </span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-[11px] font-semibold"
          style={{ background: me?.accentColor ?? "var(--ember)", color: "var(--bg)" }}
        >
          {me?.initials}
        </div>
      </div>
    </header>
  );
}
