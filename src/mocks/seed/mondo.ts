import type {
  PublishedRoute,
  RouteComment,
  RouteLike,
  PublicEvent,
  EventRSVP,
  Segment,
  SegmentAttempt,
  Badge,
  UserBadge,
  Challenge,
  UUID,
} from "@/types/domain";
import { addDays, makeRng } from "../rng";
import { NOW } from "./people";

interface PubSeed {
  id: UUID;
  sourceType: PublishedRoute["sourceType"];
  sourceId: UUID;
  ownerId: UUID;
  title: string;
  coverText: string;
  heroColor: string;
  distanceKm: number;
  durationMin?: number;
  area: string;
  tags: string[];
  daysAgo: number;
}

const PUBS: PubSeed[] = [
  { id: "pub1", sourceType: "activity",      sourceId: "a3",       ownerId: "u0",        title: "Notturna dei laghi",          coverText: "Brescia → Iseo, al buio caldo.",          heroColor: "#ff6a1f", distanceKm:  96, durationMin: 170, area: "Lombardia",    tags: ["urban","night"],   daysAgo: 16 },
  { id: "pub2", sourceType: "activity",      sourceId: "a5",       ownerId: "u0",        title: "Stelvio + Gavia",             coverText: "Due passi, 215 km, niente foto brutte.",  heroColor: "#d95a1a", distanceKm: 215, durationMin: 310, area: "Valtellina",   tags: ["alpi","passi"],    daysAgo: 30 },
  { id: "pub3", sourceType: "activity",      sourceId: "a12",      ownerId: "u0",        title: "Gavia prima del sole",        coverText: "Partiti alle 5:30. Ne è valsa la pena.",  heroColor: "#ff6a1f", distanceKm: 213, durationMin: 330, area: "Valtellina",   tags: ["alpi","sunrise"],  daysAgo: 80 },
  { id: "pub4", sourceType: "activity",      sourceId: "a15",      ownerId: "u0",        title: "Dolomiti fino a Cortina",      coverText: "Giornata piena, moto sporca, testa pulita.", heroColor: "#6bb0ff", distanceKm: 288, durationMin: 420, area: "Dolomiti",     tags: ["dolomiti","epic"], daysAgo: 109 },
  { id: "pub5", sourceType: "activity",      sourceId: "b_act1",   ownerId: "u_marco",   title: "Tonale, sunrise (leader)",     coverText: "Cordata compatta, niente fronzoli.",     heroColor: "#d13a3a", distanceKm: 182, durationMin: 250, area: "Alta Valcamonica", tags: ["passi","sunrise"], daysAgo: 2 },
  { id: "pub6", sourceType: "activity",      sourceId: "b_act5",   ownerId: "u_luca",    title: "Lungo raggio a nord",           coverText: "312 km, confine aperto, vento contro.",  heroColor: "#7da35f", distanceKm: 312, durationMin: 480, area: "Cross-border", tags: ["tour","epic"],     daysAgo: 9 },
  { id: "pub7", sourceType: "activity",      sourceId: "b_act11",  ownerId: "u_anna",    title: "Gardena + Sella",              coverText: "Guida lenta, foto tante.",                heroColor: "#6bb0ff", distanceKm: 235, durationMin: 330, area: "Dolomiti",     tags: ["dolomiti"],        daysAgo: 4 },
  { id: "pub8", sourceType: "activity",      sourceId: "b_act13",  ownerId: "u_davide",  title: "Sterrato in Dolomiti",          coverText: "Nessun asfalto, tanto polverone.",        heroColor: "#c8a24b", distanceKm: 260, durationMin: 420, area: "Dolomiti",     tags: ["off","dolomiti"],  daysAgo: 11 },
  { id: "pub9", sourceType: "planned_route", sourceId: "pr1",      ownerId: "u0",        title: "Stelvio loop classico",        coverText: "La ricetta. Bormio → Prato → Bormio.",   heroColor: "#ff6a1f", distanceKm: 212, durationMin: 330, area: "Valtellina",   tags: ["alpi","loop"],     daysAgo: 7 },
  { id: "pub10",sourceType: "planned_route", sourceId: "pr6",      ownerId: "u0",        title: "Tour passi bergamaschi",       coverText: "Sette passi in un pomeriggio.",           heroColor: "#ff6a1f", distanceKm: 185, durationMin: 290, area: "Bergamo",      tags: ["alpi","tour"],     daysAgo: 85 },
];

export function seedPublishedRoutes(): Record<UUID, PublishedRoute> {
  const out: Record<UUID, PublishedRoute> = {};
  for (const p of PUBS) {
    out[p.id] = {
      id: p.id,
      sourceType: p.sourceType,
      sourceId: p.sourceId,
      ownerId: p.ownerId,
      title: p.title,
      coverText: p.coverText,
      heroColor: p.heroColor,
      distanceKm: p.distanceKm,
      durationMin: p.durationMin,
      area: p.area,
      tags: p.tags,
      publishedAt: addDays(NOW, -p.daysAgo),
    };
  }
  return out;
}

interface CommentSeed {
  id: UUID;
  publishedRouteId: UUID;
  authorId: UUID;
  text: string;
  hoursAgo: number;
}

const COMMENTS: CommentSeed[] = [
  { id: "c1", publishedRouteId: "pub1", authorId: "u_marco",  text: "Figata la luce alle 22:30.",                     hoursAgo: 360 },
  { id: "c2", publishedRouteId: "pub1", authorId: "u_giulia", text: "Che foto alle 6 del mattino!",                   hoursAgo: 360 },
  { id: "c3", publishedRouteId: "pub2", authorId: "u_anna",   text: "Bellissimo, la prossima veniamo anche noi.",     hoursAgo: 150 },
  { id: "c4", publishedRouteId: "pub2", authorId: "u_luca",   text: "Gavia + Stelvio è sempre magia.",                hoursAgo: 144 },
  { id: "c5", publishedRouteId: "pub3", authorId: "u_sofia",  text: "Alle 5:30 siamo persone migliori.",              hoursAgo: 96 },
  { id: "c6", publishedRouteId: "pub4", authorId: "u_davide", text: "Una di quelle giornate che si raccontano dopo.", hoursAgo: 48 },
  { id: "c7", publishedRouteId: "pub4", authorId: "u_matteo", text: "Respect.",                                       hoursAgo: 30 },
  { id: "c8", publishedRouteId: "pub5", authorId: "u0",       text: "Grazie Marco, cordata top.",                     hoursAgo: 12 },
  { id: "c9", publishedRouteId: "pub7", authorId: "u0",       text: "La prossima mi iscrivo.",                        hoursAgo: 22 },
  { id: "c10",publishedRouteId: "pub9", authorId: "u_fede",   text: "Me lo salvo per giugno.",                         hoursAgo: 50 },
];

export function seedRouteComments(): Record<UUID, RouteComment> {
  const out: Record<UUID, RouteComment> = {};
  for (const c of COMMENTS) {
    out[c.id] = {
      id: c.id,
      publishedRouteId: c.publishedRouteId,
      authorId: c.authorId,
      text: c.text,
      createdAt: addDays(NOW, -c.hoursAgo / 24),
    };
  }
  return out;
}

export function seedRouteLikes(): Record<UUID, RouteLike> {
  const rng = makeRng(77);
  const out: Record<UUID, RouteLike> = {};
  const allUsers = ["u0","u_marco","u_giulia","u_luca","u_andrea","u_sara","u_paolo","u_elena","u_anna","u_davide","u_sofia","u_matteo","u_giorgio","u_fede","u_loris","u_max","u_dani"];
  let i = 0;
  for (const p of PUBS) {
    const count = 3 + rng.int(0, 9);
    const likers = rng.sample(allUsers.filter((u) => u !== p.ownerId), count);
    for (const u of likers) {
      i += 1;
      out[`lk${i}`] = {
        id: `lk${i}`,
        publishedRouteId: p.id,
        userId: u,
        createdAt: addDays(NOW, -p.daysAgo + rng.int(0, Math.max(1, p.daysAgo))),
      };
    }
  }
  // Ray likes a few specific ones
  ["pub5","pub6","pub7","pub8"].forEach((pid) => {
    i += 1;
    out[`lk${i}`] = { id: `lk${i}`, publishedRouteId: pid, userId: "u0", createdAt: addDays(NOW, -1) };
  });
  return out;
}

// ── Events ──────────────────────────────────────────────────────────────────

interface EventSeed {
  id: UUID;
  kind: PublicEvent["kind"];
  title: string;
  description: string;
  organizerId: UUID;
  location: string;
  daysFromNow: number;
  durationDays?: number;
  coverHue: number;
  attendeesCount: number;
}

const EVENTS: EventSeed[] = [
  { id: "ev1", kind: "raduno",     title: "Motoraduno del Garda 2026",  description: "Due giorni, colonna sonora Panigale, colazione inclusa.",  organizerId: "u_marco", location: "Salò, BS",    daysFromNow: 28, durationDays: 2, coverHue:  18, attendeesCount: 240 },
  { id: "ev2", kind: "track_day",  title: "Track day Misano",           description: "Turni open a livello, moto stradali e pista.",             organizerId: "u_fede",  location: "Misano, RN",  daysFromNow: 12, durationDays: 1, coverHue: 350, attendeesCount:  64 },
  { id: "ev3", kind: "viaggio",    title: "Alpine rally Cortina",       description: "4 giorni in Dolomiti, rifugi e passi.",                    organizerId: "u_anna",  location: "Cortina, BL", daysFromNow: 45, durationDays: 4, coverHue: 210, attendeesCount:  34 },
  { id: "ev4", kind: "fiera",      title: "EICMA 2026",                  description: "Fiera internazionale della moto.",                         organizerId: "u_max",   location: "Milano Rho",  daysFromNow: 195, durationDays: 6, coverHue: 110, attendeesCount: 1520 },
  { id: "ev5", kind: "corso",      title: "Guida sicura ad Adria",      description: "Corso di guida sicura su pista chiusa.",                   organizerId: "u_loris", location: "Adria, RO",   daysFromNow: 20, durationDays: 1, coverHue: 280, attendeesCount:  24 },
  { id: "ev6", kind: "viaggio",    title: "Balcani 2026, 10 giorni",    description: "Tour organizzato Slovenia, Croazia, Bosnia, Montenegro.",  organizerId: "u_luca",  location: "Trieste, start", daysFromNow: 120, durationDays: 10, coverHue: 150, attendeesCount: 18 },
  { id: "ev7", kind: "raduno",     title: "Raduno Lago d'Iseo",         description: "Sunday brunch + giro costa ovest.",                        organizerId: "u_dani",  location: "Iseo, BS",    daysFromNow: -6, durationDays: 1, coverHue:  85, attendeesCount:  72 },
];

export function seedEvents(): Record<UUID, PublicEvent> {
  const out: Record<UUID, PublicEvent> = {};
  for (const e of EVENTS) {
    const startAt = addDays(NOW, e.daysFromNow);
    const endAt = e.durationDays ? addDays(startAt, e.durationDays) : undefined;
    out[e.id] = {
      id: e.id,
      kind: e.kind,
      title: e.title,
      description: e.description,
      organizerId: e.organizerId,
      location: e.location,
      startAt,
      endAt,
      coverHue: e.coverHue,
      attendeesCount: e.attendeesCount,
    };
  }
  return out;
}

export function seedEventRSVPs(): Record<UUID, EventRSVP> {
  const out: Record<UUID, EventRSVP> = {};
  const mk = (id: string, eventId: UUID, userId: UUID, value: EventRSVP["value"], daysAgo: number) => {
    out[id] = { id, eventId, userId, value, respondedAt: addDays(NOW, -daysAgo) };
  };
  mk("er1", "ev1", "u0",        "going",      10);
  mk("er2", "ev1", "u_marco",   "going",      20);
  mk("er3", "ev1", "u_giulia",  "going",      12);
  mk("er4", "ev2", "u0",        "interested",  6);
  mk("er5", "ev2", "u_fede",    "going",      18);
  mk("er6", "ev3", "u0",        "interested", 14);
  mk("er7", "ev3", "u_anna",    "going",      30);
  mk("er8", "ev3", "u_davide",  "going",      22);
  mk("er9", "ev5", "u_loris",   "going",       8);
  mk("er10","ev6", "u_luca",    "going",      40);
  return out;
}

// ── Classifica (segments, attempts, badges, challenges) ────────────────────

const SEGMENTS: Array<Omit<Segment, "createdAt">> = [
  { id: "s1", title: "Passo del Tonale salita",  area: "Val Camonica",  distanceKm: 18.4, elevationGainM: 1300, surface: "asfalto" },
  { id: "s2", title: "Tremalzo ovest",           area: "Garda",         distanceKm: 11.8, elevationGainM:  880, surface: "misto"   },
  { id: "s3", title: "Gardena est-ovest",        area: "Dolomiti",      distanceKm:  9.5, elevationGainM:  640, surface: "asfalto" },
  { id: "s4", title: "Stelvio north face",       area: "Valtellina",    distanceKm: 24.3, elevationGainM: 1800, surface: "asfalto" },
  { id: "s5", title: "Mortirolo climb",          area: "Valtellina",    distanceKm: 12.4, elevationGainM: 1300, surface: "asfalto" },
  { id: "s6", title: "Lago d'Iseo costa ovest",  area: "Lombardia",     distanceKm: 32.0, elevationGainM:  220, surface: "asfalto" },
];

export function seedSegments(): Record<UUID, Segment> {
  const out: Record<UUID, Segment> = {};
  for (const s of SEGMENTS) {
    out[s.id] = { ...s, createdAt: addDays(NOW, -420) };
  }
  return out;
}

export function seedSegmentAttempts(): Record<UUID, SegmentAttempt> {
  const rng = makeRng(99);
  const out: Record<UUID, SegmentAttempt> = {};
  const candidates: Array<{ userId: UUID; activityId: UUID }> = [
    { userId: "u0",        activityId: "a1" },
    { userId: "u0",        activityId: "a5" },
    { userId: "u0",        activityId: "a8" },
    { userId: "u_marco",   activityId: "b_act1" },
    { userId: "u_marco",   activityId: "b_act2" },
    { userId: "u_luca",    activityId: "b_act5" },
    { userId: "u_luca",    activityId: "b_act6" },
    { userId: "u_andrea",  activityId: "b_act7" },
    { userId: "u_anna",    activityId: "b_act11" },
    { userId: "u_davide",  activityId: "b_act13" },
    { userId: "u_sofia",   activityId: "b_act14" },
    { userId: "u_matteo",  activityId: "b_act15" },
    { userId: "u_fede",    activityId: "b_act17" },
    { userId: "u_loris",   activityId: "b_act19" },
    { userId: "u_max",     activityId: "b_act20" },
  ];
  let i = 0;
  for (const seg of SEGMENTS) {
    const baseTime = seg.distanceKm * 60; // seconds, rough
    const attempts = rng.sample(candidates, 6 + rng.int(0, 3));
    for (const c of attempts) {
      i += 1;
      const jitter = rng.float(0.85, 1.2);
      out[`sa${i}`] = {
        id: `sa${i}`,
        segmentId: seg.id,
        userId: c.userId,
        activityId: c.activityId,
        durationSeconds: Math.round(baseTime * jitter),
        attemptedAt: addDays(NOW, -rng.int(1, 200)),
      };
    }
  }
  return out;
}

export function seedBadges(): Record<UUID, Badge> {
  const rows: Badge[] = [
    { id: "bd1", slug: "first-ride",      title: "Prima uscita",       description: "La prima attività registrata.",           iconGlyph: "🏁", accentColor: "#ff6a1f" },
    { id: "bd2", slug: "hundred-in-day",  title: "100 km in un giorno", description: "Una singola uscita oltre 100 km.",        iconGlyph: "⚡", accentColor: "#d95a1a" },
    { id: "bd3", slug: "ten-in-month",    title: "10 uscite in un mese", description: "Dieci attività nello stesso mese.",       iconGlyph: "🔟", accentColor: "#6bb0ff" },
    { id: "bd4", slug: "pass-2000",       title: "Passo 2000 m",        description: "Superato un passo sopra 2000 m.",          iconGlyph: "⛰️", accentColor: "#c8a24b" },
    { id: "bd5", slug: "track-day",       title: "Track day",           description: "Un turno in pista registrato.",            iconGlyph: "🏎️", accentColor: "#d13a3a" },
    { id: "bd6", slug: "notturna",        title: "Notturna",            description: "Un'uscita iniziata dopo le 20.",           iconGlyph: "🌙", accentColor: "#6b6bff" },
    { id: "bd7", slug: "early-bird",      title: "Early bird",          description: "Uscita iniziata prima delle 6:30.",        iconGlyph: "🌅", accentColor: "#ff9f5a" },
    { id: "bd8", slug: "weekend-warrior", title: "Weekend warrior",     description: "Quattro weekend consecutivi in sella.",    iconGlyph: "🔥", accentColor: "#ff6a1f" },
  ];
  const out: Record<UUID, Badge> = {};
  for (const b of rows) out[b.id] = b;
  return out;
}

export function seedUserBadges(): Record<UUID, UserBadge> {
  const out: Record<UUID, UserBadge> = {};
  const mk = (id: string, userId: UUID, badgeId: UUID, daysAgo: number) => {
    out[id] = { id, userId, badgeId, earnedAt: addDays(NOW, -daysAgo) };
  };
  // Ray
  mk("ub1", "u0", "bd1", 420);
  mk("ub2", "u0", "bd2", 400);
  mk("ub3", "u0", "bd4", 215);
  mk("ub4", "u0", "bd7", 80);
  mk("ub5", "u0", "bd8", 72);
  // Altri, distribuiti
  mk("ub6",  "u_marco",   "bd1",  500);
  mk("ub7",  "u_marco",   "bd3",  120);
  mk("ub8",  "u_marco",   "bd4",  180);
  mk("ub9",  "u_luca",    "bd2",  200);
  mk("ub10", "u_luca",    "bd4",  190);
  mk("ub11", "u_anna",    "bd4",  210);
  mk("ub12", "u_anna",    "bd8",   60);
  mk("ub13", "u_davide",  "bd2",  140);
  mk("ub14", "u_sofia",   "bd4",  100);
  mk("ub15", "u_fede",    "bd5",   18);
  mk("ub16", "u_loris",   "bd5",   30);
  mk("ub17", "u_giulia",  "bd1",  200);
  mk("ub18", "u_dani",    "bd7",   60);
  return out;
}

export function seedChallenges(): Record<UUID, Challenge> {
  return {
    ch1: {
      id: "ch1",
      title: "Maggio ruggente",
      description: "500 km nel mese di maggio. In sella a qualsiasi ora.",
      startAt: "2026-05-01T00:00:00Z",
      endAt:   "2026-05-31T23:59:59Z",
      targetKm: 500,
      participantsCount: 184,
    },
  };
}
