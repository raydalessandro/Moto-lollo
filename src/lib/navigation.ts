/**
 * Step progression engine per turn-by-turn navigation.
 *
 * Dato un route OpenRouteService (con coordinates decodate + steps con way_points)
 * e la posizione GPS corrente, restituisce:
 *   - currentStepIndex: quale step l'utente sta percorrendo
 *   - metersToManeuver: quanti metri al prossimo punto-svolta
 *   - distanceFromRoute: quanto è lontano dal tracciato (per detect off-route)
 *   - remainingDistanceM / remainingDurationS: stima per ETA + km rimanenti
 *
 * Algoritmo: proximity matching. Per ogni step (in finestra [prev-1, prev+3])
 * calcolo la distanza minima dalla posizione utente al segmento polilineare
 * dello step. Lo step con distanza minima è il "current". L'avanzamento
 * monotono evita salti indietro per jitter GPS, salvo lookback di 1 step.
 */

import type { DirectionsRoute } from "./maps";

export interface NavProgress {
  currentStepIndex: number;
  /** Distanza rimanente (lungo polilinea step) fino al prossimo punto-svolta. */
  metersToManeuver: number;
  /** Distanza perpendicolare dalla polilinea route (per off-route). */
  distanceFromRoute: number;
  /** Distanza totale rimanente all'arrivo (resto step corrente + step seguenti). */
  remainingDistanceM: number;
  /** Durata stimata rimanente all'arrivo (basata su average speed del route). */
  remainingDurationS: number;
  /** True se distanceFromRoute > soglia. Reroute decision si fa fuori (con timer). */
  isOffRoute: boolean;
}

export const OFF_ROUTE_THRESHOLD_M = 50;

interface LatLon {
  lat: number;
  lon: number;
}

/**
 * Distanza in metri (approssimazione equirettangolare locale, sufficiente
 * per segmenti < ~10 km e latitudini non polari). Usata per geometria
 * intra-segmento dove serve velocità, non precisione assoluta.
 */
function meters(a: LatLon, b: LatLon): number {
  const R = 6371000;
  const lat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dx = (b.lon - a.lon) * (Math.PI / 180) * Math.cos(lat) * R;
  const dy = (b.lat - a.lat) * (Math.PI / 180) * R;
  return Math.hypot(dx, dy);
}

/**
 * Proietta il punto P sul segmento AB e restituisce:
 * - distance: distanza P→segmento (perpendicolare se la proiezione cade dentro,
 *   altrimenti distanza dall'estremo più vicino)
 * - t: parametro [0,1] della proiezione lungo AB (clipped)
 * - alongMeters: distanza da A al punto proiettato lungo AB (in metri)
 */
function projectOnSegment(
  p: LatLon,
  a: LatLon,
  b: LatLon,
): { distance: number; t: number; alongMeters: number } {
  const segLen = meters(a, b);
  if (segLen < 0.5) {
    return { distance: meters(p, a), t: 0, alongMeters: 0 };
  }
  // Convert to local equirectangular meters (origin = a) for projection math.
  const lat0 = (a.lat * Math.PI) / 180;
  const cosLat = Math.cos(lat0);
  const ax = 0;
  const ay = 0;
  const bx = (b.lon - a.lon) * (Math.PI / 180) * cosLat * 6371000;
  const by = (b.lat - a.lat) * (Math.PI / 180) * 6371000;
  const px = (p.lon - a.lon) * (Math.PI / 180) * cosLat * 6371000;
  const py = (p.lat - a.lat) * (Math.PI / 180) * 6371000;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;
  const distance = Math.hypot(px - projX, py - projY);
  const alongMeters = t * segLen;
  return { distance, t, alongMeters };
}

/**
 * Per uno step, trova il segmento polilineare più vicino all'utente e
 * restituisce la distanza dalla polilinea + la posizione "along" lungo
 * lo step (in metri dall'inizio dello step).
 */
function projectOnStep(
  position: LatLon,
  coords: Array<[number, number]>,
  startIdx: number,
  endIdx: number,
): { distance: number; alongStepM: number; stepLengthM: number } {
  let bestDist = Infinity;
  let bestAlong = 0;
  let cumulative = 0;

  for (let i = startIdx; i < endIdx; i++) {
    const a: LatLon = { lon: coords[i][0], lat: coords[i][1] };
    const b: LatLon = { lon: coords[i + 1][0], lat: coords[i + 1][1] };
    const segLen = meters(a, b);
    const proj = projectOnSegment(position, a, b);
    if (proj.distance < bestDist) {
      bestDist = proj.distance;
      bestAlong = cumulative + proj.alongMeters;
    }
    cumulative += segLen;
  }

  return { distance: bestDist, alongStepM: bestAlong, stepLengthM: cumulative };
}

/**
 * Calcola lo stato di progressione corrente. `previousStepIndex` consente
 * di evitare salti all'indietro per jitter GPS — accetta lookback di 1 step.
 */
export function computeNavProgress(
  route: DirectionsRoute,
  position: LatLon,
  previousStepIndex: number = 0,
): NavProgress {
  const steps = route.steps;
  if (steps.length === 0) {
    return {
      currentStepIndex: 0,
      metersToManeuver: 0,
      distanceFromRoute: 0,
      remainingDistanceM: 0,
      remainingDurationS: 0,
      isOffRoute: false,
    };
  }

  // Search window: from (prev-1) to (prev+3), clamped to valid range.
  const lo = Math.max(0, previousStepIndex - 1);
  const hi = Math.min(steps.length - 1, previousStepIndex + 3);

  let bestStep = previousStepIndex;
  let bestDist = Infinity;
  let bestAlongStep = 0;
  let bestStepLen = 0;

  for (let i = lo; i <= hi; i++) {
    const [s, e] = steps[i].wayPoints;
    if (e <= s) continue; // edge case: empty step (e.g., depart/arrive)
    const proj = projectOnStep(position, route.coordinates, s, e);
    if (proj.distance < bestDist) {
      bestDist = proj.distance;
      bestStep = i;
      bestAlongStep = proj.alongStepM;
      bestStepLen = proj.stepLengthM;
    }
  }

  // Distance to maneuver (end of current step).
  const metersToManeuver = Math.max(0, bestStepLen - bestAlongStep);

  // Remaining route distance: rest of current step + sum of remaining steps.
  let remainingDistanceM = metersToManeuver;
  for (let i = bestStep + 1; i < steps.length; i++) {
    remainingDistanceM += steps[i].distanceM;
  }

  // Remaining duration: stima lineare basata su rapporto tra remaining e totale.
  const ratio = route.distanceM > 0 ? remainingDistanceM / route.distanceM : 0;
  const remainingDurationS = route.durationS * ratio;

  return {
    currentStepIndex: bestStep,
    metersToManeuver,
    distanceFromRoute: bestDist,
    remainingDistanceM,
    remainingDurationS,
    isOffRoute: bestDist > OFF_ROUTE_THRESHOLD_M,
  };
}

/**
 * Mappa il codice maneuver ORS a un path SVG (24x24 viewBox, stroke-based).
 * I path sono pensati per Icon component (currentColor).
 */
export function maneuverIconPath(type: number): string {
  switch (type) {
    case 0: // turn left
      return "M5 12h13 M11 6l-6 6 6 6";
    case 1: // turn right
      return "M19 12H6 M13 6l6 6-6 6";
    case 2: // sharp left
      return "M19 18 L9 8 M9 8 L9 14 M9 8 L15 8";
    case 3: // sharp right
      return "M5 18 L15 8 M15 8 L15 14 M15 8 L9 8";
    case 4: // slight left
      return "M19 19 L9 9 M9 9 L9 15 M9 9 L15 9";
    case 5: // slight right
      return "M5 19 L15 9 M15 9 L15 15 M15 9 L9 9";
    case 6: // straight
      return "M12 20 L12 4 M12 4 L7 9 M12 4 L17 9";
    case 7: // enter roundabout
    case 8: // exit roundabout
      return "M12 21 L12 14 M12 14 a4 4 0 1 1 4 -4 M16 10 l3 -3 M16 10 l-3 -3";
    case 9: // u-turn
      return "M7 21 L7 9 a5 5 0 0 1 10 0 L17 14 M17 14 l-3 -3 M17 14 l3 -3";
    case 10: // arrive (goal)
      return "M12 2 C8 2 5 5 5 9 c0 5 7 13 7 13 s7-8 7-13 c0-4-3-7-7-7z M12 11 a2 2 0 1 0 0-4 a2 2 0 0 0 0 4z";
    case 11: // depart
      return "M12 4 L12 20 M12 20 L7 15 M12 20 L17 15";
    case 12: // keep left
      return "M19 19 L12 12 L12 4 M12 12 L5 19";
    case 13: // keep right
      return "M5 19 L12 12 L12 4 M12 12 L19 19";
    default:
      return "M19 12H6 M13 6l6 6-6 6";
  }
}

/** Format meters as "120 m" or "1.4 km" (display-friendly). */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

/** Format seconds as "5min" / "1h 23min" (display-friendly). */
export function formatDuration(seconds: number): string {
  const totalMin = Math.max(1, Math.round(seconds / 60));
  if (totalMin < 60) return `${totalMin}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}min`;
}

/** ETA "alle 14:32" basata su Date.now() + remainingDurationS. */
export function formatEta(remainingDurationS: number): string {
  const eta = new Date(Date.now() + remainingDurationS * 1000);
  const h = String(eta.getHours()).padStart(2, "0");
  const m = String(eta.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
