"use client";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useQuery } from "@/mocks/DbProvider";
import {
  getLastActivity,
  getPrimaryMotorcycle,
  listMyDocuments,
} from "@/mocks/queries";

const POI = [
  { kind: "Benzina",    name: "Q8 Salò",            distanceKm: 1.2 },
  { kind: "Officina",   name: "Motopro Brescia",    distanceKm: 3.8 },
  { kind: "Caffè",      name: "Bar Aquila",         distanceKm: 0.4 },
  { kind: "Parcheggio", name: "P. Arnaldo",         distanceKm: 0.6 },
  { kind: "Benzina",    name: "Eni — via Milano",   distanceKm: 2.1 },
];

export function MappaScreen() {
  const last = useQuery((db, userId) => getLastActivity(db, userId));
  const primary = useQuery((db, userId) => getPrimaryMotorcycle(db, userId));
  const docs = useQuery((db, userId) => listMyDocuments(db, userId));
  const now = useQuery((_db, _uid, now) => now);

  const nextDoc = docs.find(
    (d) => new Date(d.expiresAt).getTime() - new Date(now).getTime() > 0,
  );
  const daysToDoc = nextDoc
    ? Math.round((new Date(nextDoc.expiresAt).getTime() - new Date(now).getTime()) / 86_400_000)
    : null;

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ember">
          ▸ Mappa
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Qui e intorno
        </h1>
      </section>

      <section>
        <Card>
          <div className="flex h-52 items-center justify-center rounded-lg border border-line bg-panel-raised text-[11px] text-ink-mute">
            mappa interattiva — da agganciare
          </div>
        </Card>
      </section>

      {primary && (
        <section>
          <SectionLabel num="01">Stato moto</SectionLabel>
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-base font-semibold">
                  {primary.brand} {primary.model}
                </div>
                <div className="text-sm text-ink-dim">{primary.name}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm text-ink">
                  {primary.totalKm.toLocaleString("it-IT")} km
                </div>
                <div className="font-mono text-[10px] text-ink-mute">totali</div>
              </div>
            </div>
            {nextDoc && daysToDoc != null && (
              <div className="mt-3 border-t border-line pt-3 text-[11px] text-ink-dim">
                Prossima scadenza:{" "}
                <span className="capitalize text-ink">{nextDoc.kind}</span>{" "}
                <span
                  className="ml-1 font-mono"
                  style={{
                    color:
                      daysToDoc <= 30 ? "var(--warn)" : "var(--ink-dim)",
                  }}
                >
                  tra {daysToDoc}g
                </span>
              </div>
            )}
          </Card>
        </section>
      )}

      {last && (
        <section>
          <SectionLabel num="02">Ultima uscita</SectionLabel>
          <Card>
            <div className="flex items-baseline justify-between gap-3">
              <div className="font-display text-base font-semibold">{last.title}</div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                {new Date(last.startedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3 text-[11px] text-ink-dim">
              <span>{last.distanceKm} km</span>
              <span>+{last.elevationGainM ?? 0} m</span>
              <div className="ml-auto flex gap-1">
                {last.tags.slice(0, 3).map((t) => (
                  <Chip key={t} size="sm">#{t}</Chip>
                ))}
              </div>
            </div>
          </Card>
        </section>
      )}

      <section>
        <SectionLabel num="03">POI nelle vicinanze</SectionLabel>
        <div className="flex flex-col gap-2">
          {POI.map((p, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-ink-mute">{p.kind}</div>
                  <div className="font-display text-sm font-semibold">{p.name}</div>
                </div>
                <div className="font-mono text-[11px] text-ember">{p.distanceKm} km</div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
