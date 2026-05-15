"use client";

import { isMapboxConfigured, buildStaticImageUrl } from "@/lib/mapbox";

interface StaticMapProps {
  /** Seed numerico per il fallback SVG procedurale. */
  seed: number;
  /** Mapbox polyline encoded, se disponibile (da Directions o Activity.trackPoints). */
  polyline?: string;
  /** Pixel target. */
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Mini-mappa per card archivio / feed. Usa Mapbox Static Images se
 * `NEXT_PUBLIC_MAPBOX_TOKEN` è configurato, altrimenti fallback SVG
 * procedurale (compatibile col vecchio mock).
 *
 * Static Images API costa 1 "static map request" per ogni img caricata
 * (free tier 50k/mese). Le card sono leggere → ok per scaling iniziale.
 */
export function StaticMap({
  seed,
  polyline,
  width = 320,
  height = 60,
  className = "",
}: StaticMapProps) {
  const configured = isMapboxConfigured();
  const url =
    configured && polyline ? buildStaticImageUrl({ polyline, width, height }) : "";

  if (configured && url) {
    return (
      <img
        src={url}
        width={width}
        height={height}
        alt=""
        className={`block h-full w-full object-cover ${className}`}
        style={{ background: "#060503" }}
        loading="lazy"
      />
    );
  }

  // Fallback: SVG polyline procedurale dal seed (com'era prima).
  return <FallbackSvgMap seed={seed} height={height} className={className} />;
}

// ─── Fallback procedurale (uguale ai mock attuali) ──────────────────────────

function FallbackSvgMap({
  seed,
  height,
  className,
}: {
  seed: number;
  height: number;
  className: string;
}) {
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
      className={`block h-full w-full ${className}`}
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
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={parseFloat(points[0].split(",")[0])}
        cy={parseFloat(points[0].split(",")[1])}
        r={3}
        fill="var(--ink)"
        stroke="var(--bg)"
        strokeWidth={1.5}
      />
      <circle
        cx={parseFloat(points[points.length - 1].split(",")[0])}
        cy={parseFloat(points[points.length - 1].split(",")[1])}
        r={3}
        fill="var(--ember)"
        stroke="var(--bg)"
        strokeWidth={1.5}
      />
    </svg>
  );
}
