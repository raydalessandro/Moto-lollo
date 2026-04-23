"use client";

import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { currentUser, myMotorcycles } from "@/mocks/user";
import { activities } from "@/mocks/activities";

export function ProfiloScreen() {
  const totalKmRidden = activities.reduce((acc, a) => acc + a.distanceKm, 0);
  const totalHours = Math.round(
    activities.reduce((acc, a) => acc + a.durationSeconds / 3600, 0),
  );

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section className="flex flex-col items-center gap-3 pt-4 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-ember text-2xl font-bold"
          style={{ background: "var(--ember)", color: "var(--bg)" }}
        >
          {currentUser.displayName.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold">
            {currentUser.displayName}
          </h1>
          <div className="font-mono text-[11px] uppercase tracking-widest text-ink-mute">
            @{currentUser.username}
          </div>
        </div>
        {currentUser.bio && (
          <p className="max-w-xs text-sm text-ink-dim">{currentUser.bio}</p>
        )}
      </section>

      <section>
        <SectionLabel num="01">Statistiche</SectionLabel>
        <Card>
          <div className="grid grid-cols-3 gap-3">
            <Stat value={activities.length} label="Uscite" />
            <Stat value={totalKmRidden.toFixed(0)} unit="km" label="Percorsi" />
            <Stat value={totalHours} unit="h" label="In sella" />
          </div>
        </Card>
      </section>

      <section>
        <SectionLabel num="02" action="Garage">Moto</SectionLabel>
        <Card>
          <div className="flex flex-col gap-1">
            {myMotorcycles.map((m) => (
              <div key={m.id} className="flex items-baseline justify-between">
                <span className="text-sm">
                  {m.brand} {m.model}
                  {m.isPrimary && <span className="ml-2 text-[10px] uppercase text-ember">· primaria</span>}
                </span>
                <span className="font-mono text-[11px] text-ink-dim">
                  {m.totalKm.toLocaleString("it-IT")} km
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <SectionLabel num="03">Da costruire</SectionLabel>
        <ul className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4">
          {[
            "Modifica profilo (nome, bio, avatar)",
            "Preferenze: tema, lingua, unità di misura",
            "Privacy: visibilità attività, chi può commentare",
            "Safety: contatti emergenza, SOS",
            "Integrazioni (Strava, Komoot, calendario)",
            "Abbonamento / premium",
            "Cancellazione account",
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
