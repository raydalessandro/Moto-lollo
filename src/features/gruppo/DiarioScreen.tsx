"use client";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useQuery } from "@/mocks/DbProvider";
import { listPastGroupRides } from "@/mocks/queries";
import type { Group } from "@/types/domain";

interface DiarioScreenProps {
  group: Group;
}

export function DiarioScreen({ group }: DiarioScreenProps) {
  const past = useQuery((db, _uid, now) => listPastGroupRides(db, group.id, now));

  const totalKm = past.reduce((a, r) => a + r.distanceKm, 0);
  const totalH = Math.round(past.reduce((a, r) => a + r.estimatedDurationMin / 60, 0));

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.28em]"
          style={{ color: group.crestColor }}
        >
          ▸ Diario · {group.name}
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Dove siete stati
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {past.length} uscite · {totalKm.toLocaleString("it-IT")} km · {totalH}h in sella
        </p>
      </section>

      <section>
        <SectionLabel num="01">Archivio</SectionLabel>
        <div className="flex flex-col gap-3">
          {past.map((r) => (
            <Card key={r.id}>
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="font-display text-base font-semibold">{r.title}</div>
                  <div className="text-sm text-ink-dim">{r.meetupText}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">
                    {new Date(r.startAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" })}
                  </div>
                  <div className="font-mono text-[10px] text-ink-mute">
                    {new Date(r.startAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-ink-dim">
                <span>{r.distanceKm > 0 ? `${r.distanceKm} km` : "Pista"}</span>
                <span>{r.confirmedCount} partecipanti</span>
                <Chip size="sm" active={r.status === "completata"}>{r.status}</Chip>
              </div>
            </Card>
          ))}
          {past.length === 0 && (
            <div className="rounded-xl border border-line bg-panel p-6 text-center text-sm text-ink-dim">
              Ancora nessuna uscita conclusa per {group.name}.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
