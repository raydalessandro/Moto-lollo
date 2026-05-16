/**
 * Map providers helpers — tile rendering (MapLibre + OpenFreeMap),
 * geocoding e directions (OpenRouteService).
 *
 * Provider stack:
 * - **Tiles**: OpenFreeMap (zero signup, unlimited free).
 *   Style URL: https://tiles.openfreemap.org/styles/{liberty|bright|positron}
 *
 * - **Geocoding + Directions**: OpenRouteService (signup gratuito → API key).
 *   Free tier: 1000 geocoding/day, 2000 directions/day.
 *   Quando l'API key non è configurata, le funzioni ritornano fallback vuoti
 *   e i componenti map fallback ai mock SVG.
 *
 * In Fase 1+ (Supabase Edge Functions) le chiamate Geocoding/Directions
 * passeranno da un proxy server-side per nascondere la key e rate-limit
 * per `auth.uid()`.
 */

/** OpenRouteService API key — usato per Geocoding e Directions. */
export const ORS_TOKEN =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_ORS_TOKEN ?? "" : "";

/** Tile style (OpenFreeMap). Default: positron — grigio chiaro, leggibile in
 *  outdoor mobile. Alternative: `liberty` (più colori), `bright` (acceso). */
export const MAP_STYLE_URL =
  "https://tiles.openfreemap.org/styles/positron";

/** True se ORS è configurato. Tile funzionano sempre (free, no token). */
export function hasRoutingApi(): boolean {
  return ORS_TOKEN.length > 0;
}

// ─── Polyline encoder/decoder (Google polyline format, precision 5) ────────

/**
 * Encode una sequenza di punti [lon, lat] in polyline string.
 * Stesso formato di Mapbox / Google / OpenRouteService.
 */
export function encodePolyline(
  points: Array<[number, number]>,
  precision = 5,
): string {
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

/** Decode polyline string → array di [lon, lat]. */
export function decodePolyline(
  encoded: string,
  precision = 5,
): Array<[number, number]> {
  const coords: Array<[number, number]> = [];
  const factor = Math.pow(10, precision);
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b = 0;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push([lng / factor, lat / factor]);
  }
  return coords;
}

// ─── Geocoding (OpenRouteService → Pelias engine) ──────────────────────────

export interface GeocodeResult {
  id: string;
  placeName: string;
  center: [number, number]; // [lon, lat]
}

/**
 * Cerca un toponimo via OpenRouteService geocoding (Pelias engine).
 * Ritorna fino a 5 risultati ordinati per rilevanza.
 *
 * Esempio:
 *   const results = await geocode("Passo del Tonale", { proximity: [10.5, 46.2] });
 */
export async function geocode(
  query: string,
  options: {
    proximity?: [number, number];
    limit?: number;
  } = {},
): Promise<GeocodeResult[]> {
  if (!hasRoutingApi()) return [];
  if (query.trim().length < 2) return [];

  const { proximity, limit = 5 } = options;
  const params = new URLSearchParams({
    api_key: ORS_TOKEN,
    text: query,
    size: String(limit),
    "boundary.country": "IT",
  });
  if (proximity) {
    params.set("focus.point.lon", String(proximity[0]));
    params.set("focus.point.lat", String(proximity[1]));
  }

  const url = `https://api.openrouteservice.org/geocode/search?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = await res.json();

  type Feature = {
    properties: { id: string; label: string };
    geometry: { coordinates: [number, number] };
  };
  return (data.features as Feature[]).map((f) => ({
    id: f.properties.id,
    placeName: f.properties.label,
    center: f.geometry.coordinates,
  }));
}

// ─── Directions (OpenRouteService turn-by-turn) ────────────────────────────

export interface DirectionsStep {
  instruction: string;
  distanceM: number;
  durationS: number;
  /** ORS maneuver type code (0=left, 1=right, 6=straight, 10=arrive, 11=depart, …). */
  type: number;
  /** [startIdx, endIdx] indices into route.coordinates for this step's geometry. */
  wayPoints: [number, number];
  /** Street/road name (può essere vuoto se ORS non lo ha). */
  name?: string;
}

export interface DirectionsRoute {
  /** Polyline encoded (precision 5). */
  polyline: string;
  /** Geometria decodata [lon, lat] per proximity matching. */
  coordinates: Array<[number, number]>;
  distanceM: number;
  durationS: number;
  steps: DirectionsStep[];
}

/**
 * Calcola il route fra due punti. Profile "driving-car" (più adatto a moto
 * tra quelli supportati da ORS; non esiste profilo moto dedicato).
 */
export async function getDirections(opts: {
  origin: [number, number];
  destination: [number, number];
  profile?: "driving-car" | "cycling-regular";
}): Promise<DirectionsRoute | null> {
  if (!hasRoutingApi()) return null;
  const { origin, destination, profile = "driving-car" } = opts;

  const url = `https://api.openrouteservice.org/v2/directions/${profile}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: ORS_TOKEN,
      "Content-Type": "application/json",
      Accept: "application/json, application/geo+json",
    },
    body: JSON.stringify({
      coordinates: [origin, destination],
      language: "it",
      instructions: true,
      geometry: true,
      geometry_simplify: false,
    }),
  });
  if (!res.ok) throw new Error(`Directions failed: ${res.status}`);
  const data = await res.json();

  // ORS standard response: routes[0].geometry (polyline encoded), summary, segments[0].steps
  type ORSStep = {
    instruction: string;
    distance: number;
    duration: number;
    type: number;
    way_points: [number, number];
    name?: string;
  };
  type ORSRoute = {
    geometry: string;
    summary: { distance: number; duration: number };
    segments: Array<{ steps: ORSStep[] }>;
  };

  const r: ORSRoute | undefined = data.routes?.[0];
  if (!r) return null;

  return {
    polyline: r.geometry,
    coordinates: decodePolyline(r.geometry),
    distanceM: r.summary.distance,
    durationS: r.summary.duration,
    steps: (r.segments[0]?.steps ?? []).map((s) => ({
      instruction: s.instruction,
      distanceM: s.distance,
      durationS: s.duration,
      type: s.type,
      wayPoints: s.way_points,
      name: s.name,
    })),
  };
}
