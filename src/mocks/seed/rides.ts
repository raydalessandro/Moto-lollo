import type {
  Activity,
  ActivityMedia,
  PlannedRoute,
  UUID,
  Visibility,
} from "@/types/domain";
import { addDays, addHours, makeRng } from "../rng";
import { NOW } from "./people";

interface ActivitySeed {
  id: UUID;
  ownerId: UUID;
  motorcycleId: UUID;
  daysAgo: number;
  startHour: number;
  durationMin: number;
  distanceKm: number;
  elevationGainM?: number;
  title: string;
  notes?: string;
  tags: string[];
  visibility: Visibility;
  groupRideId?: UUID;
  mediaCount?: number;
}

const ACTS: ActivitySeed[] = [
  // Ray — preserviamo a1/a2/a3 esatti
  { id: "a1",  ownerId: "u0", motorcycleId: "m1", daysAgo: 3,  startHour: 7,  durationMin: 267, distanceKm: 187.4, elevationGainM: 2140, title: "Passo del Tonale, sunrise",   notes: "Gruppo Garda. Strade pulite, caffè a Edolo.", tags: ["alpi","sunrise","passi"], visibility: "followers", mediaCount: 3 },
  { id: "a2",  ownerId: "u0", motorcycleId: "m1", daysAgo: 10, startHour: 9,  durationMin: 185, distanceKm: 132.0, elevationGainM: 1620, title: "Giro del Tremalzo",            tags: ["garda","off"],                 visibility: "private",                                mediaCount: 2 },
  { id: "a3",  ownerId: "u0", motorcycleId: "m2", daysAgo: 17, startHour: 14, durationMin: 170, distanceKm:  96.3, elevationGainM:  890, title: "Notturna dei laghi",          tags: ["urban","night"],               visibility: "public",                                 mediaCount: 3 },
  // Ray — altre 18
  { id: "a4",  ownerId: "u0", motorcycleId: "m1", daysAgo: 24, startHour: 7,  durationMin: 240, distanceKm: 168.2, elevationGainM: 1950, title: "Gardena e Sella",              tags: ["dolomiti","passi"],            visibility: "followers", mediaCount: 3 },
  { id: "a5",  ownerId: "u0", motorcycleId: "m1", daysAgo: 31, startHour: 8,  durationMin: 310, distanceKm: 215.0, elevationGainM: 2380, title: "Stelvio + Gavia",              tags: ["alpi","passi","epic"],         visibility: "public",    mediaCount: 4 },
  { id: "a6",  ownerId: "u0", motorcycleId: "m1", daysAgo: 38, startHour: 18, durationMin:  62, distanceKm:  34.1, elevationGainM:  180, title: "Ritorno dal lavoro",            tags: ["commute"],                     visibility: "private"    },
  { id: "a7",  ownerId: "u0", motorcycleId: "m2", daysAgo: 45, startHour: 6,  durationMin: 390, distanceKm: 258.4, elevationGainM: 2720, title: "Dolomiti tour, giornata piena", tags: ["dolomiti","tour"],             visibility: "followers", mediaCount: 3 },
  { id: "a8",  ownerId: "u0", motorcycleId: "m1", daysAgo: 52, startHour: 7,  durationMin: 285, distanceKm: 198.7, elevationGainM: 2010, title: "Passo del Mortirolo",          tags: ["alpi","passi"],                visibility: "followers", mediaCount: 2 },
  { id: "a9",  ownerId: "u0", motorcycleId: "m3", daysAgo: 58, startHour: 19, durationMin:  45, distanceKm:  22.0,                         title: "Giro in Vespino",              tags: ["urban"],                       visibility: "private"    },
  { id: "a10", ownerId: "u0", motorcycleId: "m1", daysAgo: 66, startHour: 8,  durationMin: 215, distanceKm: 148.3, elevationGainM: 1320, title: "Lago d'Iseo, costa ovest",      tags: ["laghi","misto"],               visibility: "public",    mediaCount: 2 },
  { id: "a11", ownerId: "u0", motorcycleId: "m1", daysAgo: 74, startHour: 9,  durationMin: 175, distanceKm: 125.2, elevationGainM:  980, title: "Franciacorta loop",            tags: ["colline","weekend"],           visibility: "followers"  },
  { id: "a12", ownerId: "u0", motorcycleId: "m2", daysAgo: 81, startHour: 7,  durationMin: 330, distanceKm: 212.8, elevationGainM: 2240, title: "Passo di Gavia, prima del sole", tags: ["alpi","sunrise","passi"],     visibility: "public",    mediaCount: 4 },
  { id: "a13", ownerId: "u0", motorcycleId: "m1", daysAgo: 88, startHour: 18, durationMin:  55, distanceKm:  32.4,                         title: "Commute weekend",              tags: ["commute"],                     visibility: "private"    },
  { id: "a14", ownerId: "u0", motorcycleId: "m1", daysAgo: 95, startHour: 8,  durationMin: 260, distanceKm: 178.5, elevationGainM: 1720, title: "3 passi in un pomeriggio",       tags: ["alpi","passi"],                visibility: "followers"  },
  { id: "a15", ownerId: "u0", motorcycleId: "m2", daysAgo: 110,startHour: 6,  durationMin: 420, distanceKm: 288.2, elevationGainM: 3010, title: "Dolomiti misti, fino a Cortina", tags: ["dolomiti","tour","epic"],      visibility: "public",    mediaCount: 5 },
  { id: "a16", ownerId: "u0", motorcycleId: "m1", daysAgo: 125,startHour: 9,  durationMin: 200, distanceKm: 140.1, elevationGainM: 1180, title: "Ritorno a Brescia, calma",      tags: ["tour"],                        visibility: "followers"  },
  { id: "a17", ownerId: "u0", motorcycleId: "m1", daysAgo: 145,startHour: 10, durationMin: 155, distanceKm: 108.6, elevationGainM:  820, title: "Primo giro dopo il tagliando",  tags: ["collaudo"],                    visibility: "private"    },
  { id: "a18", ownerId: "u0", motorcycleId: "m2", daysAgo: 168,startHour: 7,  durationMin: 345, distanceKm: 225.4, elevationGainM: 2410, title: "Presolana + Valseriana",        tags: ["alpi","tour"],                 visibility: "followers"  },
  { id: "a19", ownerId: "u0", motorcycleId: "m1", daysAgo: 190,startHour: 8,  durationMin: 230, distanceKm: 162.3, elevationGainM: 1440, title: "Valtellina lenta",              tags: ["valle","tour"],                visibility: "public",    mediaCount: 2 },
  { id: "a20", ownerId: "u0", motorcycleId: "m1", daysAgo: 215,startHour: 7,  durationMin: 270, distanceKm: 185.9, elevationGainM: 1890, title: "Tonale replay",                 tags: ["alpi","passi"],                visibility: "followers"  },
  { id: "a21", ownerId: "u0", motorcycleId: "m2", daysAgo: 240,startHour: 6,  durationMin: 400, distanceKm: 265.0, elevationGainM: 2600, title: "Big one in Dolomiti",           tags: ["dolomiti","epic"],             visibility: "public",    mediaCount: 4 },
  // Altri rider (per feed)
  { id: "b_act1",  ownerId: "u_marco",   motorcycleId: "b_mar", daysAgo:  2, startHour: 7,  durationMin: 250, distanceKm: 182, elevationGainM: 2040, title: "Tonale, sunrise (leader)", tags: ["passi","sunrise"], visibility: "public",   mediaCount: 3 },
  { id: "b_act2",  ownerId: "u_marco",   motorcycleId: "b_mar", daysAgo: 15, startHour: 8,  durationMin: 180, distanceKm: 128, elevationGainM: 1500, title: "Tremalzo veloce",          tags: ["garda"],           visibility: "public" },
  { id: "b_act3",  ownerId: "u_giulia",  motorcycleId: "b_giu", daysAgo:  5, startHour: 10, durationMin: 165, distanceKm: 112, elevationGainM:  820, title: "Giro del Garda lento",     tags: ["garda","lento"],   visibility: "public",   mediaCount: 2 },
  { id: "b_act4",  ownerId: "u_giulia",  motorcycleId: "b_giu", daysAgo: 20, startHour: 9,  durationMin: 220, distanceKm: 148, elevationGainM: 1100, title: "Verso Trentino, foto",     tags: ["tour","foto"],     visibility: "public",   mediaCount: 4 },
  { id: "b_act5",  ownerId: "u_luca",    motorcycleId: "b_luc", daysAgo:  9, startHour: 6,  durationMin: 480, distanceKm: 312, elevationGainM: 2800, title: "Lungo raggio a nord",      tags: ["tour","epic"],     visibility: "public",   mediaCount: 3 },
  { id: "b_act6",  ownerId: "u_luca",    motorcycleId: "b_luc", daysAgo: 28, startHour: 7,  durationMin: 380, distanceKm: 250, elevationGainM: 2300, title: "Fino a Innsbruck",         tags: ["tour","estero"],   visibility: "public" },
  { id: "b_act7",  ownerId: "u_andrea",  motorcycleId: "b_and", daysAgo: 12, startHour: 8,  durationMin: 330, distanceKm: 205, elevationGainM: 1900, title: "Bergamasche + Presolana",  tags: ["alpi"],            visibility: "public",   mediaCount: 2 },
  { id: "b_act8",  ownerId: "u_sara",    motorcycleId: "b_sar", daysAgo:  1, startHour: 18, durationMin:  48, distanceKm:  28, elevationGainM:  120, title: "Commute tramonto",         tags: ["urban","commute"], visibility: "followers" },
  { id: "b_act9",  ownerId: "u_paolo",   motorcycleId: "b_pao", daysAgo:  7, startHour: 9,  durationMin: 190, distanceKm: 138, elevationGainM: 1050, title: "Giro in coppia",           tags: ["coppia"],          visibility: "followers" },
  { id: "b_act10", ownerId: "u_elena",   motorcycleId: "b_ele", daysAgo:  2, startHour: 11, durationMin:  75, distanceKm:  42, elevationGainM:  260, title: "Imparo le curve",          tags: ["beginner"],        visibility: "followers" },
  { id: "b_act11", ownerId: "u_anna",    motorcycleId: "b_ann", daysAgo:  4, startHour: 6,  durationMin: 330, distanceKm: 235, elevationGainM: 2500, title: "Gardena + Sella (guida)",  tags: ["dolomiti","leader"], visibility: "public", mediaCount: 3 },
  { id: "b_act12", ownerId: "u_anna",    motorcycleId: "b_ann", daysAgo: 22, startHour: 7,  durationMin: 360, distanceKm: 248, elevationGainM: 2680, title: "Lavaredo esplorativa",     tags: ["dolomiti"],        visibility: "public",   mediaCount: 4 },
  { id: "b_act13", ownerId: "u_davide",  motorcycleId: "b_dav", daysAgo: 11, startHour: 7,  durationMin: 420, distanceKm: 260, elevationGainM: 2700, title: "Sterrato in Dolomiti",     tags: ["off","dolomiti"],  visibility: "public",   mediaCount: 5 },
  { id: "b_act14", ownerId: "u_sofia",   motorcycleId: "b_sof", daysAgo:  6, startHour: 8,  durationMin: 290, distanceKm: 190, elevationGainM: 2100, title: "T7 + passi facili",        tags: ["dolomiti"],        visibility: "public",   mediaCount: 2 },
  { id: "b_act15", ownerId: "u_matteo",  motorcycleId: "b_mat", daysAgo:  8, startHour: 7,  durationMin: 315, distanceKm: 218, elevationGainM: 2350, title: "KTM in quota",             tags: ["alpi","passi"],    visibility: "public" },
  { id: "b_act16", ownerId: "u_giorgio", motorcycleId: "b_gio", daysAgo: 14, startHour: 9,  durationMin: 285, distanceKm: 175, elevationGainM: 1600, title: "Una moto, cento curve",    tags: ["veneto"],          visibility: "public" },
  { id: "b_act17", ownerId: "u_fede",    motorcycleId: "b_fed", daysAgo:  3, startHour: 8,  durationMin: 240, distanceKm: 165, elevationGainM: 1400, title: "Misti veloci",             tags: ["misti","sport"],   visibility: "public",   mediaCount: 2 },
  { id: "b_act18", ownerId: "u_fede",    motorcycleId: "b_fed", daysAgo: 18, startHour: 9,  durationMin: 330, distanceKm: 228, elevationGainM: 1900, title: "Track prep",               tags: ["sport"],           visibility: "public" },
  { id: "b_act19", ownerId: "u_loris",   motorcycleId: "b_lor", daysAgo:  4, startHour: 10, durationMin: 200, distanceKm: 142, elevationGainM: 1100, title: "R1M su passo asciutto",    tags: ["sport","passi"],   visibility: "public",   mediaCount: 2 },
  { id: "b_act20", ownerId: "u_max",     motorcycleId: "b_max", daysAgo:  2, startHour: 11, durationMin: 170, distanceKm: 120, elevationGainM:  900, title: "Panigale ride",            tags: ["sport"],           visibility: "followers" },
  { id: "b_act21", ownerId: "u_dani",    motorcycleId: "b_dan", daysAgo:  5, startHour: 9,  durationMin: 135, distanceKm:  82, elevationGainM:  520, title: "Colazione Franciacorta",   tags: ["colazione","amici"], visibility: "public", mediaCount: 3 },
  { id: "b_act22", ownerId: "u_dani",    motorcycleId: "b_dan", daysAgo: 26, startHour: 9,  durationMin: 160, distanceKm: 108, elevationGainM:  720, title: "Scrambler style",          tags: ["colline"],         visibility: "public" },
];

export function seedActivities(): Record<UUID, Activity> {
  const rng = makeRng(42);
  const out: Record<UUID, Activity> = {};
  for (const a of ACTS) {
    const startedAt = addHours(addDays(NOW, -a.daysAgo), a.startHour - 10);
    const endedAt = addHours(startedAt, a.durationMin / 60);
    const mediaIds: UUID[] = [];
    for (let i = 0; i < (a.mediaCount ?? 0); i++) {
      mediaIds.push(`${a.id}_md${i + 1}`);
    }
    out[a.id] = {
      id: a.id,
      ownerId: a.ownerId,
      motorcycleId: a.motorcycleId,
      groupRideId: a.groupRideId,
      startedAt,
      endedAt,
      durationSeconds: a.durationMin * 60,
      distanceKm: a.distanceKm,
      avgSpeedKmh: a.distanceKm === 0 ? 0 : Math.round((a.distanceKm / (a.durationMin / 60)) * 10) / 10,
      maxSpeedKmh: Math.round(rng.float(0.9, 1.6) * Math.max(60, (a.distanceKm * 60) / a.durationMin)),
      elevationGainM: a.elevationGainM,
      polylineSeed: rng.int(1, 10000),
      title: a.title,
      notes: a.notes,
      tags: a.tags,
      visibility: a.visibility,
      mediaIds,
    };
  }
  return out;
}

export function seedActivityMedia(): Record<UUID, ActivityMedia> {
  const out: Record<UUID, ActivityMedia> = {};
  for (const a of ACTS) {
    if (!a.mediaCount) continue;
    for (let i = 0; i < a.mediaCount; i++) {
      const id = `${a.id}_md${i + 1}`;
      out[id] = {
        id,
        activityId: a.id,
        storageUrl: `https://picsum.photos/seed/${a.id}${i}/1200/1600`,
        caption: i === 0 ? a.title : undefined,
        takenAt: addHours(addDays(NOW, -a.daysAgo), a.startHour - 10 + i * 0.5),
        status: "uploaded",
      };
    }
  }
  return out;
}

interface PlannedSeed {
  id: UUID;
  title: string;
  notes?: string;
  distanceKm: number;
  estimatedDurationMin: number;
  visibility: Visibility;
  tags: string[];
  daysAgo: number;
  waypointCount: number;
}

const PLANNED: PlannedSeed[] = [
  { id: "pr1", title: "Stelvio loop classico",    notes: "Partenza Bormio, discesa lato Prato.", distanceKm: 212, estimatedDurationMin: 330, visibility: "public",    tags: ["alpi","passi"],    daysAgo:  8, waypointCount: 6 },
  { id: "pr2", title: "Tonale al tramonto",       distanceKm: 158, estimatedDurationMin: 240, visibility: "followers", tags: ["alpi","sunset"],   daysAgo: 14, waypointCount: 4 },
  { id: "pr3", title: "Dolomiti slow",            notes: "Due giorni, sosta rifugio.",            distanceKm: 340, estimatedDurationMin: 540, visibility: "private",   tags: ["dolomiti","slow"], daysAgo: 26, waypointCount: 9 },
  { id: "pr4", title: "Lago d'Iseo costa ovest",  distanceKm:  96, estimatedDurationMin: 160, visibility: "public",    tags: ["laghi","misto"],   daysAgo: 45, waypointCount: 3 },
  { id: "pr5", title: "Notturna urbana Brescia",  notes: "Quando fa caldo.",                      distanceKm:  42, estimatedDurationMin:  75, visibility: "followers", tags: ["urban","night"],   daysAgo: 62, waypointCount: 5 },
  { id: "pr6", title: "Tour dei passi bergamaschi", distanceKm: 185, estimatedDurationMin: 290, visibility: "public",    tags: ["alpi","tour"],     daysAgo: 90, waypointCount: 7 },
];

export function seedPlannedRoutes(): Record<UUID, PlannedRoute> {
  const rng = makeRng(123);
  const out: Record<UUID, PlannedRoute> = {};
  for (const p of PLANNED) {
    const waypoints = Array.from({ length: p.waypointCount }, (_, i) => ({
      lat: 45.5 + rng.float(-0.6, 0.6, 4),
      lon: 10.2 + rng.float(-0.8, 0.8, 4),
      label: i === 0 ? "Partenza" : i === p.waypointCount - 1 ? "Arrivo" : undefined,
    }));
    out[p.id] = {
      id: p.id,
      ownerId: "u0",
      title: p.title,
      notes: p.notes,
      waypoints,
      polylineSeed: rng.int(1, 10000),
      distanceKm: p.distanceKm,
      estimatedDurationMin: p.estimatedDurationMin,
      visibility: p.visibility,
      tags: p.tags,
      createdAt: addDays(NOW, -p.daysAgo),
    };
  }
  return out;
}

export const ALL_ACTS = ACTS;
export const ALL_PLANNED = PLANNED;
