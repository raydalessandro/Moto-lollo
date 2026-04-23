"use client";

import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useDb, useQuery } from "@/mocks/DbProvider";
import {
  listMyMotorcycles,
  listMaintenanceForBike,
  getPrimaryMotorcycle,
  listMyDocuments,
} from "@/mocks/queries";

function daysUntil(iso: string, nowIso: string): number {
  return Math.round((new Date(iso).getTime() - new Date(nowIso).getTime()) / 86_400_000);
}

export function GarageScreen() {
  const { setPrimaryMotorcycle } = useDb();
  const bikes = useQuery((db, userId) => listMyMotorcycles(db, userId));
  const primary = useQuery((db, userId) => getPrimaryMotorcycle(db, userId));
  const docs = useQuery((db, userId) => listMyDocuments(db, userId));
  const maintenance = useQuery((db) =>
    primary ? listMaintenanceForBike(db, primary.id) : [],
  );
  const now = useQuery((_db, _userId, now) => now);

  const totalKm = bikes.reduce((acc, m) => acc + m.totalKm, 0);

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
          {bikes.length} moto · {totalKm.toLocaleString("it-IT")} km totali
        </p>
      </section>

      <section>
        <SectionLabel num="01" action="Aggiungi">Parco moto</SectionLabel>
        <div className="flex flex-col gap-3">
          {bikes.map((m) => (
            <Card key={m.id} active={m.isPrimary}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-display text-lg font-semibold">
                      {m.brand} {m.model}
                    </div>
                    {m.isPrimary ? (
                      <Chip size="sm" active>Primaria</Chip>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPrimaryMotorcycle(m.id)}
                        className="text-[10px] uppercase tracking-wider text-ink-mute hover:text-ember"
                      >
                        rendi primaria
                      </button>
                    )}
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

      {docs.length > 0 && (
        <section>
          <SectionLabel num="02" action="Nuovo">Scadenze</SectionLabel>
          <div className="flex flex-col gap-2">
            {docs.map((d) => {
              const days = daysUntil(d.expiresAt, now);
              const soon = days >= 0 && days <= 30;
              const late = days < 0;
              return (
                <Card key={d.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-display text-sm font-semibold capitalize">{d.kind}</div>
                      {d.notes && <div className="text-[11px] text-ink-dim">{d.notes}</div>}
                    </div>
                    <div className="text-right">
                      <div
                        className="font-mono text-[11px] uppercase tracking-widest"
                        style={{ color: late ? "var(--danger)" : soon ? "var(--warn)" : "var(--ink-dim)" }}
                      >
                        {late ? `scaduto ${-days}g fa` : `tra ${days}g`}
                      </div>
                      <div className="font-mono text-[10px] text-ink-mute">
                        {new Date(d.expiresAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {primary && maintenance.length > 0 && (
        <section>
          <SectionLabel num="03" action="Storico">Manutenzione {primary.name}</SectionLabel>
          <div className="flex flex-col gap-2">
            {maintenance.slice(0, 4).map((m) => (
              <Card key={m.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-display text-sm font-semibold capitalize">{m.kind}</div>
                    {m.notes && <div className="text-[11px] text-ink-dim">{m.notes}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[11px] text-ink-dim">
                      {m.kmAtService.toLocaleString("it-IT")} km
                    </div>
                    <div className="font-mono text-[10px] text-ink-mute">
                      {new Date(m.date).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                    </div>
                    {m.costEur != null && (
                      <div className="font-mono text-[10px] text-ember">
                        {m.costEur === 0 ? "—" : `€ ${m.costEur}`}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
