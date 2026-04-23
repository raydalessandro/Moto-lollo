"use client";

import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { myMotorcycles } from "@/mocks/user";

export function GarageScreen() {
  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ember">
          ▸ Garage
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Le tue moto
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {myMotorcycles.length} moto · {myMotorcycles.reduce((acc, m) => acc + m.totalKm, 0).toLocaleString("it-IT")} km totali
        </p>
      </section>

      <section>
        <SectionLabel num="01" action="Aggiungi">Parco moto</SectionLabel>
        <div className="flex flex-col gap-3">
          {myMotorcycles.map((m) => (
            <Card key={m.id} active={m.isPrimary}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-display text-lg font-semibold">
                      {m.brand} {m.model}
                    </div>
                    {m.isPrimary && <Chip size="sm" active>Primaria</Chip>}
                  </div>
                  <div className="text-sm text-ink-dim">
                    {m.name} · {m.year} · {m.engineCc} cc
                  </div>
                  {m.color && (
                    <div className="mt-1 text-[11px] uppercase tracking-wider text-ink-mute">
                      {m.color}
                    </div>
                  )}
                </div>
                <Stat value={m.totalKm.toLocaleString("it-IT")} unit="km" label="Totali" size="md" />
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel num="02">Da costruire</SectionLabel>
        <ul className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4">
          {[
            "Form aggiungi / modifica moto (foto, cilindrata, colore)",
            "Dettaglio moto: storico attività, grafico km",
            "Manutenzione: tagliandi, scadenze, reminder",
            "Accessori e documenti (assicurazione, bollo, revisione)",
            "Consumi e costi gestione",
          ].map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-ink-soft">
              <span className="mt-[7px] inline-block h-[5px] w-[5px] shrink-0 rounded-full bg-ember" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
