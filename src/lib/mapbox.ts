/**
 * Mapbox helpers — token gestione, geocoding, directions, static images.
 *
 * Tutta l'integrazione Mapbox passa da qui. Componenti UI (`MapView`,
 * `StaticMap`) importano da questo file. Se il token non è configurato,
 * `isMapboxConfigured()` ritorna `false` e i componenti fallback ai mock
 * SVG procedurali.
 *
 * In Fase 1+ con Supabase Edge Functions, le chiamate Directions/Geocoding
 * passeranno da un proxy server-side col secret token (e rate limit per
 * `auth.uid()`). Per ora si usa il public token client-side con URL
 * restriction sul dashboard Mapbox.
 */

export const MAPBOX_TOKEN =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""
    : "";

/** Stile mappa di default — coerente col tema dark dell'app. */
export const MAPBOX_STYLE_DARK = "mapbox://styles/mapbox/dark-v11";

export function isMapboxConfigured(): boolean {
  return MAPBOX_TOKEN.length > 0;
}

// ─── Polyline encoder/decoder (Google polyline format, precision 5) ────────

/**
 * Encode una sequenza di punti [lon, lat] in polyline string (Google
 * polyline algorithm, precision 5). Stesso formato di Mapbox.
 */
export function encodePolyline(points: Array<[number, number]>, precision = 5): string {
  if (points.length === 0) return "";
  const factor = Math.pow(10, precision);
  let prevLat = 0;
  let prevLon = 0;
  let output = "";

  for (const [lon, lat] of points) {
    const intLat = Math.round(lat * factor);
    const intLon = Math.round(lon * factor);
    output += encodeNumber(intLat - prevLat);
    output += encodeNumber(intLon - prevLon);
    prevLat = intLat;
    prevLon = intLon;
  }
  return output;
}

function encodeNumber(num: number): string {
  let n = num < 0 ? ~(num << 1) : num << 1;
  let result = "";
  while (n >= 0x20) {
    result += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
    n >>>= 5;
  }
  result += String.fromCharCode(n + 63);
  return result;
}

// ─── Static Image API (per mini-mappe nelle card) ───────────────────────────

export interface StaticMapOptions {
  /** Punto centrale, [lon, lat]. */
  center?: [number, number];
  /** Zoom 0-22. Default 12. */
  zoom?: number;
  /** Polyline encoded (formato Mapbox). Disegna overlay rosso ember. */
  polyline?: string;
  /** Pixel size della img. Default 320×120 (2x retina è gestito da `@2x`). */
  width?: number;
  height?: number;
  /** Stile. Default dark. */
  style?: string;
}

/**
 * Costruisce URL per Mapbox Static Images API. Da usare in `<img src>`.
 * Vedi docs: https://docs.mapbox.com/api/maps/static-images/
 *
 * Esempio:
 *   const url = buildStaticImageUrl({
 *     polyline: encoded,
 *     width: 320, height: 100
 *   });
 */
export function buildStaticImageUrl(opts: StaticMapOptions): string {
  if (!isMapboxConfigured()) return "";
  const {
    center,
    zoom = 12,
    polyline,
    width = 320,
    height = 120,
    style = "mapbox/dark-v11",
  } = opts;

  // Overlay polyline encoded — formato `path-{strokeWidth}+{color-without-#}({encoded})`.
  let overlay = "";
  if (polyline) {
    const encoded = encodeURIComponent(polyline);
    overlay = `path-3+ff6a1f(${encoded})/`;
  }

  // Center vs auto: se ho polyline e niente center → `auto`.
  const centerPart = center
    ? `${center[0]},${center[1]},${zoom}`
    : overlay
      ? "auto"
      : "10.0,45.5,9"; // fallback centro Italia nord

  return `https://api.mapbox.com/styles/v1/${style}/static/${overlay}${centerPart}/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`;
}

// ─── Geocoding (cerca destinazione → coordinate) ────────────────────────────

export interface GeocodeResult {
  id: string;
  placeName: string;
  center: [number, number]; // [lon, lat]
}

/**
 * Cerca un toponimo. Ritorna fino a 5 risultati ordinati per rilevanza.
 *
 * Esempio:
 *   const results = await geocode("Passo del Tonale", { proximity: [10.5, 46.2] });
 */
export async function geocode(
  query: string,
  options: {
    /** Bias verso un punto (lon, lat). Migliora rilevanza per ricerche locali. */
    proximity?: [number, number];
    /** Lingua. Default 'it'. */
    language?: string;
    /** Massimo risultati. Default 5. */
    limit?: number;
  } = {},
): Promise<GeocodeResult[]> {
  if (!isMapboxConfigured()) return [];
  if (query.trim().length < 2) return [];

  const { proximity, language = "it", limit = 5 } = options;
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    language,
    limit: String(limit),
    types: "place,locality,address,poi",
  });
  if (proximity) params.set("proximity", `${proximity[0]},${proximity[1]}`);

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    query,
  )}.json?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = await res.json();

  type Feature = {
    id: string;
    place_name: string;
    center: [number, number];
  };
  return (data.features as Feature[]).map((f) => ({
    id: f.id,
    placeName: f.place_name,
    center: f.center,
  }));
}

// ─── Directions (turn-by-turn) ──────────────────────────────────────────────

export interface DirectionsStep {
  instruction: string;
  distanceM: number;
  durationS: number;
  maneuverType?: string;
}

export interface DirectionsRoute {
  /** Polyline encoded. */
  polyline: string;
  distanceM: number;
  durationS: number;
  steps: DirectionsStep[];
}

/**
 * Calcola il route fra due punti (per ora simple A→B, no waypoints).
 * Profile "driving" è il più adatto alle moto in Italia (la API non ha
 * un profilo motorcycle dedicato — l'unica alternativa è "driving-traffic").
 *
 * Esempio:
 *   const route = await getDirections({
 *     origin: [10.0, 45.5],
 *     destination: [10.5, 46.2],
 *   });
 */
export async function getDirections(opts: {
  origin: [number, number];
  destination: [number, number];
  profile?: "driving" | "driving-traffic";
}): Promise<DirectionsRoute | null> {
  if (!isMapboxConfigured()) return null;
  const { origin, destination, profile = "driving" } = opts;
  const coords = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    geometries: "polyline",
    overview: "full",
    steps: "true",
    language: "it",
  });
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Directions failed: ${res.status}`);
  const data = await res.json();

  const r = data.routes?.[0];
  if (!r) return null;

  type ManeuverStep = {
    maneuver: { instruction: string; type?: string };
    distance: number;
    duration: number;
  };
  const steps: DirectionsStep[] =
    r.legs?.[0]?.steps?.map((s: ManeuverStep) => ({
      instruction: s.maneuver.instruction,
      distanceM: s.distance,
      durationS: s.duration,
      maneuverType: s.maneuver.type,
    })) ?? [];

  return {
    polyline: r.geometry,
    distanceM: r.distance,
    durationS: r.duration,
    steps,
  };
}
