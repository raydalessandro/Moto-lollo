"use client";

import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Icon } from "@/components/nav/Icon";

const ACTIONS = [
  {
    title: "Nuova uscita",
    desc: "Avvia il tracking GPS della tua prossima corsa.",
    iconPath: "M6 3l14 9-14 9z",
  },
  {
    title: "Nuovo percorso",
    desc: "Pianifica waypoint, distanza e quota prima di partire.",
    iconPath: "M9 3L3 6v15l6-3 6 3 6-3V3l-6 3z M9 3v15 M15 6v15",
  },
  {
    title: "Importa GPX",
    desc: "Carica un tracciato da un file o da un'altra app.",
    iconPath: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  },
  {
    title: "Aggiungi moto",
    desc: "Registra una nuova moto nel tuo garage.",
    iconPath:
      "M5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M5 15l3-7 4 7 3-7h-3 M15 8h3",
  },
];

export function CreaScreen() {
  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ember">
          ▸ Crea
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Cosa vuoi fare?
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Tutte le azioni che creano qualcosa di tuo, in un posto solo.
        </p>
      </section>

      <section>
        <SectionLabel num="01">Azioni rapide</SectionLabel>
        <div className="flex flex-col gap-3">
          {ACTIONS.map((a) => (
            <Card key={a.title} onClick={() => {}}>
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-panel-raised text-ember">
                  <Icon d={a.iconPath} size={18} />
                </div>
                <div className="flex-1">
                  <div className="font-display text-base font-semibold">{a.title}</div>
                  <div className="text-sm text-ink-dim">{a.desc}</div>
                </div>
                <Icon d="M9 18l6-6-6-6" size={16} className="text-ink-mute" />
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
