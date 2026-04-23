import { currentUser } from "@/mocks/user";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-line bg-panel/90 px-5 py-3 backdrop-blur-sm">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-ember">
          ▸ Moto_App
        </span>
        <h1 className="font-display text-sm uppercase tracking-[0.2em] text-ink-soft">
          {title}
        </h1>
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
