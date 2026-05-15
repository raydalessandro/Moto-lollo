"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { MapView } from "@/components/map/MapView";
import { useGeolocation, haversineMeters } from "@/lib/geolocation";
import { useWakeLock } from "@/lib/wake-lock";
import {
  hasRoutingApi,
  encodePolyline,
  geocode,
  getDirections,
  type DirectionsRoute,
} from "@/lib/maps";

export type NavMode =
  | { kind: "tracking"; title?: string }
  | { kind: "navigation"; destination: string }
  | { kind: "cordata"; rideTitle: string; groupName: string; accent: string };

interface NavigationOverlayProps {
  mode: NavMode;
  onClose: () => void;
}

/**
 * Fullscreen tracking/navigation overlay.
 *
 * - Mappa MapLibre GL JS reale (tile da OpenFreeMap, gratis)
 * - Posizione GPS reale via navigator.geolocation
 * - Polyline live registrata mentre guidi
 * - Turn-by-turn da OpenRouteService per kind=navigation (richiede ORS key)
 * - Wake Lock per tenere acceso lo schermo
 *
 * Senza ORS key: tile e GPS funzionano, ma niente turn-by-turn.
 */
export function NavigationOverlay({ mode, onClose }: NavigationOverlayProps) {
  const [paused, setPaused] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [points, setPoints] = useState<Array<{ lat: number; lon: number; t: number }>>(
    [],
  );
  const [destinationCoord, setDestinationCoord] = useState<[number, number] | null>(
    null,
  );
  const [route, setRoute] = useState<DirectionsRoute | null>(null);

  const routingOn = hasRoutingApi();

  // Wake lock: attivo quando overlay è aperto e non in pausa.
  useWakeLock(!paused);

  // GPS: attivo quando overlay aperto e non in pausa.
  const geo = useGeolocation(!paused);

  // Time tick (always running unless paused).
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [paused]);

  // Append GPS points (with simple accuracy + dedup filter).
  useEffect(() => {
    if (!geo.position) return;
    const p = geo.position;
    if (p.accuracy > 50) return; // skip noisy fix
    setPoints((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.lat === p.lat && last.lon === p.lon) return prev;
      // Skip if too close (< 5m, GPS noise on standstill).
      if (last && haversineMeters(last, { lat: p.lat, lon: p.lon }) < 5) return prev;
      return [...prev, { lat: p.lat, lon: p.lon, t: p.t }];
    });
  }, [geo.position]);

  // Geocode + directions for "navigation" mode at first GPS fix.
  useEffect(() => {
    if (mode.kind !== "navigation" || !routingOn) return;
    let cancelled = false;
    (async () => {
      try {
        const proximity: [number, number] | undefined = geo.position
          ? [geo.position.lon, geo.position.lat]
          : undefined;
        const results = await geocode(mode.destination, { proximity, limit: 1 });
        if (cancelled || results.length === 0) return;
        const dest = results[0].center;
        setDestinationCoord(dest);

        if (geo.position) {
          const r = await getDirections({
            origin: [geo.position.lon, geo.position.lat],
            destination: dest,
          });
          if (!cancelled && r) setRoute(r);
        }
      } catch (e) {
        console.warn("Geocode/Directions failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, routingOn, geo.position?.lat, geo.position?.lon]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived stats from real GPS points.
  const distanceKm = useMemo(() => {
    if (points.length < 2) return 0;
    let m = 0;
    for (let i = 1; i < points.length; i++) {
      m += haversineMeters(points[i - 1], points[i]);
    }
    return m / 1000;
  }, [points]);

  const speedKmh = useMemo(() => {
    if (geo.position?.speed != null && geo.position.speed >= 0) {
      return geo.position.speed * 3.6;
    }
    return 0;
  }, [geo.position]);

  const livePolyline = useMemo(
    () => encodePolyline(points.map((p) => [p.lon, p.lat])),
    [points],
  );

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

  // Next maneuver: prima istruzione del route. TODO: avanzare lo step
  // man mano che la posizione si avvicina al successivo punto-svolta.
  const nextStep = mode.kind === "navigation" ? route?.steps[0] : undefined;

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
              {geo.status === "watching" && " · GPS"}
              {geo.status === "denied" && " · GPS denied"}
              {geo.status === "requesting" && " · GPS…"}
            </span>
          </div>
          <span className="font-display text-[13px] font-semibold">{title}</span>
        </div>
        <span className="w-9" />
      </header>

      {/* Map area (Mapbox real or SVG fallback) */}
      <div className="relative h-full flex-1 overflow-hidden">
        <MapView
          userLocation={
            geo.position
              ? {
                  lat: geo.position.lat,
                  lon: geo.position.lon,
                  heading: geo.position.heading,
                }
              : undefined
          }
          routePolyline={route?.polyline}
          livePolyline={livePolyline || undefined}
          destination={destinationCoord ?? undefined}
          fallback={<MapBackdropFallback accent={accent} mode={mode} />}
        >
          <NextManeuverBanner step={nextStep} accent={accent} />
          <SpeedBubble speed={speedKmh} accent={accent} />
          {geo.status === "denied" && (
            <div className="absolute left-3 right-3 top-3 rounded-xl border border-danger/40 bg-bg/90 px-3 py-2 text-center text-[11px] text-danger backdrop-blur-sm">
              Permesso GPS negato. Riattivalo dalle impostazioni del browser.
            </div>
          )}
        </MapView>
      </div>

      {/* HUD */}
      <div className="shrink-0 border-t border-line bg-bg">
        <div className="grid grid-cols-3 border-b border-line">
          {[
            {
              label: subtitle,
              value: distanceKm.toFixed(1),
              unit: "km",
              color: accent,
            },
            {
              label: "tempo",
              value: `${elapsedH > 0 ? elapsedH + "h " : ""}${String(elapsedM).padStart(2, "0")}:${String(elapsedS).padStart(2, "0")}`,
              unit: "",
            },
            {
              label: "media",
              value:
                distanceKm > 0 && elapsedSec > 0
                  ? (distanceKm / (elapsedSec / 3600)).toFixed(0)
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

// ─── Visual fallback (when token mancante) ──────────────────────────────────

function MapBackdropFallback({ accent, mode }: { accent: string; mode: NavMode }) {
  return (
    <svg
      viewBox="0 0 360 600"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      style={{ background: "radial-gradient(circle at 50% 70%, #14110d 0%, #050403 70%)" }}
    >
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
      <path
        d="M180 420 Q 220 320 200 240 Q 180 160 240 100 Q 280 60 300 30"
        fill="none"
        stroke={accent}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      {mode.kind === "navigation" && (
        <g transform="translate(300, 30)">
          <circle r={7} fill={accent} stroke="var(--bg)" strokeWidth={3} />
          <circle r={14} fill="none" stroke={accent} strokeOpacity={0.5} />
        </g>
      )}
    </svg>
  );
}

function NextManeuverBanner({
  step,
  accent,
}: {
  step?: { instruction: string; distanceM: number };
  accent: string;
}) {
  if (!step) return null;
  const km = (step.distanceM / 1000).toFixed(1);
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
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[9px] uppercase tracking-widest text-ink-dim">
          tra {step.distanceM < 1000 ? `${Math.round(step.distanceM)} m` : `${km} km`}
        </div>
        <div className="truncate font-display text-sm font-semibold">
          {step.instruction}
        </div>
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
