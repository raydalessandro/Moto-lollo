import type { ReactNode } from "react";
import { SectionLabel } from "./SectionLabel";

interface PlaceholderProps {
  title: string;
  subtitle?: string;
  bullets: string[];
  footer?: ReactNode;
}

export function Placeholder({ title, subtitle, bullets, footer }: PlaceholderProps) {
  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ember">
          ▸ Da costruire
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-ink-dim">{subtitle}</p>}
      </section>
      <section>
        <SectionLabel num="00">Funzioni previste</SectionLabel>
        <ul className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-ink-soft">
              <span className="mt-[7px] inline-block h-[5px] w-[5px] shrink-0 rounded-full bg-ember" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>
      {footer && <section>{footer}</section>}
    </div>
  );
}
