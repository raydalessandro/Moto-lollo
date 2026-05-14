"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useQuery } from "@/mocks/DbProvider";
import {
  listGroupMembers,
  listUpcomingGroupRides,
  getNextConfirmedRide,
  isAdminOfGroup,
  listMembershipRequests,
} from "@/mocks/queries";
import type { Group } from "@/types/domain";

interface GruppoHomeScreenProps {
  group: Group;
  /** Whether the current viewer is a member of the group. */
  isMember: boolean;
}

export function GruppoHomeScreen({ group, isMember }: GruppoHomeScreenProps) {
  if (!isMember) return <NonMemberProfile group={group} />;
  return <MemberDashboard group={group} />;
}

// ─── Viewer is a member ─────────────────────────────────────────────────────

function MemberDashboard({ group }: { group: Group }) {
  const members = useQuery((db) => listGroupMembers(db, group.id));
  const upcoming = useQuery((db, _uid, now) => listUpcomingGroupRides(db, group.id, now));
  const next = useQuery((db, _uid, now) => getNextConfirmedRide(db, group.id, now));
  const amAdmin = useQuery((db, userId) => isAdminOfGroup(db, userId, group.id));
  const pendingJoin = useQuery((db) =>
    amAdmin ? listMembershipRequests(db, group.id, "pending") : [],
  );

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
              ▸ Gruppo {amAdmin && "· admin"}
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

      {amAdmin && pendingJoin.length > 0 && (
        <section>
          <SectionLabel num="00">Da approvare</SectionLabel>
          <Card>
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-bold"
                style={{
                  background: `${group.crestColor}22`,
                  color: group.crestColor,
                  borderColor: `${group.crestColor}55`,
                }}
              >
                {pendingJoin.length}
              </div>
              <div className="flex-1">
                <div className="font-display text-sm font-semibold">
                  Richieste di iscrizione
                </div>
                <div className="text-[11px] text-ink-dim">
                  {pendingJoin.length} rider in attesa della tua decisione
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors"
                style={{
                  borderColor: `${group.crestColor}55`,
                  background: `${group.crestColor}10`,
                  color: group.crestColor,
                }}
              >
                gestisci
              </button>
            </div>
          </Card>
        </section>
      )}

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
              <span>
                {next.distanceKm > 0
                  ? `${next.distanceKm} km · ${Math.round(next.estimatedDurationMin / 60)}h`
                  : "Pista"}
              </span>
              <span>
                <span style={{ color: group.crestColor }}>{next.confirmedCount}</span>/
                {next.invitedCount} confermati
              </span>
              <Chip size="sm" active>
                {next.status}
              </Chip>
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
                <Chip size="sm" active={r.status === "confermata"}>
                  {r.status}
                </Chip>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Viewer is NOT a member (discovery card) ────────────────────────────────

function NonMemberProfile({ group }: { group: Group }) {
  const [requested, setRequested] = useState(false);
  const members = useQuery((db) => listGroupMembers(db, group.id));

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <div className="flex items-center gap-3">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-lg border font-display text-base font-semibold uppercase"
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
              ▸ Profilo gruppo
            </span>
            <h1 className="mt-0.5 font-display text-2xl font-semibold tracking-tight">
              {group.name}
            </h1>
            <p className="text-sm text-ink-dim">
              {group.area ?? "—"} · {group.membersCount} membri · {group.publicRoutesCount} percorsi pubblici
            </p>
          </div>
        </div>
        {group.description && (
          <p className="mt-3 text-sm text-ink-soft">{group.description}</p>
        )}
      </section>

      <section>
        <Card>
          <div className="flex flex-col items-start gap-3">
            <div className="font-display text-base font-semibold">
              {requested ? "Richiesta inviata" : "Iscriviti al gruppo"}
            </div>
            <p className="text-sm text-ink-dim">
              {requested
                ? `Un admin di ${group.name} riceverà la tua richiesta e potrà approvarla o rifiutarla. Riceverai una notifica.`
                : `${group.name} è un gruppo privato. Invia richiesta: un admin del gruppo deciderà.`}
            </p>
            <button
              type="button"
              onClick={() => setRequested((v) => !v)}
              disabled={requested}
              className="mt-2 flex w-full items-center justify-center rounded-xl px-4 py-3 font-display text-sm font-semibold uppercase tracking-wider transition-colors disabled:opacity-60"
              style={{
                background: requested ? "var(--panel-raised)" : group.crestColor,
                color: requested ? "var(--ink-dim)" : "var(--bg)",
                border: `1px solid ${requested ? "var(--line)" : group.crestColor}`,
              }}
            >
              {requested ? "✓ Richiesta in attesa" : "Richiedi iscrizione"}
            </button>
          </div>
        </Card>
      </section>

      <section>
        <SectionLabel num="01">Preview pubblica</SectionLabel>
        <Card>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="font-display text-2xl tabular-nums">
                {group.membersCount}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                membri
              </div>
            </div>
            <div>
              <div className="font-display text-2xl tabular-nums">
                {group.publicRoutesCount}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                percorsi pubblici
              </div>
            </div>
            <div>
              <div className="font-display text-2xl tabular-nums">
                {Math.max(1, Math.round((new Date().getTime() - new Date(group.foundedAt).getTime()) / 86_400_000 / 365))}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                anni attivi
              </div>
            </div>
          </div>
        </Card>
      </section>

      {members.length > 0 && (
        <section>
          <SectionLabel num="02">Leader del gruppo</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {members
              .filter((m) => m.role === "leader" || m.role === "admin")
              .map(({ profile, role }) =>
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
                    <span
                      className="font-mono text-[9px] uppercase tracking-widest"
                      style={{ color: group.crestColor }}
                    >
                      · {role}
                    </span>
                  </div>
                ) : null,
              )}
          </div>
        </section>
      )}

      <section>
        <SectionLabel num="03">Cosa vedrai entrando</SectionLabel>
        <ul className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4 text-sm text-ink-soft">
          {[
            "Bacheca eventi del gruppo, con prossime uscite",
            "Cordata live durante le uscite",
            "Storie e diario delle gite passate",
            "Possibilità di proporre percorsi all'admin",
            "Lista completa membri con ruoli",
          ].map((b, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="mt-[7px] inline-block h-[5px] w-[5px] rounded-full"
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
