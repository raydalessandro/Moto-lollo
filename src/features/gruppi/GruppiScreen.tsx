"use client";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { groups, groupRides } from "@/mocks/groups";

export function GruppiScreen() {
  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ember">
          ▸ Gruppi & Eventi
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          I tuoi gruppi
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {groups.length} gruppi · {groupRides.length} uscite in bacheca
        </p>
      </section>

      <section>
        <SectionLabel num="01" action="Esplora">Gruppi</SectionLabel>
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <Card key={g.id}>
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-line font-display text-xs font-semibold uppercase"
                  style={{
                    background: `${g.crestColor}22`,
                    color: g.crestColor,
                    borderColor: `${g.crestColor}55`,
                  }}
                >
                  {g.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1">
                  <div className="font-display text-base font-semibold">{g.name}</div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-mute">
                    {g.membersCount} membri
                  </div>
                </div>
                {g.isMember && <Chip size="sm">Membro</Chip>}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel num="02">Uscite in programma</SectionLabel>
        <div className="flex flex-col gap-3">
          {groupRides.slice(0, 4).map((r) => {
            const g = groups.find((gg) => gg.id === r.groupId);
            return (
              <Card key={r.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-ink-mute">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: g?.crestColor }}
                      />
                      {g?.name}
                    </div>
                    <div className="mt-1 font-display text-base font-semibold">{r.title}</div>
                    <div className="text-sm text-ink-dim">{r.meetupText}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">
                      {new Date(r.startAt).toLocaleDateString("it-IT", { weekday: "short", day: "2-digit" })}
                    </div>
                    <div className="font-mono text-[11px] text-ember">
                      {new Date(r.startAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-ink-dim">
                  <span>{r.distanceKm > 0 ? `${r.distanceKm} km` : "Pista"}</span>
                  <span>
                    <span className="text-ember">{r.confirmed}</span>/{r.total} confermati
                  </span>
                  <Chip size="sm" active={r.status === "confermata"}>{r.status}</Chip>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <SectionLabel num="03">Da costruire</SectionLabel>
        <ul className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4">
          {[
            "Home gruppo: membri, cordata live, eventi",
            "Crea / proponi un'uscita",
            "Conferma / rifiuta partecipazione (RSVP)",
            "Chat di gruppo e coordinamento in tempo reale",
            "Ruoli interni: leader, admin, membro",
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
