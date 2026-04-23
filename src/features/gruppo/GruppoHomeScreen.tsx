"use client";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useQuery } from "@/mocks/DbProvider";
import {
  listGroupMembers,
  listUpcomingGroupRides,
  getNextConfirmedRide,
} from "@/mocks/queries";
import type { Group } from "@/types/domain";

interface GruppoHomeScreenProps {
  group: Group;
}

export function GruppoHomeScreen({ group }: GruppoHomeScreenProps) {
  const members = useQuery((db) => listGroupMembers(db, group.id));
  const upcoming = useQuery((db, _uid, now) => listUpcomingGroupRides(db, group.id, now));
  const next = useQuery((db, _uid, now) => getNextConfirmedRide(db, group.id, now));

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-lg border font-display text-sm font-semibold uppercase"
            style={{
              background: `${group.crestColor}22`,
              color: group.crestColor,
              borderColor: `${group.crestColor}55`,
            }}
          >
            {group.tag}
          </div>
          <div>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.28em]"
              style={{ color: group.crestColor }}
            >
              ▸ Gruppo
            </span>
            <h1 className="mt-0.5 font-display text-2xl font-semibold tracking-tight">
              {group.name}
            </h1>
            <p className="text-sm text-ink-dim">
              {members.length} membri · {upcoming.length} uscite in bacheca
            </p>
          </div>
        </div>
        {group.description && (
          <p className="mt-3 text-sm text-ink-soft">{group.description}</p>
        )}
      </section>

      {next && (
        <section>
          <SectionLabel num="01">Prossima uscita</SectionLabel>
          <Card>
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="font-display text-lg font-semibold">{next.title}</div>
                <div className="text-sm text-ink-dim">{next.meetupText}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm">
                  {new Date(next.startAt).toLocaleDateString("it-IT", { weekday: "short", day: "2-digit" })}
                </div>
                <div
                  className="font-mono text-[11px]"
                  style={{ color: group.crestColor }}
                >
                  {new Date(next.startAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-ink-dim">
              <span>{next.distanceKm > 0 ? `${next.distanceKm} km · ${Math.round(next.estimatedDurationMin / 60)}h` : "Pista"}</span>
              <span>
                <span style={{ color: group.crestColor }}>{next.confirmedCount}</span>/{next.invitedCount} confermati
              </span>
              <Chip size="sm" active>{next.status}</Chip>
            </div>
          </Card>
        </section>
      )}

      <section>
        <SectionLabel num="02">Membri</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {members.map(({ profile, role }) =>
            profile ? (
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
                <span className="text-[11px] text-ink">{profile.displayName}</span>
                {role !== "member" && (
                  <span
                    className="font-mono text-[9px] uppercase tracking-widest"
                    style={{ color: group.crestColor }}
                  >
                    · {role}
                  </span>
                )}
              </div>
            ) : null,
          )}
        </div>
      </section>

      <section>
        <SectionLabel num="03">Tutte le uscite</SectionLabel>
        <div className="flex flex-col gap-3">
          {upcoming.map((r) => (
            <Card key={r.id}>
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="font-display text-base font-semibold">{r.title}</div>
                  <div className="text-sm text-ink-dim">{r.meetupText}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">
                    {new Date(r.startAt).toLocaleDateString("it-IT", { weekday: "short", day: "2-digit" })}
                  </div>
                  <div className="font-mono text-[11px] text-ink-dim">
                    {new Date(r.startAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-ink-dim">
                <span>{r.distanceKm > 0 ? `${r.distanceKm} km` : "Pista"}</span>
                <span>
                  {r.confirmedCount}/{r.invitedCount} confermati
                </span>
                <Chip size="sm" active={r.status === "confermata"}>{r.status}</Chip>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
