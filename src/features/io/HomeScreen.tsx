"use client";

import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Icon } from "@/components/nav/Icon";
import { useQuery } from "@/mocks/DbProvider";
import {
  getPrimaryMotorcycle,
  getLastActivity,
  getProfile,
  listMyActivities,
  listMyDocuments,
} from "@/mocks/queries";
import type { ScreenKey } from "@/components/nav/pillars";
import type { Activity, Motorcycle } from "@/types/domain";

// MOCK weather — the real provider lands much later (not in this prototype).
const WEATHER = {
  temp: 22,
  cond: "Cielo coperto",
  strada: "asciutta",
  vento: 12,
  visib: "buona",
  pressione: "1018 hPa",
  sub: "Strade asciutte. Buon momento per uscire.",
};

interface Advisory {
  severity: "danger" | "warning";
  text: string;
}

interface HomeScreenProps {
  onNavigate?: (s: ScreenKey) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps = {}) {
  const me = useQuery((db, userId) => getProfile(db, userId));
  const primary = useQuery((db, userId) => getPrimaryMotorcycle(db, userId));
  const last = useQuery((db, userId) => getLastActivity(db, userId));
  const activities = useQuery((db, userId) => listMyActivities(db, userId));
  const docs = useQuery((db, userId) => listMyDocuments(db, userId));
  const now = useQuery((_db, _uid, now) => now);

  const monthAgo = new Date(now);
  monthAgo.setUTCDate(monthAgo.getUTCDate() - 30);
  const monthIso = monthAgo.toISOString();
  const monthActs = activities.filter((a) => a.startedAt >= monthIso);
  const monthKm = Math.round(monthActs.reduce((acc, a) => acc + a.distanceKm, 0));

  const advisories: Advisory[] = [];
  for (const d of docs) {
    const days = Math.round(
      (new Date(d.expiresAt).getTime() - new Date(now).getTime()) / 86_400_000,
    );
    if (days < 0) {
      advisories.push({
        severity: "danger",
        text: `${d.kind.charAt(0).toUpperCase() + d.kind.slice(1)} scaduto da ${-days} giorni`,
      });
    } else if (days <= 30) {
      advisories.push({
        severity: days <= 7 ? "danger" : "warning",
        text: `${d.kind.charAt(0).toUpperCase() + d.kind.slice(1)} in scadenza fra ${days} giorni`,
      });
    }
  }

  return (
    <div className="screen-enter flex h-full flex-col overflow-hidden">
      {/* HERO — personal cockpit */}
      <section
        className="relative shrink-0 overflow-hidden"
        style={{ background: "linear-gradient(165deg, #1a1410 0%, #0b0a08 70%)" }}
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, var(--ember) 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative px-5 pb-4 pt-4">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-ink-dim">
                ▸ sessione · {new Date(now).toLocaleDateString("it-IT", { weekday: "short" })}{" "}
                {new Date(now).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <h1 className="font-display text-2xl font-medium leading-tight tracking-tight">
                Ciao, {me?.displayName}.
              </h1>
              <p className="mt-1 text-xs text-ink-soft">{WEATHER.sub}</p>
            </div>
            <div className="text-right">
              <Icon
                d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"
                size={18}
                className="ml-auto text-ember"
              />
              <p className="mt-1 font-display text-xl tabular-nums">
                {WEATHER.temp}°
              </p>
            </div>
          </div>

          {/* Odometer stats */}
          <div className="mb-3 flex items-end border-y border-line py-2">
            {[
              { label: "km totali",    value: primary?.totalKm.toLocaleString("it-IT") ?? "—", color: undefined },
              { label: "questo mese",  value: monthKm.toLocaleString("it-IT"), color: "var(--ember)" },
              { label: "uscite",       value: String(monthActs.length), color: undefined },
            ].map((s, i) => (
              <div key={i} className="relative flex-1">
                {i > 0 && (
                  <span className="absolute left-0 top-1 bottom-1 w-px bg-line" />
                )}
                <div className="px-3">
                  <p className="mb-0.5 font-mono text-[9px] uppercase tracking-widest text-ink-dim">
                    {s.label}
                  </p>
                  <p
                    className="font-display text-xl font-medium leading-none tracking-tight tabular-nums"
                    style={s.color ? { color: s.color } : undefined}
                  >
                    {s.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={() => onNavigate?.("io.registra")}
            className="group flex w-full items-center justify-between rounded-xl px-5 py-2.5 transition-all active:scale-[0.99]"
            style={{
              background: "var(--ember)",
              color: "var(--bg)",
              boxShadow: "0 8px 24px rgba(255, 106, 31, 0.21)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: "rgba(0,0,0,0.13)" }}
              >
                <Icon d="M6 3l14 9-14 9z" size={13} />
              </div>
              <div className="text-left">
                <p className="font-mono text-[10px] font-medium uppercase tracking-widest opacity-70">
                  avvia uscita
                </p>
                <p className="text-sm font-semibold">Sono in sella</p>
              </div>
            </div>
            <Icon d="M9 18l6-6-6-6" size={16} />
          </button>
        </div>
      </section>

      <div className="flex-1 space-y-3 overflow-hidden px-4 py-3">
        {/* AVVISI */}
        {advisories.length > 0 && (
          <section>
            <SectionLabel num="01">Attenzione</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {advisories.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                  style={{
                    background:
                      a.severity === "danger"
                        ? "rgba(209, 58, 58, 0.07)"
                        : "rgba(200, 162, 75, 0.06)",
                    borderLeft: `2px solid ${
                      a.severity === "danger" ? "var(--danger)" : "var(--warn)"
                    }`,
                  }}
                >
                  <Icon
                    d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 8v4 M12 16h.01"
                    size={13}
                    className={a.severity === "danger" ? "text-danger" : "text-warn"}
                  />
                  <p className="flex-1 text-sm">{a.text}</p>
                  <Icon d="M9 18l6-6-6-6" size={13} className="text-ink-dim" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ULTIMA USCITA */}
        {last && (
          <section>
            <SectionLabel
              num="02"
              action="storico"
              onAction={() => onNavigate?.("io.garage")}
            >
              Ultima uscita
            </SectionLabel>
            <Card className="!p-0 overflow-hidden">
              <MiniMap seed={last.polylineSeed ?? 1} height={60} />
              <div className="p-3">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-base font-medium">{last.title}</p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-dim">
                      {new Date(last.startedAt).toLocaleDateString("it-IT", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <Icon d="M9 18l6-6-6-6" size={16} className="text-ink-dim" />
                </div>
                <div className="grid grid-cols-4 gap-3 border-t border-line pt-3">
                  {[
                    { label: "km",     value: last.distanceKm.toFixed(1) },
                    { label: "durata", value: formatDuration(last.durationSeconds) },
                    { label: "v.max",  value: String(Math.round(last.maxSpeedKmh)) },
                    { label: "d+",     value: last.elevationGainM ? `${last.elevationGainM}` : "—" },
                  ].map((m, i) => (
                    <div key={i}>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-ink-dim">
                        {m.label}
                      </p>
                      <p className="font-display text-base tabular-nums">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </section>
        )}

        {/* MOTO */}
        {primary && (
          <section>
            <SectionLabel
              num="03"
              action="garage"
              onAction={() => onNavigate?.("io.garage")}
            >
              Moto
            </SectionLabel>
            <BikeCard bike={primary} lastActivity={last} />
          </section>
        )}
      </div>
    </div>
  );
}

function BikeCard({ bike, lastActivity }: { bike: Motorcycle; lastActivity?: Activity }) {
  // Mock oil-change progress: target every 3500 km. Recompute from totalKm.
  const interval = 3500;
  const sinceLast = bike.totalKm % interval;
  const pct = Math.min(100, Math.round((sinceLast / interval) * 100));
  const isWarn = pct >= 85;

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="relative">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-xl border border-line"
            style={{ background: "var(--bg)" }}
          >
            <Icon
              d="M5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M5 15l3-7 4 7 3-7h-3 M15 8h3"
              size={28}
              className="text-ember"
            />
          </div>
          <span
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full"
            style={{ background: "var(--ember)" }}
          >
            <span className="font-mono text-[8px] font-bold" style={{ color: "var(--bg)" }}>
              1
            </span>
          </span>
        </div>
        <div className="flex-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-dim">
            {bike.brand} · {bike.year ?? "—"}
          </p>
          <p className="mt-0.5 text-lg font-medium leading-tight">
            {bike.brand} {bike.model}
          </p>
          <p className="text-xs text-ink-soft">«{bike.name}»</p>

          <div className="mt-3 flex items-baseline gap-1">
            <p className="font-display text-2xl font-medium leading-none tracking-tight tabular-nums">
              {bike.totalKm.toLocaleString("it-IT")}
            </p>
            <span className="text-xs text-ink-dim">km totali</span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <div className="mb-1.5 flex justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-dim">
            prossimo cambio olio
          </span>
          <span
            className="font-mono text-[10px] tabular-nums"
            style={{ color: isWarn ? "var(--warn)" : "var(--ink-dim)" }}
          >
            {sinceLast.toLocaleString("it-IT")} / {interval.toLocaleString("it-IT")} km
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: isWarn ? "var(--warn)" : "var(--ember)",
            }}
          />
        </div>
      </div>

      {lastActivity?.motorcycleId === bike.id && (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          ultima uscita su questa moto
        </p>
      )}
    </Card>
  );
}

/** Procedural mini-map polyline based on a seed. SVG only, no map tiles. */
function MiniMap({ seed, height = 96 }: { seed: number; height?: number }) {
  // Simple deterministic PRNG to lay out a polyline.
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const points: string[] = [];
  const N = 14;
  const W = 320;
  const H = height;
  let x = 16;
  let y = H / 2 + (next() - 0.5) * H * 0.4;
  points.push(`${x},${y}`);
  for (let i = 1; i < N; i++) {
    x += (W - 32) / (N - 1);
    y = Math.max(12, Math.min(H - 12, y + (next() - 0.5) * H * 0.5));
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      style={{ background: "linear-gradient(180deg, #120e0a 0%, #060503 100%)" }}
    >
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
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--ember)"
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={parseFloat(points[0].split(",")[0])}
        cy={parseFloat(points[0].split(",")[1])}
        r={4}
        fill="var(--ink)"
        stroke="var(--bg)"
        strokeWidth={2}
      />
      <circle
        cx={parseFloat(points[points.length - 1].split(",")[0])}
        cy={parseFloat(points[points.length - 1].split(",")[1])}
        r={4}
        fill="var(--ember)"
        stroke="var(--bg)"
        strokeWidth={2}
      />
    </svg>
  );
}

function formatDuration(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m.toString().padStart(2, "0")}`;
}
