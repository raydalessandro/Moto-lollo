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
  type GeocodeResult,
} from "@/lib/maps";

export type NavMode =
  | { kind: "tracking"; title?: string }
  | { kind: "navigation" }
  | { kind: "cordata"; rideTitle: string; groupName: string; accent: string };

type NavPhase = "search" | "preview" | "navigating";

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
  const [route, setRoute] = useState<DirectionsRoute | null>(null);

  // Navigation flow state (search → preview → navigating).
  const [navPhase, setNavPhase] = useState<NavPhase>(
    mode.kind === "navigation" ? "search" : "navigating",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [chosenDestination, setChosenDestination] = useState<{
    center: [number, number];
    placeName: string;
  } | null>(null);
  const [routeStatus, setRouteStatus] = useState<"idle" | "loading" | "error">("idle");

  const routingOn = hasRoutingApi();

  // Wake lock: attivo quando overlay è aperto e in navigazione (non in search/preview).
  useWakeLock(!paused && navPhase === "navigating");

  // GPS: sempre attivo finché overlay aperto e non in pausa (anche in search
  // per centrare la mappa di anteprima e per fare proximity-aware geocoding).
  const geo = useGeolocation(!paused);

  // Time tick: solo durante navigazione attiva.
  useEffect(() => {
    if (paused || navPhase !== "navigating") return;
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [paused, navPhase]);

  // Append GPS points solo durante navigazione attiva (no traccia in search/preview).
  useEffect(() => {
    if (!geo.position || navPhase !== "navigating") return;
    const p = geo.position;
    if (p.accuracy > 30) return; // skip noisy fix (was 50, too loose)
    setPoints((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.lat === p.lat && last.lon === p.lon) return prev;
      // Skip if too close (< 10m). GPS in città può saltellare 5-8m da fermo.
      if (last && haversineMeters(last, { lat: p.lat, lon: p.lon }) < 10) return prev;
      return [...prev, { lat: p.lat, lon: p.lon, t: p.t }];
    });
  }, [geo.position, navPhase]);

  // Debounced geocoding while typing in search.
  useEffect(() => {
    if (mode.kind !== "navigation" || navPhase !== "search") return;
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSearchResults([]);
      setSearchStatus("idle");
      return;
    }
    if (!routingOn) {
      setSearchStatus("error");
      return;
    }
    let cancelled = false;
    setSearchStatus("loading");
    const t = setTimeout(async () => {
      try {
        const proximity: [number, number] | undefined = geo.position
          ? [geo.position.lon, geo.position.lat]
          : undefined;
        const r = await geocode(q, { proximity, limit: 5 });
        if (cancelled) return;
        setSearchResults(r);
        setSearchStatus(r.length === 0 ? "error" : "idle");
      } catch (e) {
        if (cancelled) return;
        console.warn("Geocode failed:", e);
        setSearchStatus("error");
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQuery, navPhase, mode.kind, routingOn, geo.position?.lat, geo.position?.lon]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch directions when a destination is chosen → enter preview.
  useEffect(() => {
    if (!chosenDestination || !routingOn) return;
    if (!geo.position) return; // wait for first GPS fix
    let cancelled = false;
    setRouteStatus("loading");
    (async () => {
      try {
        const r = await getDirections({
          origin: [geo.position!.lon, geo.position!.lat],
          destination: chosenDestination.center,
        });
        if (cancelled) return;
        if (r) {
          setRoute(r);
          setRouteStatus("idle");
          setNavPhase("preview");
        } else {
          setRouteStatus("error");
        }
      } catch (e) {
        if (cancelled) return;
        console.warn("Directions failed:", e);
        setRouteStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chosenDestination, routingOn]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const kmh = geo.position.speed * 3.6;
      // Filtro GPS noise: sotto 2 km/h è praticamente fermo (rumore del fix).
      return kmh < 2 ? 0 : kmh;
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
        ? navPhase === "search"
          ? "Dove vuoi andare?"
          : chosenDestination?.placeName ?? "Naviga"
        : `Cordata · ${mode.groupName}`;

  const subtitle =
    mode.kind === "tracking"
      ? "Traccia in corso"
      : mode.kind === "navigation"
        ? navPhase === "search"
          ? "Cerca una destinazione"
          : navPhase === "preview"
            ? "Pronto a partire"
            : "Turn-by-turn"
        : mode.rideTitle;

  // Next maneuver: prima istruzione del route. TODO: avanzare lo step
  // man mano che la posizione si avvicina al successivo punto-svolta.
  const nextStep =
    mode.kind === "navigation" && navPhase === "navigating"
      ? route?.steps[0]
      : undefined;

  const phaseLabel =
    mode.kind === "navigation"
      ? navPhase === "search"
        ? "NAVIGA"
        : navPhase === "preview"
          ? "PREVIEW"
          : "NAVIGA"
      : mode.kind.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
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
              {phaseLabel}
              {geo.status === "watching" && " · GPS"}
              {geo.status === "denied" && " · GPS denied"}
              {geo.status === "requesting" && " · GPS…"}
            </span>
          </div>
          <span className="font-display text-[13px] font-semibold">{title}</span>
        </div>
        <span className="w-9" />
      </header>

      {mode.kind === "navigation" && navPhase === "search" ? (
        <DestinationSearchPanel
          query={searchQuery}
          onQueryChange={setSearchQuery}
          results={searchResults}
          status={searchStatus}
          routingOn={routingOn}
          routeStatus={routeStatus}
          onPick={(r) =>
            setChosenDestination({ center: r.center, placeName: r.placeName })
          }
        />
      ) : (
        <>
      {/* Map area (Mapbox real or SVG fallback) */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
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
          destination={chosenDestination?.center ?? undefined}
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

      {mode.kind === "navigation" && navPhase === "preview" && route ? (
        <RoutePreviewCard
          route={route}
          placeName={chosenDestination?.placeName ?? ""}
          accent={accent}
          onStart={() => {
            setElapsedSec(0);
            setPoints([]);
            setNavPhase("navigating");
          }}
          onChange={() => {
            setRoute(null);
            setChosenDestination(null);
            setNavPhase("search");
          }}
        />
      ) : (
      /* HUD */
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
      )}
        </>
      )}
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

// ─── Destination search panel (navPhase === "search") ──────────────────────

function DestinationSearchPanel({
  query,
  onQueryChange,
  results,
  status,
  routingOn,
  routeStatus,
  onPick,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  results: GeocodeResult[];
  status: "idle" | "loading" | "error";
  routingOn: boolean;
  routeStatus: "idle" | "loading" | "error";
  onPick: (r: GeocodeResult) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      <div className="border-b border-line p-4">
        <label className="block">
          <span className="mb-2 block font-mono text-[9px] uppercase tracking-widest text-ink-dim">
            Cerca destinazione
          </span>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2">
            <Icon d="M21 21l-6-6 M4 11a7 7 0 1 0 14 0 7 7 0 0 0-14 0" size={16} />
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Es: Passo del Tonale, Lago di Garda…"
              className="flex-1 bg-transparent font-mono text-sm placeholder:text-ink-mute focus:outline-none"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="text-ink-dim hover:text-ink"
                aria-label="Pulisci"
              >
                <Icon d="M18 6L6 18 M6 6l12 12" size={12} />
              </button>
            )}
          </div>
        </label>
        {!routingOn && (
          <p className="mt-2 font-mono text-[10px] text-danger">
            Token OpenRouteService mancante — geocoding disabilitato.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {routeStatus === "loading" && (
          <div className="flex items-center justify-center gap-2 p-6 font-mono text-[11px] text-ember">
            <span className="live-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-ember" />
            Calcolo percorso…
          </div>
        )}
        {routeStatus === "error" && (
          <div className="m-4 rounded-xl border border-danger/40 bg-bg p-3 font-mono text-[11px] text-danger">
            Errore nel calcolo del percorso. Riprova.
          </div>
        )}
        {routeStatus === "idle" && status === "loading" && (
          <div className="p-4 font-mono text-[11px] text-ink-dim">Cerco…</div>
        )}
        {routeStatus === "idle" && status === "error" && query.trim().length >= 3 && (
          <div className="p-4 font-mono text-[11px] text-ink-dim">
            Nessun risultato per &ldquo;{query}&rdquo;.
          </div>
        )}
        {routeStatus === "idle" && status === "idle" && results.length === 0 && (
          <div className="p-4 font-mono text-[10px] leading-relaxed text-ink-dim">
            Digita almeno 3 caratteri. Cerca paesi, passi, indirizzi, POI.
          </div>
        )}
        {routeStatus === "idle" &&
          results.map((r, i) => (
            <button
              key={`${r.placeName}-${i}`}
              type="button"
              onClick={() => onPick(r)}
              className="flex w-full items-start gap-3 border-b border-line-soft px-4 py-3 text-left transition-colors hover:bg-panel"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-panel text-ember">
                <Icon d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-sm font-medium">
                  {r.placeName}
                </div>
                <div className="mt-0.5 font-mono text-[9px] text-ink-dim">
                  {r.center[1].toFixed(4)}, {r.center[0].toFixed(4)}
                </div>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}

// ─── Route preview card (navPhase === "preview") ────────────────────────────

function RoutePreviewCard({
  route,
  placeName,
  accent,
  onStart,
  onChange,
}: {
  route: DirectionsRoute;
  placeName: string;
  accent: string;
  onStart: () => void;
  onChange: () => void;
}) {
  const km = (route.distanceM / 1000).toFixed(1);
  const min = Math.round(route.durationS / 60);
  const h = Math.floor(min / 60);
  const mm = min % 60;
  const durationLabel = h > 0 ? `${h}h ${mm}min` : `${min}min`;

  return (
    <div className="shrink-0 border-t border-line bg-bg">
      <div className="px-4 py-3">
        <div className="font-mono text-[9px] uppercase tracking-widest text-ink-dim">
          Verso
        </div>
        <div className="truncate font-display text-base font-semibold">
          {placeName}
        </div>
      </div>
      <div className="grid grid-cols-2 border-y border-line">
        <div className="px-4 py-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-ink-dim">
            distanza
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className="font-display text-2xl font-medium tabular-nums leading-none"
              style={{ color: accent }}
            >
              {km}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-dim">
              km
            </span>
          </div>
        </div>
        <div className="border-l border-line px-4 py-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-ink-dim">
            durata stimata
          </div>
          <div className="font-display text-2xl font-medium tabular-nums leading-none">
            {durationLabel}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onChange}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-panel px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-ink-soft transition-colors hover:border-line-soft"
        >
          <Icon d="M21 21l-6-6 M4 11a7 7 0 1 0 14 0 7 7 0 0 0-14 0" size={14} />
          Cambia
        </button>
        <button
          type="button"
          onClick={onStart}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 font-mono text-[11px] uppercase tracking-wider"
          style={{
            borderColor: accent,
            background: `${accent}14`,
            color: accent,
          }}
        >
          <Icon d="M6 3l14 9-14 9z" size={14} />
          Avvia
        </button>
      </div>
    </div>
  );
}
