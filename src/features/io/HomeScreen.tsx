"use client";

import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useQuery } from "@/mocks/DbProvider";
import {
  getPrimaryMotorcycle,
  getLastActivity,
  listUpcomingRidesFor,
  getProfile,
  countUnreadNotifications,
} from "@/mocks/queries";

function relativeDate(iso: string, nowIso: string): string {
  const now = new Date(nowIso);
  const then = new Date(iso);
  const diffDays = Math.round((now.getTime() - then.getTime()) / 86_400_000);
  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;
  if (diffDays < 30) return `${Math.round(diffDays / 7)} sett fa`;
  return then.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

export function HomeScreen() {
  const me = useQuery((db, userId) => getProfile(db, userId));
  const primaryBike = useQuery((db, userId) => getPrimaryMotorcycle(db, userId));
  const lastRide = useQuery((db, userId) => getLastActivity(db, userId));
  const upcoming = useQuery((db, userId, now) => listUpcomingRidesFor(db, userId, now, 3));
  const unread = useQuery((db, userId) => countUnreadNotifications(db, userId));
  const now = useQuery((_db, _userId, now) => now);

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ember">
            ▸ Bentornato
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
            {new Date(now).toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" })}
          </span>
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Ciao, {me?.displayName}.
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {upcoming.length > 0
            ? `${upcoming.length} uscita${upcoming.length === 1 ? "" : "e"} in programma${unread > 0 ? ` · ${unread} notifiche` : ""}.`
            : unread > 0
              ? `${unread} notifiche non lette.`
              : "Nessuna uscita in programma."}
        </p>
      </section>

      {primaryBike && (
        <section>
          <SectionLabel num="01" action="Garage">La tua moto</SectionLabel>
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-ink-mute">Primaria</div>
                <div className="mt-1 font-display text-xl font-semibold">
                  {primaryBike.brand} {primaryBike.model}
                </div>
                <div className="text-sm text-ink-dim">
                  {primaryBike.name} · {primaryBike.year}
                </div>
              </div>
              <Stat value={primaryBike.totalKm.toLocaleString("it-IT")} unit="km" label="Totali" size="md" />
            </div>
          </Card>
        </section>
      )}

      {lastRide && (
        <section>
          <SectionLabel num="02" action="Storico">Ultima uscita</SectionLabel>
          <Card>
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="font-display text-lg font-semibold">{lastRide.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {lastRide.tags.map((t) => (
                    <Chip key={t} size="sm">#{t}</Chip>
                  ))}
                </div>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                {relativeDate(lastRide.startedAt, now)}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Stat value={lastRide.distanceKm.toFixed(1)} unit="km" label="Distanza" />
              <Stat value={Math.round(lastRide.durationSeconds / 60)} unit="min" label="Durata" />
              <Stat value={Math.round(lastRide.avgSpeedKmh)} unit="km/h" label="Media" />
            </div>
          </Card>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <SectionLabel num="03" action="Gruppi">In programma</SectionLabel>
          <div className="flex flex-col gap-3">
            {upcoming.map(({ ride, group }) => (
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
                  <span>{ride.distanceKm > 0 ? `${ride.distanceKm} km` : "Pista"}</span>
                  <span>
                    <span className="text-ember">{ride.confirmedCount}</span>/{ride.invitedCount} confermati
                  </span>
                  <Chip size="sm" active={ride.status === "confermata"}>{ride.status}</Chip>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
