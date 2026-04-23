"use client";

import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { currentUser, myMotorcycles } from "@/mocks/user";
import { activities } from "@/mocks/activities";
import { groups, groupRides } from "@/mocks/groups";

function relativeDate(iso: string): string {
  const now = new Date();
  const then = new Date(iso);
  const diffDays = Math.round(
    (now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;
  if (diffDays < 30) return `${Math.round(diffDays / 7)} sett fa`;
  return then.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

export function HomeScreen() {
  const primaryBike = myMotorcycles.find((m) => m.isPrimary) ?? myMotorcycles[0];
  const lastRide = activities[0];
  const upcoming = groupRides
    .filter((r) => new Date(r.startAt) > new Date("2026-04-23"))
    .slice(0, 2);

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ember">
            ▸ Bentornato
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
            Oggi · {new Date().toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" })}
          </span>
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Ciao, {currentUser.displayName}.
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {upcoming.length > 0
            ? `${upcoming.length} uscita${upcoming.length === 1 ? "" : "e"} in programma.`
            : "Nessuna uscita in programma."}
        </p>
      </section>

      <section>
        <SectionLabel num="01" action="Vedi">La tua moto</SectionLabel>
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-ink-mute">Primaria</div>
              <div className="mt-1 font-display text-xl font-semibold">{primaryBike.brand} {primaryBike.model}</div>
              <div className="text-sm text-ink-dim">{primaryBike.name} · {primaryBike.year}</div>
            </div>
            <Stat value={primaryBike.totalKm.toLocaleString("it-IT")} unit="km" label="Totali" size="md" />
          </div>
        </Card>
      </section>

      <section>
        <SectionLabel num="02" action="Storico">Ultima uscita</SectionLabel>
        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="font-display text-lg font-semibold">{lastRide.title}</div>
              <div className="mt-1 flex items-center gap-2">
                {lastRide.tags.map((t) => (
                  <Chip key={t} size="sm">#{t}</Chip>
                ))}
              </div>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
              {relativeDate(lastRide.startedAt)}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat value={lastRide.distanceKm.toFixed(1)} unit="km" label="Distanza" />
            <Stat value={Math.round(lastRide.durationSeconds / 60)} unit="min" label="Durata" />
            <Stat value={Math.round(lastRide.avgSpeedKmh)} unit="km/h" label="Media" />
          </div>
        </Card>
      </section>

      {upcoming.length > 0 && (
        <section>
          <SectionLabel num="03" action="Gruppi">In programma</SectionLabel>
          <div className="flex flex-col gap-3">
            {upcoming.map((ride) => {
              const group = groups.find((g) => g.id === ride.groupId);
              return (
                <Card key={ride.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-ink-mute">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: group?.crestColor }}
                        />
                        {group?.name}
                      </div>
                      <div className="mt-1 font-display text-base font-semibold">{ride.title}</div>
                      <div className="text-sm text-ink-dim">{ride.meetupText}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-ink">
                        {new Date(ride.startAt).toLocaleDateString("it-IT", { weekday: "short", day: "2-digit" })}
                      </div>
                      <div className="font-mono text-[11px] text-ember">
                        {new Date(ride.startAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-ink-dim">
                    <span>{ride.distanceKm} km</span>
                    <span>
                      <span className="text-ember">{ride.confirmed}</span>/{ride.total} confermati
                    </span>
                    <Chip size="sm" active={ride.status === "confermata"}>{ride.status}</Chip>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
