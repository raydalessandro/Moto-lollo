import type { Pillar } from "./pillars";
import type { Group } from "@/types/domain";
import { currentUser } from "@/mocks/user";

interface HeaderProps {
  pillar: Pillar;
  currentGroup: Group;
}

const PILLAR_LABELS: Record<Pillar, { num: string; text: string; color: string | null }> = {
  io: { num: "01", text: "IO · personale", color: "#ff6a1f" },
  gruppo: { num: "02", text: "GRUPPO", color: null },
  mondo: { num: "03", text: "MONDO · community", color: "#6bb0ff" },
};

export function Header({ pillar, currentGroup }: HeaderProps) {
  const p = PILLAR_LABELS[pillar];
  const color = p.color ?? currentGroup.crestColor;
  const text = pillar === "gruppo" ? `GRUPPO · ${currentGroup.name}` : p.text;

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-line bg-panel/90 px-5 py-3 backdrop-blur-sm">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-ember">
          ▸ Moto_App
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.24em]"
          style={{ color }}
        >
          {p.num} · {text}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          {currentUser.displayName}
        </span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-[11px] font-semibold"
          style={{ background: "var(--ember)", color: "var(--bg)" }}
        >
          {currentUser.displayName.slice(0, 2).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
