"use client";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useQuery } from "@/mocks/DbProvider";
import { listGroupRides, listGroupMembers } from "@/mocks/queries";
import type { Group } from "@/types/domain";

interface CordataScreenProps {
  group: Group;
}

export function CordataScreen({ group }: CordataScreenProps) {
  const inCorso = useQuery((db) =>
    listGroupRides(db, group.id).find((r) => r.status === "in-corso"),
  );
  const members = useQuery((db) => listGroupMembers(db, group.id));

  if (!inCorso) {
    return (
      <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
        <section>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: group.crestColor }}
          >
            ▸ Cordata · {group.name}
          </span>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Nessuna cordata attiva
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            La cordata si attiva durante un&apos;uscita di gruppo in corso.
          </p>
        </section>

        <section>
          <Card>
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <div
                className="relative flex h-16 w-16 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: `${group.crestColor}40`,
                  background: `${group.crestColor}10`,
                }}
              >
                <span
                  className="font-display text-xl font-semibold"
                  style={{ color: group.crestColor }}
                >
                  {group.tag}
                </span>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                stand by
              </div>
            </div>
          </Card>
        </section>

        <section>
          <SectionLabel num="01">Come funziona</SectionLabel>
          <ul className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4">
            {[
              "Mappa live con ciascun membro (aggiornamento 5s)",
              "Filo cordata: polyline tra i rider in ordine",
              "Alert automatico: rider indietro, rider fermo, segnale perso",
              "Chat cordata + comandi rapidi (si parte, pausa, benzina)",
              "Share link esterno per contatti emergenza",
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

  const confirmedMembers = members.slice(0, inCorso.confirmedCount);

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <div className="flex items-baseline justify-between">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: group.crestColor }}
          >
            ▸ Cordata LIVE
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ember">
            <span className="live-pulse-dot inline-block h-2 w-2 rounded-full bg-ember" />
            live
          </span>
        </div>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
          {inCorso.title}
        </h1>
        <p className="mt-1 text-sm text-ink-dim">{inCorso.meetupText}</p>
      </section>

      <section>
        <Card>
          <div className="flex h-48 items-center justify-center rounded-lg border border-line bg-panel-raised text-[11px] text-ink-mute">
            mappa live cordata — da costruire
          </div>
        </Card>
      </section>

      <section>
        <SectionLabel num="01">Rider in cordata</SectionLabel>
        <div className="flex flex-col gap-2">
          {confirmedMembers.map(({ profile, role }, idx) =>
            profile ? (
              <Card key={profile.id}>
                <div className="flex items-center gap-3">
                  <span className="w-6 text-right font-mono text-[11px] text-ink-mute">
                    {idx + 1}.
                  </span>
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ background: profile.accentColor, color: "var(--bg)" }}
                  >
                    {profile.initials}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{profile.displayName}</div>
                    <div className="text-[11px] text-ink-dim">
                      {role === "leader" ? "leader · testa" : "in cordata"}
                    </div>
                  </div>
                  <Chip size="sm" active>online</Chip>
                </div>
              </Card>
            ) : null,
          )}
        </div>
      </section>

      <section>
        <SectionLabel num="02">Comandi</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          {["Pausa gruppo", "Benzina", "Si parte", "Foto stop"].map((c) => (
            <button
              key={c}
              type="button"
              className="rounded-xl border border-line bg-panel px-4 py-3 text-sm transition-colors hover:bg-panel-raised"
            >
              {c}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
