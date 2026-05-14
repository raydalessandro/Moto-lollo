"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Icon } from "@/components/nav/Icon";
import { useQuery } from "@/mocks/DbProvider";
import {
  listGroupRides,
  listGroupMembers,
  listRideRSVPs,
  getProfile,
  isAdminOfGroup,
} from "@/mocks/queries";
import type { Group, GroupRide, Profile } from "@/types/domain";

interface CordataScreenProps {
  group: Group;
}

type CordataPhase =
  | { kind: "empty" }
  | { kind: "pre"; ride: GroupRide }
  | { kind: "live"; ride: GroupRide };

export function CordataScreen({ group }: CordataScreenProps) {
  const allRides = useQuery((db) => listGroupRides(db, group.id));
  const amAdmin = useQuery((db, userId) => isAdminOfGroup(db, userId, group.id));

  const phase: CordataPhase = (() => {
    const inCorso = allRides.find((r) => r.status === "in-corso");
    if (inCorso) return { kind: "live", ride: inCorso };
    const confermata = allRides
      .filter((r) => r.status === "confermata")
      .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
    if (confermata) return { kind: "pre", ride: confermata };
    return { kind: "empty" };
  })();

  if (phase.kind === "empty") return <EmptyState group={group} />;
  if (phase.kind === "pre")
    return <PreDeparture group={group} ride={phase.ride} amAdmin={amAdmin} />;
  return <LiveCordata group={group} ride={phase.ride} amAdmin={amAdmin} />;
}

// ─── Empty ──────────────────────────────────────────────────────────────────

function EmptyState({ group }: { group: Group }) {
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
          La cordata si attiva poco prima dell&apos;inizio di un&apos;uscita
          confermata.
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
            "Chat cordata + comandi rapidi",
            "L'admin designa un navigatore: solo lui ha la turn-by-turn",
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

// ─── Pre-departure ──────────────────────────────────────────────────────────

function PreDeparture({
  group,
  ride,
  amAdmin,
}: {
  group: Group;
  ride: GroupRide;
  amAdmin: boolean;
}) {
  const rsvps = useQuery((db) => listRideRSVPs(db, ride.id));
  const goingIds = rsvps.filter((r) => r.value === "going").map((r) => r.userId);
  const goingProfiles = useQuery((db) =>
    goingIds.map((id) => getProfile(db, id)).filter(Boolean) as Profile[],
  );
  // Local state for admin to pick the navigator. Real mutation comes later.
  const [pickedNavigatorId, setPickedNavigatorId] = useState<string | undefined>(
    ride.navigatorUserId,
  );
  const effectiveNavigator = goingProfiles.find((p) => p.id === pickedNavigatorId);
  const iAmNavigator = pickedNavigatorId === "u0";
  const now = useQuery((_db, _uid, now) => now);
  const hoursToStart = Math.max(
    0,
    Math.round(
      (new Date(ride.startAt).getTime() - new Date(now).getTime()) / 3_600_000,
    ),
  );

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <div className="flex items-baseline justify-between">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: group.crestColor }}
          >
            ▸ Cordata · pre-partenza
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
            tra {hoursToStart}h
          </span>
        </div>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
          {ride.title}
        </h1>
        <p className="mt-1 text-sm text-ink-dim">{ride.meetupText}</p>
      </section>

      <section>
        <Card>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="font-display text-xl tabular-nums">
                {ride.distanceKm > 0 ? ride.distanceKm : "—"}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                km
              </div>
            </div>
            <div>
              <div className="font-display text-xl tabular-nums">
                {Math.floor(ride.estimatedDurationMin / 60)}h
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                durata
              </div>
            </div>
            <div>
              <div
                className="font-display text-xl tabular-nums"
                style={{ color: group.crestColor }}
              >
                {ride.confirmedCount}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                confermati
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <SectionLabel num="01">Navigatore designato</SectionLabel>
        {effectiveNavigator ? (
          <Card>
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold"
                style={{ background: effectiveNavigator.accentColor, color: "var(--bg)" }}
              >
                {effectiveNavigator.initials}
              </div>
              <div className="flex-1">
                <div className="font-display text-base font-semibold">
                  {effectiveNavigator.displayName}
                  {iAmNavigator && (
                    <span
                      className="ml-2 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest"
                      style={{ background: group.crestColor, color: "var(--bg)" }}
                    >
                      sei tu
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-ink-dim">
                  Avrà la navigazione turn-by-turn. Gli altri seguono in cordata.
                </div>
              </div>
            </div>
            {iAmNavigator && (
              <button
                type="button"
                className="mt-3 w-full rounded-lg border px-3 py-2 font-mono text-[11px] uppercase tracking-wider"
                style={{
                  borderColor: group.crestColor,
                  background: `${group.crestColor}15`,
                  color: group.crestColor,
                }}
              >
                Apri turn-by-turn (alla partenza)
              </button>
            )}
          </Card>
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-panel/60 p-4 text-center text-sm text-ink-dim">
            Ancora nessun navigatore designato.
          </div>
        )}

        {amAdmin && (
          <div className="mt-3 flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-dim">
              ▸ scegli chi guida
            </span>
            <div className="flex flex-wrap gap-2">
              {goingProfiles.map((p) => {
                const isSel = p.id === pickedNavigatorId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPickedNavigatorId(p.id)}
                    className="flex items-center gap-2 rounded-full border px-2 py-1 transition-colors"
                    style={{
                      borderColor: isSel ? group.crestColor : "var(--line)",
                      background: isSel ? `${group.crestColor}15` : "var(--panel)",
                    }}
                  >
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold"
                      style={{ background: p.accentColor, color: "var(--bg)" }}
                    >
                      {p.initials}
                    </div>
                    <span
                      className="text-[11px]"
                      style={{ color: isSel ? group.crestColor : "var(--ink)" }}
                    >
                      {p.displayName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section>
        <SectionLabel num="02">Chi parte</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {goingProfiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-full border border-line bg-panel px-2 py-1"
            >
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold"
                style={{ background: p.accentColor, color: "var(--bg)" }}
              >
                {p.initials}
              </div>
              <span className="text-[11px]">{p.displayName}</span>
              {p.id === pickedNavigatorId && (
                <span
                  className="font-mono text-[9px] uppercase tracking-widest"
                  style={{ color: group.crestColor }}
                >
                  · guida
                </span>
              )}
            </div>
          ))}
          {goingProfiles.length === 0 && (
            <div className="text-[11px] text-ink-dim">Nessuno ha ancora confermato.</div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Live cordata (in-corso) ────────────────────────────────────────────────

function LiveCordata({
  group,
  ride,
  amAdmin,
}: {
  group: Group;
  ride: GroupRide;
  amAdmin: boolean;
}) {
  const [view, setView] = useState<"mappa" | "piloti" | "chat">("mappa");
  const members = useQuery((db) => listGroupMembers(db, group.id));
  const confirmedMembers = members.slice(0, ride.confirmedCount);
  const iAmNavigator = ride.navigatorUserId === "u0";
  const navigator = useQuery((db) =>
    ride.navigatorUserId ? getProfile(db, ride.navigatorUserId) : undefined,
  );

  // Mock progress numbers for the live HUD.
  const elapsedMin = Math.max(15, ride.estimatedDurationMin / 3);
  const elapsedH = Math.floor(elapsedMin / 60);
  const elapsedM = Math.floor(elapsedMin % 60);

  return (
    <div className="screen-enter flex flex-col gap-3 pb-24">
      {/* Live header — dark, fixed-style */}
      <header
        className="flex items-center gap-3 border-b px-5 py-3"
        style={{ background: "var(--bg)", borderColor: "var(--line)" }}
      >
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="live-pulse-dot inline-block h-2 w-2 rounded-full"
            style={{ background: "var(--ember)" }}
          />
          <span
            className="font-mono text-[9px] font-semibold uppercase tracking-[0.3em]"
            style={{ color: "var(--ember)" }}
          >
            CORDATA LIVE
          </span>
        </div>
        <div className="flex-1 text-right">
          <p className="font-mono text-[9px] uppercase tracking-wider text-ink-dim">
            iniziato {elapsedH}h {String(elapsedM).padStart(2, "0")}m fa
          </p>
        </div>
      </header>

      {iAmNavigator && (
        <div className="mx-4 mt-1">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl px-4 py-3 font-display text-sm font-semibold uppercase tracking-wider"
            style={{
              background: "var(--ember)",
              color: "var(--bg)",
              boxShadow: "0 8px 24px rgba(255, 106, 31, 0.21)",
            }}
          >
            <span>Sei il navigatore · apri turn-by-turn</span>
            <Icon d="M3 11l19-9-9 19-2-8z" size={16} />
          </button>
        </div>
      )}

      {/* View switcher */}
      <div className="px-4">
        <div className="flex overflow-hidden rounded-lg border border-line">
          {([
            { k: "mappa",  l: "Mappa",  d: "M9 3L3 6v15l6-3 6 3 6-3V3l-6 3z M9 3v15 M15 6v15" },
            { k: "piloti", l: "Piloti", d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" },
            { k: "chat",   l: "Chat",   d: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" },
          ] as const).map((t) => {
            const isActive = view === t.k;
            return (
              <button
                key={t.k}
                type="button"
                onClick={() => setView(t.k)}
                className="flex flex-1 items-center justify-center gap-1.5 py-2 transition-colors"
                style={{
                  background: isActive ? `${group.crestColor}15` : "transparent",
                  color: isActive ? group.crestColor : "var(--ink-dim)",
                }}
              >
                <Icon d={t.d} size={13} />
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  {t.l}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats strip */}
      <div className="mx-4 flex items-end gap-0 rounded-xl border border-line bg-panel py-3">
        {[
          { label: "km percorsi", value: (ride.distanceKm * 0.42).toFixed(1) },
          {
            label: "durata",
            value: `${elapsedH}h ${String(elapsedM).padStart(2, "0")}`,
          },
          { label: "rider", value: String(confirmedMembers.length) },
        ].map((s, i) => (
          <div key={s.label} className="relative flex-1">
            {i > 0 && (
              <span className="absolute left-0 top-1 bottom-1 w-px bg-line" />
            )}
            <div className="px-3">
              <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-ink-dim">
                {s.label}
              </p>
              <p
                className="font-display text-xl font-medium leading-none tracking-tight tabular-nums"
                style={i === 0 ? { color: group.crestColor } : undefined}
              >
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {view === "mappa" && (
        <div className="mx-4">
          <CordataMap
            group={group}
            pilots={confirmedMembers.map(({ profile, role }) => ({
              id: profile?.id ?? "",
              initials: profile?.initials ?? "",
              accent: profile?.accentColor ?? "var(--ember)",
              isNavigator: profile?.id === ride.navigatorUserId,
              isLeader: role === "leader",
            }))}
          />
        </div>
      )}

      {view === "piloti" && (
        <div className="mx-4 flex flex-col gap-2">
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
                      {profile.id === ride.navigatorUserId
                        ? "navigatore · turn-by-turn"
                        : role === "leader"
                          ? "leader gruppo"
                          : "in cordata"}
                    </div>
                  </div>
                  {profile.id === ride.navigatorUserId ? (
                    <Chip size="sm" active>
                      guida
                    </Chip>
                  ) : (
                    <Chip size="sm">online</Chip>
                  )}
                </div>
              </Card>
            ) : null,
          )}
        </div>
      )}

      {view === "chat" && (
        <div className="mx-4 flex flex-col gap-2">
          <div className="rounded-xl border border-line bg-panel p-3 text-[11px] text-ink-dim">
            Chat cordata · solo testo durante la guida.
          </div>
          {[
            { who: navigator?.displayName ?? "Navigatore", text: "Mi fermo al bivio per aspettare." },
            { who: "Ray", text: "Ok, arriviamo." },
            { who: "Giulia", text: "Foto al passo dopo?" },
          ].map((m, i) => (
            <div key={i} className="rounded-lg border border-line bg-bg px-3 py-2 text-sm">
              <span className="font-semibold">{m.who}</span>{" "}
              <span className="text-ink-soft">— {m.text}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Scrivi…"
              className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:border-ember/60 focus:outline-none"
            />
            <button
              type="button"
              className="rounded-lg border px-3 py-2 font-mono text-[11px] uppercase tracking-wider"
              style={{
                borderColor: group.crestColor,
                background: `${group.crestColor}15`,
                color: group.crestColor,
              }}
            >
              invia
            </button>
          </div>
          {amAdmin && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {["Si parte", "Pausa", "Benzina", "Foto stop"].map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  className="rounded-lg border border-line bg-panel px-3 py-2 text-[11px] uppercase tracking-wider text-ink-soft transition-colors hover:border-line-soft"
                >
                  {cmd}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Cordata SVG map (procedurale, no map tiles) ────────────────────────────

function CordataMap({
  group,
  pilots,
}: {
  group: Group;
  pilots: Array<{
    id: string;
    initials: string;
    accent: string;
    isNavigator: boolean;
    isLeader: boolean;
  }>;
}) {
  // Path is deterministic, riders are spaced along it. Like the prototype.
  const W = 320;
  const H = 220;
  const path = `M 20 ${H - 30} Q ${W * 0.3} ${H - 100} ${W * 0.5} ${H * 0.55} T ${W * 0.85} 40`;
  const N = pilots.length;
  // Stops along the path (approximate, using sampled points).
  const stops = sampleCurve(W, H, N);

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-line"
      style={{ background: "linear-gradient(180deg, #120e0a 0%, #060503 100%)" }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-56 w-full">
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={0}
            x2={W}
            y1={H * t}
            y2={H * t}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
          />
        ))}
        {/* Cordata thread */}
        <path
          d={path}
          fill="none"
          stroke={group.crestColor}
          strokeOpacity={0.4}
          strokeWidth={2}
          className="cordata-thread"
        />
        {/* Pilots along the thread */}
        {stops.map((pt, i) => {
          const pilot = pilots[i];
          if (!pilot) return null;
          return (
            <g key={pilot.id} transform={`translate(${pt.x}, ${pt.y})`}>
              {pilot.isNavigator && (
                <circle
                  r={12}
                  fill="none"
                  stroke="var(--ember)"
                  strokeWidth={1.5}
                  className="avatar-ring-spin"
                />
              )}
              <circle r={9} fill={pilot.accent} stroke="var(--bg)" strokeWidth={2} />
              <text
                x={0}
                y={3}
                fill="var(--bg)"
                fontSize={8}
                fontWeight={700}
                textAnchor="middle"
              >
                {pilot.initials}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-bg/80 px-2 py-1 backdrop-blur-sm">
        <span
          className="live-pulse-dot inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--ember)" }}
        />
        <span className="font-mono text-[9px] uppercase tracking-widest text-ink">
          mappa live cordata
        </span>
      </div>
    </div>
  );
}

function sampleCurve(W: number, H: number, n: number): Array<{ x: number; y: number }> {
  // Same shape as the path above (quadratic bezier), sample n points.
  const out: Array<{ x: number; y: number }> = [];
  const p0 = { x: 20, y: H - 30 };
  const p1 = { x: W * 0.3, y: H - 100 };
  const p2 = { x: W * 0.5, y: H * 0.55 };
  const p3 = { x: W * 0.85, y: 40 };
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    // Approximate with two quadratic bezier halves.
    if (t < 0.5) {
      const tt = t * 2;
      const x = (1 - tt) ** 2 * p0.x + 2 * (1 - tt) * tt * p1.x + tt ** 2 * p2.x;
      const y = (1 - tt) ** 2 * p0.y + 2 * (1 - tt) * tt * p1.y + tt ** 2 * p2.y;
      out.push({ x, y });
    } else {
      const tt = (t - 0.5) * 2;
      const x = (1 - tt) ** 2 * p2.x + 2 * (1 - tt) * tt * p2.x + tt ** 2 * p3.x;
      const y = (1 - tt) ** 2 * p2.y + 2 * (1 - tt) * tt * ((p2.y + p3.y) / 2) + tt ** 2 * p3.y;
      out.push({ x, y });
    }
  }
  return out;
}
