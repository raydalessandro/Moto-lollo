"use client";

import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/nav/Icon";
import { useQuery } from "@/mocks/DbProvider";
import {
  getPrimaryMotorcycle,
  getProfile,
  listMyDocuments,
  listSavedPublishedRoutes,
} from "@/mocks/queries";
import type { ScreenKey } from "@/components/nav/pillars";
import type { PublishedRoute } from "@/types/domain";

// MOCK weather — the real provider lands much later (not in this prototype).
const WEATHER = {
  temp: 22,
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
  const docs = useQuery((db, userId) => listMyDocuments(db, userId));
  const saved = useQuery((db, userId) => listSavedPublishedRoutes(db, userId));
  const now = useQuery((_db, _uid, now) => now);

  const advisories: Advisory[] = [];
  for (const d of docs) {
    const days = Math.round(
      (new Date(d.expiresAt).getTime() - new Date(now).getTime()) / 86_400_000,
    );
    if (days < 0) {
      advisories.push({
        severity: "danger",
        text: `${capitalize(d.kind)} scaduto da ${-days}g`,
      });
    } else if (days <= 30) {
      advisories.push({
        severity: days <= 7 ? "danger" : "warning",
        text: `${capitalize(d.kind)} scade fra ${days}g`,
      });
    }
  }
  const topAdvisory = advisories[0]; // mostra solo la più urgente

  return (
    <div className="screen-enter flex h-full flex-col overflow-hidden">
      {/* HERO — visual block */}
      <section
        className="relative shrink-0 overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #2a1810 0%, #1a1410 40%, #0b0a08 100%)",
          minHeight: "32vh",
        }}
      >
        {/* Ember glow */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40"
          style={{
            background: "radial-gradient(circle, var(--ember) 0%, transparent 70%)",
          }}
        />
        {/* Topographic lines */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
          viewBox="0 0 360 240"
          preserveAspectRatio="none"
        >
          {Array.from({ length: 6 }).map((_, i) => {
            const y = 30 + i * 40;
            return (
              <path
                key={i}
                d={`M-20 ${y} Q 90 ${y - 25} 180 ${y + 5} T 380 ${y - 15}`}
                stroke="#fff"
                strokeWidth={1}
                fill="none"
              />
            );
          })}
        </svg>
        {/* Subtle dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />

        <div className="relative flex h-full flex-col justify-between px-5 py-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-dim">
              ▸ {new Date(now).toLocaleDateString("it-IT", { weekday: "short" })}{" "}
              {new Date(now).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <h1 className="mt-1 font-display text-3xl font-medium leading-tight tracking-tight">
              Ciao, {me?.displayName}.
            </h1>
            <p className="mt-1 text-xs text-ink-soft">
              {WEATHER.sub} · {WEATHER.temp}°
            </p>
          </div>

          {/* Bottom: total km big */}
          <div className="mt-5 flex items-end justify-between">
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-ink-dim">
                km totali
              </p>
              <p className="font-display text-4xl font-medium leading-none tracking-tight tabular-nums">
                {primary?.totalKm.toLocaleString("it-IT") ?? "—"}
                <span className="ml-1.5 text-base font-normal text-ink-dim">km</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.("io.garage")}
              className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-bg/40 px-3 backdrop-blur-sm transition-colors hover:border-ember/40"
            >
              <Icon
                d="M5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M5 15l3-7 4 7 3-7h-3 M15 8h3"
                size={13}
                className="text-ember"
              />
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-soft">
                Garage
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Advisory banner (1-line) */}
      {topAdvisory && (
        <button
          type="button"
          onClick={() => onNavigate?.("io.garage")}
          className="flex shrink-0 items-center gap-2 border-y border-line px-4 py-2 text-left"
          style={{
            background:
              topAdvisory.severity === "danger"
                ? "rgba(209, 58, 58, 0.08)"
                : "rgba(200, 162, 75, 0.07)",
          }}
        >
          <Icon
            d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 8v4 M12 16h.01"
            size={12}
            className={
              topAdvisory.severity === "danger" ? "text-danger" : "text-warn"
            }
          />
          <p className="flex-1 truncate text-[12px]">{topAdvisory.text}</p>
          <Icon d="M9 18l6-6-6-6" size={12} className="text-ink-dim" />
        </button>
      )}

      {/* Quick actions 2x2 */}
      <section className="shrink-0 px-4 pb-3 pt-3">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="font-display text-base font-medium">Azioni rapide</p>
          <button
            type="button"
            onClick={() => onNavigate?.("io.registra")}
            className="font-mono text-[10px] uppercase tracking-widest text-ink-dim hover:text-ember"
          >
            tutte →
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <QuickAction
            label="Registra"
            sub="mentre guidi"
            iconPath="M6 3l14 9-14 9z"
            highlight
            onClick={() => onNavigate?.("io.registra")}
          />
          <QuickAction
            label="Crea"
            sub="su mappa"
            iconPath="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3z M9 3v15 M15 6v15"
            onClick={() => onNavigate?.("io.registra")}
          />
          <QuickAction
            label="Naviga"
            sub="a destinazione"
            iconPath="M3 11l19-9-9 19-2-8z"
            onClick={() => onNavigate?.("io.registra")}
          />
          <QuickAction
            label="Carica"
            sub="GPX"
            iconPath="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3"
            onClick={() => onNavigate?.("io.registra")}
          />
        </div>
      </section>

      {/* Saved routes carousel */}
      <section className="flex min-h-0 flex-1 flex-col px-4 pb-3">
        <div className="mb-2 flex shrink-0 items-baseline justify-between">
          <p className="font-display text-base font-medium">
            I miei percorsi salvati
          </p>
          <button
            type="button"
            onClick={() => onNavigate?.("io.mappa")}
            className="font-mono text-[10px] uppercase tracking-widest text-ink-dim hover:text-ember"
          >
            tutti →
          </button>
        </div>
        {saved.length > 0 ? (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-hide">
            {saved.slice(0, 5).map((r) => (
              <SavedRouteCard
                key={r.id}
                route={r}
                onClick={() => onNavigate?.("io.mappa")}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-panel/60 p-4 text-center text-xs text-ink-dim">
            Nessun percorso salvato ancora. Esplora il Mondo per salvarne uno.
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Quick action button (square) ─────────────────────────────────────────────

interface QuickActionProps {
  label: string;
  sub: string;
  iconPath: string;
  highlight?: boolean;
  onClick: () => void;
}

function QuickAction({ label, sub, iconPath, highlight, onClick }: QuickActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex aspect-[2/1.1] flex-col justify-between rounded-xl border bg-panel p-3 text-left transition-all active:scale-[0.98]"
      style={{
        borderColor: highlight ? "var(--ember)" : "var(--line)",
        background: highlight ? "rgba(255, 106, 31, 0.06)" : "var(--panel)",
      }}
    >
      <Icon
        d={iconPath}
        size={16}
        className={highlight ? "text-ember" : "text-ink"}
      />
      <div>
        <p className="font-display text-sm font-semibold leading-tight">{label}</p>
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-dim">
          {sub}
        </p>
      </div>
    </button>
  );
}

// ─── Saved route card (horizontal scroll item) ────────────────────────────────

function SavedRouteCard({
  route,
  onClick,
}: {
  route: PublishedRoute;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-[44vw] max-w-[180px] shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-panel text-left transition-colors hover:border-line-soft"
    >
      <div className="relative">
        <MiniMap seed={hashSeed(route.id)} height={70} />
        {route.alsoForCars && (
          <span className="absolute left-1.5 top-1.5 rounded-md bg-bg/80 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-info backdrop-blur-sm">
            Moto · Auto
          </span>
        )}
      </div>
      <Card className="!rounded-none !border-0 !bg-transparent !p-2.5">
        <p className="truncate text-xs font-medium">{route.title}</p>
        <p className="mt-0.5 font-mono text-[10px] tabular-nums text-ink-dim">
          {route.distanceKm} km
          {route.area ? ` · ${route.area}` : ""}
        </p>
      </Card>
    </button>
  );
}

// ─── MiniMap (riusato per ultima uscita / saved routes) ───────────────────────

function MiniMap({ seed, height = 70 }: { seed: number; height?: number }) {
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
      className="block h-full w-full"
      style={{ background: "linear-gradient(180deg, #14110d 0%, #060503 100%)" }}
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
        r={3.5}
        fill="var(--ink)"
        stroke="var(--bg)"
        strokeWidth={1.5}
      />
      <circle
        cx={parseFloat(points[points.length - 1].split(",")[0])}
        cy={parseFloat(points[points.length - 1].split(",")[1])}
        r={3.5}
        fill="var(--ember)"
        stroke="var(--bg)"
        strokeWidth={1.5}
      />
    </svg>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
