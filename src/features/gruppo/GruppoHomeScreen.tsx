"use client";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { Group } from "@/types/domain";
import { groupRides } from "@/mocks/groups";

interface GruppoHomeScreenProps {
  group: Group;
}

export function GruppoHomeScreen({ group }: GruppoHomeScreenProps) {
  const rides = groupRides.filter((r) => r.groupId === group.id);
  const confirmed = rides.find((r) => r.status === "confermata");

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
            {group.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
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
              {group.membersCount} membri · {rides.length} uscite in bacheca
            </p>
          </div>
        </div>
      </section>

      {confirmed && (
        <section>
          <SectionLabel num="01">Prossima uscita</SectionLabel>
          <Card>
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="font-display text-lg font-semibold">{confirmed.title}</div>
                <div className="text-sm text-ink-dim">{confirmed.meetupText}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm">
                  {new Date(confirmed.startAt).toLocaleDateString("it-IT", { weekday: "short", day: "2-digit" })}
                </div>
                <div
                  className="font-mono text-[11px]"
                  style={{ color: group.crestColor }}
                >
                  {new Date(confirmed.startAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-ink-dim">
              <span>{confirmed.distanceKm > 0 ? `${confirmed.distanceKm} km` : "Pista"}</span>
              <span>
                <span style={{ color: group.crestColor }}>{confirmed.confirmed}</span>/{confirmed.total} confermati
              </span>
              <Chip size="sm" active>{confirmed.status}</Chip>
            </div>
          </Card>
        </section>
      )}

      <section>
        <SectionLabel num="02">Tutte le uscite</SectionLabel>
        <div className="flex flex-col gap-3">
          {rides.map((r) => (
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
                  {r.confirmed}/{r.total} confermati
                </span>
                <Chip size="sm" active={r.status === "confermata"}>{r.status}</Chip>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel num="03">Da costruire</SectionLabel>
        <ul className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4">
          {[
            "Lista membri del gruppo con avatar e moto",
            "Crea / proponi una nuova uscita",
            "Conferma / rifiuta partecipazione (RSVP)",
            "Chat di gruppo",
            "Ruoli interni: leader, admin, membro",
            "Badge del gruppo",
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
    </div>
  );
}
