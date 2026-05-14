"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Icon } from "@/components/nav/Icon";

type Mode = "hub" | "manuale" | "gps" | "gpx" | "naviga";

interface ModeDef {
  key: Exclude<Mode, "hub">;
  title: string;
  short: string;
  description: string;
  iconPath: string;
  hint: string;
}

const MODES: ModeDef[] = [
  {
    key: "manuale",
    title: "Crea un percorso",
    short: "A mano sulla mappa",
    description:
      "Tap sulla mappa per aggiungere waypoint, drag per spostarli. L'app calcola distanza, durata e dislivello stimati.",
    iconPath: "M9 3L3 6v15l6-3 6 3 6-3V3l-6 3z M9 3v15 M15 6v15",
    hint: "Editor mappa con waypoint e polyline live (Step 14 lo apre fullscreen).",
  },
  {
    key: "gps",
    title: "Registra un'uscita",
    short: "Mentre guidi",
    description:
      "Tracking GPS della tua corsa: km, velocità, durata, dislivello live. A fine registrazione salvi l'Activity.",
    iconPath: "M6 3l14 9-14 9z",
    hint: "Avvio fullscreen con timer + metriche live + pausa/stop.",
  },
  {
    key: "gpx",
    title: "Importa un GPX",
    short: "Da file o link",
    description:
      "Carica un tracciato esistente. Lo archiviamo nei tuoi percorsi e puoi navigarlo o ripubblicarlo.",
    iconPath:
      "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
    hint: "Compatibilità prevista: GPX. Da valutare KML/ITN secondo Mapbox.",
  },
  {
    key: "naviga",
    title: "Naviga",
    short: "Verso una destinazione",
    description:
      "Inserisci dove vuoi andare e parte la navigazione turn-by-turn. Sotto, l'app traccia il percorso che fai: puoi salvartelo.",
    iconPath: "M3 11l19-9-9 19-2-8z",
    hint: "Anche modalità libera (no destinazione, traccia mentre segui qualcuno).",
  },
];

export function RegistraScreen() {
  const [mode, setMode] = useState<Mode>("hub");

  if (mode !== "hub") {
    const def = MODES.find((m) => m.key === mode)!;
    return <ModeDetail mode={def} onBack={() => setMode("hub")} />;
  }

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ember">
          ▸ Registra
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Cosa vuoi fare adesso?
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Quattro punti di partenza. Tutto ciò che crei finisce nella tua Mappa.
        </p>
      </section>

      <section>
        <SectionLabel num="01">Hub di partenza</SectionLabel>
        <div className="flex flex-col gap-3">
          {MODES.map((m) => (
            <Card key={m.key} onClick={() => setMode(m.key)}>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-line bg-panel-raised text-ember">
                  <Icon d={m.iconPath} size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-display text-base font-semibold">
                    {m.title}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-mute">
                    {m.short}
                  </div>
                  <p className="mt-1 text-sm text-ink-dim">{m.description}</p>
                </div>
                <Icon d="M9 18l6-6-6-6" size={14} className="text-ink-mute" />
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel num="02">Da costruire</SectionLabel>
        <ul className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4 text-sm text-ink-soft">
          {[
            "Mappa fullscreen di navigazione (Step 14)",
            "Tracking GPS reale (per ora simulato visivamente)",
            "Parser GPX (per ora bottone simulato)",
            "Ricerca destinazione (geocoding Mapbox)",
            "Modalità navigazione libera (registra senza destinazione)",
          ].map((b, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-[7px] inline-block h-[5px] w-[5px] rounded-full bg-ember" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

interface ModeDetailProps {
  mode: ModeDef;
  onBack: () => void;
}

function ModeDetail({ mode, onBack }: ModeDetailProps) {
  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-ink-dim hover:text-ink"
        >
          ← hub
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-line bg-panel-raised text-ember">
            <Icon d={mode.iconPath} size={20} />
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ember">
              ▸ {mode.short}
            </span>
            <h1 className="mt-0.5 font-display text-2xl font-semibold tracking-tight">
              {mode.title}
            </h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-ink-soft">{mode.description}</p>
      </section>

      <section>
        <Card>
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
            <Icon d={mode.iconPath} size={28} className="text-ember" />
            <div className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
              schermata da costruire
            </div>
            <div className="max-w-xs text-[11px] text-ink-dim">{mode.hint}</div>
          </div>
        </Card>
      </section>

      <section>
        <button
          type="button"
          className="w-full rounded-xl border border-ember bg-ember/10 px-4 py-3 font-display text-sm font-semibold uppercase tracking-wider text-ember transition-colors hover:bg-ember/15"
        >
          {mode.key === "gps" || mode.key === "naviga" ? "Avvia ora" : "Apri editor"}
        </button>
      </section>
    </div>
  );
}
