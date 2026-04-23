"use client";

import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useQuery } from "@/mocks/DbProvider";
import {
  listPastGroupRides,
  listGroupMembers,
  getActivity,
} from "@/mocks/queries";
import type { Group } from "@/types/domain";

interface StoriaScreenProps {
  group: Group;
}

export function StoriaScreen({ group }: StoriaScreenProps) {
  const past = useQuery((db, _uid, now) => listPastGroupRides(db, group.id, now));
  const members = useQuery((db) => listGroupMembers(db, group.id));
  const recent = past[0];
  const recentActivity = useQuery((db) =>
    recent?.activityIds[0] ? getActivity(db, recent.activityIds[0]) : undefined,
  );

  const partecipanti = members.slice(0, Math.min(members.length, recent?.confirmedCount ?? 0));

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.28em]"
          style={{ color: group.crestColor }}
        >
          ▸ Storia · {group.name}
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          L&apos;ultima uscita
        </h1>
        {!recent && (
          <p className="mt-1 text-sm text-ink-dim">Nessuna storia ancora.</p>
        )}
      </section>

      {recent && (
        <>
          <section>
            <Card>
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="font-display text-lg font-semibold">{recent.title}</div>
                  <div className="text-sm text-ink-dim">{recent.meetupText}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">
                    {new Date(recent.startAt).toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" })}
                  </div>
                  <div className="font-mono text-[11px] text-ink-mute">
                    {new Date(recent.startAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Stat value={recent.distanceKm} unit="km" label="Distanza" />
                <Stat value={Math.floor(recent.estimatedDurationMin / 60)} unit="h" label="Durata" />
                <Stat value={recent.confirmedCount} label="Partecipanti" />
              </div>
            </Card>
          </section>

          {recentActivity && (
            <section>
              <SectionLabel num="01">Replay</SectionLabel>
              <Card>
                <div className="text-[11px] text-ink-dim">
                  Tratto da: <span className="text-ink">{recentActivity.title}</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {recentActivity.tags.map((t) => (
                    <Chip key={t} size="sm">#{t}</Chip>
                  ))}
                </div>
                <div className="mt-4 flex h-28 items-center justify-center rounded-lg border border-line bg-panel-raised text-[11px] text-ink-mute">
                  mappa replay — da costruire
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <div className="font-mono text-ink">{recentActivity.distanceKm} km</div>
                    <div className="text-ink-mute">totali</div>
                  </div>
                  <div>
                    <div className="font-mono text-ink">{Math.round(recentActivity.avgSpeedKmh)} km/h</div>
                    <div className="text-ink-mute">media</div>
                  </div>
                  <div>
                    <div className="font-mono text-ink">+{recentActivity.elevationGainM ?? 0} m</div>
                    <div className="text-ink-mute">dislivello</div>
                  </div>
                </div>
              </Card>
            </section>
          )}

          <section>
            <SectionLabel num="02">Chi c&apos;era</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {partecipanti.map(
                ({ profile, role }) =>
                  profile && (
                    <div
                      key={profile.id}
                      className="flex items-center gap-2 rounded-full border border-line bg-panel px-2 py-1"
                    >
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold"
                        style={{ background: profile.accentColor, color: "var(--bg)" }}
                      >
                        {profile.initials}
                      </div>
                      <span className="text-[11px]">{profile.displayName}</span>
                      {role === "leader" && (
                        <span
                          className="font-mono text-[9px] uppercase tracking-widest"
                          style={{ color: group.crestColor }}
                        >
                          · leader
                        </span>
                      )}
                    </div>
                  ),
              )}
            </div>
          </section>

          <section>
            <SectionLabel num="03">Da costruire</SectionLabel>
            <ul className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4">
              {[
                "Gallery media dell'uscita",
                "Medagliette auto-assegnate (primo al ritrovo, più km, ecc.)",
                "Commenti/reazioni dei membri",
                "Export storia come card condivisibile",
              ].map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-ink-soft">
                  <span
                    className="mt-[7px] inline-block h-[5px] w-[5px] shrink-0 rounded-full"
                    style={{ background: group.crestColor }}
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
