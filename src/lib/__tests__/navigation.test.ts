import { describe, it, expect, vi, afterEach } from "vitest";
import {
  computeNavProgress,
  maneuverIconPath,
  formatDistance,
  formatDuration,
  formatEta,
  OFF_ROUTE_THRESHOLD_M,
} from "../navigation";
import type { DirectionsRoute } from "../maps";

/**
 * Costruisce un route sintetico: 5 punti lungo un meridiano (longitudine
 * costante 9.0E), spaziati di ~278m ciascuno (Δlat 0.0025°). Due step
 * coprono [0,2] e [2,4].
 *
 * Reali distanze in metri (lat 45N, R=6371000):
 *   Δlat 0.0025° = 0.0025 * π/180 * 6371000 ≈ 277.95m
 *   Step 0: 2 * 277.95 ≈ 555.9m
 *   Step 1: 2 * 277.95 ≈ 555.9m
 *   Totale ≈ 1111.8m
 */
function makeStraightRoute(): DirectionsRoute {
  const coords: Array<[number, number]> = [
    [9.0, 45.0],
    [9.0, 45.0025],
    [9.0, 45.005],
    [9.0, 45.0075],
    [9.0, 45.01],
  ];
  return {
    polyline: "",
    coordinates: coords,
    distanceM: 1111.8,
    durationS: 60,
    steps: [
      {
        instruction: "Vai dritto verso nord",
        distanceM: 555.9,
        durationS: 30,
        type: 6,
        wayPoints: [0, 2],
      },
      {
        instruction: "Continua dritto",
        distanceM: 555.9,
        durationS: 30,
        type: 11,
        wayPoints: [2, 4],
      },
    ],
  };
}

describe("computeNavProgress", () => {
  it("ritorna zeri quando steps è vuoto", () => {
    const route: DirectionsRoute = {
      polyline: "",
      coordinates: [],
      distanceM: 0,
      durationS: 0,
      steps: [],
    };
    const p = computeNavProgress(route, { lat: 0, lon: 0 });
    expect(p.currentStepIndex).toBe(0);
    expect(p.metersToManeuver).toBe(0);
    expect(p.remainingDistanceM).toBe(0);
    expect(p.isOffRoute).toBe(false);
  });

  it("posizione a inizio route → step 0, distanza ~555m al next maneuver", () => {
    const route = makeStraightRoute();
    const p = computeNavProgress(route, { lat: 45.0, lon: 9.0 });
    expect(p.currentStepIndex).toBe(0);
    // Step 0 va da coords[0] a coords[2] = ~555m. L'utente è all'inizio.
    expect(p.metersToManeuver).toBeGreaterThan(540);
    expect(p.metersToManeuver).toBeLessThan(570);
    expect(p.distanceFromRoute).toBeLessThan(5);
    expect(p.isOffRoute).toBe(false);
  });

  it("posizione metà step 0 → metersToManeuver dimezzato", () => {
    const route = makeStraightRoute();
    const p = computeNavProgress(route, { lat: 45.00125, lon: 9.0 });
    expect(p.currentStepIndex).toBe(0);
    // Step 0 lungo 555m, posizione a 1/4 lat dalla fine → ~138m residui dal
    // primo segmento + 278m del secondo segmento = ~416m residui.
    // Ma haversine + lat 45.00125 = a metà del PRIMO segmento.
    // Quindi residuo step 0 = 0.5*278 + 278 = 417m circa.
    expect(p.metersToManeuver).toBeGreaterThan(400);
    expect(p.metersToManeuver).toBeLessThan(440);
  });

  it("posizione a fine route → step 1, metersToManeuver ~0", () => {
    const route = makeStraightRoute();
    const p = computeNavProgress(route, { lat: 45.01, lon: 9.0 }, 1);
    expect(p.currentStepIndex).toBe(1);
    expect(p.metersToManeuver).toBeLessThan(10);
    expect(p.remainingDistanceM).toBeLessThan(20);
  });

  it("posizione lontana dal route → isOffRoute=true, distanceFromRoute > soglia", () => {
    const route = makeStraightRoute();
    // 200m est di coords[2] (rough: 0.0026° lon a lat 45 ≈ 200m)
    const p = computeNavProgress(route, { lat: 45.005, lon: 9.0026 });
    expect(p.isOffRoute).toBe(true);
    expect(p.distanceFromRoute).toBeGreaterThan(OFF_ROUTE_THRESHOLD_M);
  });

  it("posizione vicina al route → isOffRoute=false", () => {
    const route = makeStraightRoute();
    // ~30m est di coords[2] (0.0004° lon)
    const p = computeNavProgress(route, { lat: 45.005, lon: 9.0004 });
    expect(p.isOffRoute).toBe(false);
    expect(p.distanceFromRoute).toBeLessThan(OFF_ROUTE_THRESHOLD_M);
  });

  it("lookback: prevStepIdx=1 con user su step 0 → torna a 0 (jitter GPS)", () => {
    const route = makeStraightRoute();
    // Posizione metà step 0
    const p = computeNavProgress(route, { lat: 45.00125, lon: 9.0 }, 1);
    expect(p.currentStepIndex).toBe(0);
  });

  it("no-jump-forward: prev=0 con user su step lontano → resta in window", () => {
    // Costruisco un route con 5 step, user su step 4.
    const coords: Array<[number, number]> = [
      [9.0, 45.0],
      [9.0, 45.001],
      [9.0, 45.002],
      [9.0, 45.003],
      [9.0, 45.004],
      [9.0, 45.005],
    ];
    const mkStep = (s: number, e: number) => ({
      instruction: `step ${s}`,
      distanceM: 100,
      durationS: 10,
      type: 6,
      wayPoints: [s, e] as [number, number],
    });
    const route: DirectionsRoute = {
      polyline: "",
      coordinates: coords,
      distanceM: 500,
      durationS: 50,
      steps: [mkStep(0, 1), mkStep(1, 2), mkStep(2, 3), mkStep(3, 4), mkStep(4, 5)],
    };
    // User su coords[5] (fine step 4) ma prev=0 → window [0..3], cap a step 3.
    const p = computeNavProgress(route, { lat: 45.005, lon: 9.0 }, 0);
    expect(p.currentStepIndex).toBeLessThanOrEqual(3);
  });

  it("remainingDistanceM = step corrente residuo + step seguenti", () => {
    const route = makeStraightRoute();
    // Inizio del route
    const p = computeNavProgress(route, { lat: 45.0, lon: 9.0 });
    // ~555 + 555 = 1110, con un po' di tolleranza per haversine
    expect(p.remainingDistanceM).toBeGreaterThan(1080);
    expect(p.remainingDistanceM).toBeLessThan(1140);
  });

  it("remainingDurationS proporzionale a remainingDistanceM", () => {
    const route = makeStraightRoute();
    const pStart = computeNavProgress(route, { lat: 45.0, lon: 9.0 });
    const pMid = computeNavProgress(route, { lat: 45.005, lon: 9.0 }, 0);
    // A metà route, durata residua dovrebbe essere ~metà
    expect(pMid.remainingDurationS).toBeLessThan(pStart.remainingDurationS);
    expect(pMid.remainingDurationS).toBeGreaterThan(20);
    expect(pMid.remainingDurationS).toBeLessThan(40);
  });

  it("step con wayPoints[start,start] (zero-length) viene saltato", () => {
    const coords: Array<[number, number]> = [
      [9.0, 45.0],
      [9.0, 45.001],
      [9.0, 45.002],
    ];
    const route: DirectionsRoute = {
      polyline: "",
      coordinates: coords,
      distanceM: 222,
      durationS: 20,
      steps: [
        // depart con wayPoints uguali → skip
        { instruction: "Parti", distanceM: 0, durationS: 0, type: 11, wayPoints: [0, 0] },
        { instruction: "Vai", distanceM: 222, durationS: 20, type: 6, wayPoints: [0, 2] },
      ],
    };
    const p = computeNavProgress(route, { lat: 45.0, lon: 9.0 });
    // L'algoritmo dovrebbe scegliere lo step 1 (l'unico con geometria valida)
    expect(p.currentStepIndex).toBe(1);
  });
});

describe("formatDistance", () => {
  it("metri arrotondati a 10 sotto 1km", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(7)).toBe("10 m");
    expect(formatDistance(123)).toBe("120 m");
    expect(formatDistance(157)).toBe("160 m");
    expect(formatDistance(999)).toBe("1000 m");
  });

  it("km con 1 decimale sotto 10km", () => {
    expect(formatDistance(1000)).toBe("1.0 km");
    expect(formatDistance(1500)).toBe("1.5 km");
    expect(formatDistance(9999)).toBe("10.0 km");
  });

  it("km interi sopra 10km", () => {
    expect(formatDistance(10500)).toBe("11 km");
    expect(formatDistance(25000)).toBe("25 km");
  });
});

describe("formatDuration", () => {
  it("clamp minimo a 1min", () => {
    expect(formatDuration(0)).toBe("1min");
    expect(formatDuration(30)).toBe("1min");
  });

  it("minuti sotto 60min", () => {
    expect(formatDuration(90)).toBe("2min");
    expect(formatDuration(600)).toBe("10min");
    expect(formatDuration(3540)).toBe("59min");
  });

  it("ore + minuti sopra 60min", () => {
    expect(formatDuration(3600)).toBe("1h 0min");
    expect(formatDuration(5400)).toBe("1h 30min");
    expect(formatDuration(7200)).toBe("2h 0min");
    expect(formatDuration(8460)).toBe("2h 21min");
  });
});

describe("formatEta", () => {
  afterEach(() => vi.useRealTimers());

  it("ritorna stringa HH:MM con Date.now() + remainingDurationS", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 16, 14, 30, 0));
    // +30min → 15:00
    expect(formatEta(1800)).toBe("15:00");
    // +2h 15min → 16:45
    expect(formatEta(8100)).toBe("16:45");
    // +0 → 14:30
    expect(formatEta(0)).toBe("14:30");
  });

  it("pad zero su minuti < 10", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 16, 9, 5, 0));
    expect(formatEta(0)).toBe("09:05");
  });
});

describe("maneuverIconPath", () => {
  it("ritorna path non vuoto per tipi noti", () => {
    const knownTypes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    for (const t of knownTypes) {
      const path = maneuverIconPath(t);
      expect(path).toBeTruthy();
      expect(path.length).toBeGreaterThan(5);
    }
  });

  it("ritorna fallback per tipo sconosciuto", () => {
    const unknown = maneuverIconPath(999);
    const right = maneuverIconPath(1);
    expect(unknown).toBe(right);
  });

  it("left e right hanno path diversi", () => {
    expect(maneuverIconPath(0)).not.toBe(maneuverIconPath(1));
  });
});
