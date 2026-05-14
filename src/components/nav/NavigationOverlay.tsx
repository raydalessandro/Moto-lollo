"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

export type NavMode =
  | { kind: "tracking"; title?: string }
  | { kind: "navigation"; destination: string }
  | { kind: "cordata"; rideTitle: string; groupName: string; accent: string };

interface NavigationOverlayProps {
  mode: NavMode;
  onClose: () => void;
}

/**
 * Fullscreen navigation/tracking overlay. Mock only — there is no Mapbox
 * token yet. Simulates a live ride with a 1-second tick that grows km,
 * speed and elapsed time. Real Mapbox + GPS land when wiring Supabase.
 */
export function NavigationOverlay({ mode, onClose }: NavigationOverlayProps) {
  const [paused, setPaused] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [km, setKm] = useState(0);
  const [speed, setSpeed] = useState(42);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setElapsedSec((s) => s + 1);
      setKm((k) => k + Math.max(0, speed / 3600));
      // Speed wanders a bit between 30 and 95.
      setSpeed((v) => {
        const next = v + (Math.random() - 0.5) * 6;
        return Math.max(28, Math.min(95, next));
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused, speed]);

  const accent = mode.kind === "cordata" ? mode.accent : "var(--ember)";
  const elapsedH = Math.floor(elapsedSec / 3600);
  const elapsedM = Math.floor((elapsedSec % 3600) / 60);
  const elapsedS = elapsedSec % 60;

  const title =
    mode.kind === "tracking"
      ? mode.title ?? "Registrazione GPS"
      : mode.kind === "navigation"
        ? `Verso ${mode.destination}`
        : `Cordata · ${mode.groupName}`;

  const subtitle =
    mode.kind === "tracking"
      ? "Traccia in corso"
      : mode.kind === "navigation"
        ? "Turn-by-turn"
        : mode.rideTitle;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-bg">
      {/* Live status header */}
      <header
        className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3"
        style={{ background: "rgba(5,4,3,0.85)", backdropFilter: "blur(8px)" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Esci"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:text-ink"
        >
          <Icon d="M18 6L6 18 M6 6l12 12" size={14} />
        </button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span
              className="live-pulse-dot inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: accent }}
            />
            <span
              className="font-mono text-[9px] uppercase tracking-[0.3em]"
              style={{ color: accent }}
            >
              {mode.kind.toUpperCase()}
            </span>
          </div>
          <span className="font-display text-[13px] font-semibold">{title}</span>
        </div>
        <span className="w-9" />
      </header>

      {/* Mock map area */}
      <div className="relative flex-1 overflow-hidden">
        <MapBackdrop accent={accent} />
        <NextManeuverBanner mode={mode} accent={accent} />
        <SpeedBubble speed={speed} accent={accent} />
      </div>

      {/* HUD */}
      <div className="shrink-0 border-t border-line bg-bg">
        <div className="grid grid-cols-3 border-b border-line">
          {[
            { label: subtitle, value: km.toFixed(1), unit: "km", color: accent },
            {
              label: "tempo",
              value: `${elapsedH > 0 ? elapsedH + "h " : ""}${String(elapsedM).padStart(2, "0")}:${String(elapsedS).padStart(2, "0")}`,
              unit: "",
            },
            {
              label: "media",
              value: km > 0 && elapsedSec > 0
                ? ((km / (elapsedSec / 3600))).toFixed(0)
                : "0",
              unit: "km/h",
            },
          ].map((h, i) => (
            <div
              key={i}
              className="px-4 py-3"
              style={{ borderLeft: i > 0 ? "1px solid var(--line)" : undefined }}
            >
              <div className="font-mono text-[9px] uppercase tracking-widest text-ink-dim">
                {h.label}
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  className="font-display text-2xl font-medium tabular-nums leading-none tracking-tight"
                  style={h.color ? { color: h.color } : undefined}
                >
                  {h.value}
                </span>
                {h.unit && (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-dim">
                    {h.unit}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setPaused((v) => !v)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-panel px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-ink-soft transition-colors hover:border-line-soft"
          >
            <Icon
              d={paused ? "M6 3l14 9-14 9z" : "M6 4h4v16H6z M14 4h4v16h-4z"}
              size={14}
            />
            {paused ? "Riprendi" : "Pausa"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 font-mono text-[11px] uppercase tracking-wider"
            style={{
              borderColor: "var(--danger)",
              background: "rgba(209,58,58,0.08)",
              color: "var(--danger)",
            }}
          >
            <Icon d="M5 5h14v14H5z" size={12} />
            Stop &amp; salva
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Visual mock pieces ─────────────────────────────────────────────────────

function MapBackdrop({ accent }: { accent: string }) {
  // Procedural "map": dark background with topographic contour lines and an
  // ember route. Same vibe as the prototype's MiniMap, scaled fullscreen.
  return (
    <svg
      viewBox="0 0 360 600"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      style={{ background: "radial-gradient(circle at 50% 70%, #14110d 0%, #050403 70%)" }}
    >
      {/* topo contours */}
      <g stroke="rgba(255,255,255,0.04)" strokeWidth={1} fill="none">
        {Array.from({ length: 8 }).map((_, i) => {
          const y = 30 + i * 70;
          return (
            <path
              key={i}
              d={`M-20 ${y} Q 90 ${y - 30} 180 ${y} T 380 ${y - 10}`}
            />
          );
        })}
      </g>
      {/* dotted compass center */}
      <circle
        cx={180}
        cy={420}
        r={32}
        fill="none"
        stroke={accent}
        strokeOpacity={0.4}
        strokeDasharray="4 6"
      />
      <circle cx={180} cy={420} r={6} fill={accent} stroke="var(--bg)" strokeWidth={3} />
      {/* route path */}
      <path
        d="M180 420 Q 220 320 200 240 Q 180 160 240 100 Q 280 60 300 30"
        fill="none"
        stroke={accent}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      <path
        d="M180 420 Q 220 320 200 240 Q 180 160 240 100 Q 280 60 300 30"
        fill="none"
        stroke={accent}
        strokeWidth={10}
        strokeLinecap="round"
        opacity={0.18}
      />
      {/* destination flag */}
      <g transform="translate(300, 30)">
        <circle r={7} fill={accent} stroke="var(--bg)" strokeWidth={3} />
        <circle r={14} fill="none" stroke={accent} strokeOpacity={0.5} />
      </g>
    </svg>
  );
}

function NextManeuverBanner({ mode, accent }: { mode: NavMode; accent: string }) {
  if (mode.kind !== "navigation") return null;
  return (
    <div
      className="absolute left-3 right-3 top-3 flex items-center gap-3 rounded-xl border px-3 py-3"
      style={{
        background: "rgba(5,4,3,0.85)",
        backdropFilter: "blur(8px)",
        borderColor: `${accent}55`,
        boxShadow: `0 12px 32px rgba(0,0,0,0.5)`,
      }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${accent}20`, color: accent }}
      >
        <Icon d="M3 12h13 M13 6l6 6-6 6" size={20} />
      </div>
      <div className="flex-1">
        <div className="font-mono text-[9px] uppercase tracking-widest text-ink-dim">
          tra 800 m
        </div>
        <div className="font-display text-sm font-semibold">
          Svolta a destra · SP668
        </div>
      </div>
      <div
        className="font-display text-lg font-medium tabular-nums"
        style={{ color: accent }}
      >
        0.8
        <span className="ml-0.5 font-mono text-[9px] uppercase tracking-widest text-ink-dim">
          km
        </span>
      </div>
    </div>
  );
}

function SpeedBubble({ speed, accent }: { speed: number; accent: string }) {
  return (
    <div
      className="absolute bottom-3 right-3 flex h-16 w-16 flex-col items-center justify-center rounded-full border"
      style={{
        background: "rgba(5,4,3,0.85)",
        backdropFilter: "blur(8px)",
        borderColor: `${accent}55`,
      }}
    >
      <span
        className="font-display text-xl font-semibold leading-none tabular-nums"
        style={{ color: accent }}
      >
        {Math.round(speed)}
      </span>
      <span className="font-mono text-[8px] uppercase tracking-widest text-ink-dim">
        km/h
      </span>
    </div>
  );
}
