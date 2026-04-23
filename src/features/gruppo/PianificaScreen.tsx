"use client";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useQuery } from "@/mocks/DbProvider";
import { listMyPlannedRoutes } from "@/mocks/queries";

export function PianificaScreen() {
  const routes = useQuery((db, userId) => listMyPlannedRoutes(db, userId));

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ember">
          ▸ Pianifica
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          I tuoi percorsi
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {routes.length} percorsi salvati
        </p>
      </section>

      <section>
        <SectionLabel num="01" action="Nuovo">Salvati</SectionLabel>
        <div className="flex flex-col gap-3">
          {routes.map((r) => (
            <Card key={r.id} onClick={() => {}}>
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="font-display text-base font-semibold">{r.title}</div>
                  {r.notes && <div className="text-sm text-ink-dim">{r.notes}</div>}
                </div>
                <Chip size="sm" active={r.visibility === "public"}>
                  {r.visibility === "public" ? "pubblico" : r.visibility === "followers" ? "follower" : "privato"}
                </Chip>
              </div>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-ink-dim">
                <span>{r.distanceKm} km</span>
                <span>
                  {Math.floor(r.estimatedDurationMin / 60)}h {r.estimatedDurationMin % 60}m
                </span>
                <span>{r.waypoints.length} waypoint</span>
                <div className="ml-auto flex gap-1">
                  {r.tags.slice(0, 3).map((t) => (
                    <Chip key={t} size="sm">#{t}</Chip>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel num="02">Da costruire</SectionLabel>
        <ul className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4">
          {[
            "Editor mappa waypoint tap-to-add",
            "Polyline calcolata live + stima distanza e durata",
            "Import / export GPX",
            "Duplica percorso",
            "Usa come base per una navigazione turn-by-turn",
            "Pianifica un'uscita di gruppo da un percorso esistente",
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
