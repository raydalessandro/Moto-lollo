import type {
  Group,
  GroupMembership,
  GroupRide,
  GroupRideRSVP,
  LiveSession,
  RSVPValue,
  UUID,
} from "@/types/domain";
import { addDays } from "../rng";
import { NOW } from "./people";

export function seedGroups(): Record<UUID, Group> {
  // Step 6: all groups are private + admin-moderated. area + publicRoutesCount
  // are denormalized so the discovery list can render without joins.
  return {
    g1: { id: "g1", slug: "garda",    name: "Moto Garda",      tag: "GRD", crestColor: "#ff6a1f", description: "Passi alpini e colazioni presto.", membersCount: 8,  foundedAt: "2022-03-14T00:00:00Z", isPrivate: true, area: "Lago di Garda · Alpi orobiche", publicRoutesCount: 3 },
    g2: { id: "g2", slug: "dolomiti", name: "Dolomiti Riders", tag: "DOL", crestColor: "#6bb0ff", description: "Dolomiti, lentamente.",             membersCount: 6,  foundedAt: "2023-05-02T00:00:00Z", isPrivate: true, area: "Dolomiti · Trentino-Alto Adige", publicRoutesCount: 4 },
    g3: { id: "g3", slug: "sport",    name: "Sport Riders",    tag: "SPT", crestColor: "#d13a3a", description: "Track day, misti veloci.",          membersCount: 4,  foundedAt: "2024-01-20T00:00:00Z", isPrivate: true, area: "Lombardia · circuiti",          publicRoutesCount: 0 },
    g4: { id: "g4", slug: "amici",    name: "Amici",           tag: "AMC", crestColor: "#7da35f", description: "Colazioni + giretti.",              membersCount: 4,  foundedAt: "2021-06-01T00:00:00Z", isPrivate: true, area: "Franciacorta",                  publicRoutesCount: 2 },
  };
}

interface MembershipSeed {
  groupId: UUID;
  userId: UUID;
  role: GroupMembership["role"];
  joinedDaysAgo: number;
}

const MEMBERSHIPS: MembershipSeed[] = [
  // g1 Moto Garda (8 membri)
  { groupId: "g1", userId: "u_marco",   role: "leader", joinedDaysAgo: 700 },
  // HUMAN-DEFERRED: admin model — see PLAN.md §1.3
  // Ray is promoted to admin of Moto Garda so we can exercise the admin UIs
  // (validate route proposals, accept membership requests, publish to Mondo).
  // In production this requires a DB migration: not every member becomes admin
  // automatically; the role transition needs a real operation.
  { groupId: "g1", userId: "u0",        role: "admin",  joinedDaysAgo: 500 },
  { groupId: "g1", userId: "u_giulia",  role: "member", joinedDaysAgo: 480 },
  { groupId: "g1", userId: "u_luca",    role: "admin",  joinedDaysAgo: 450 },
  { groupId: "g1", userId: "u_andrea",  role: "member", joinedDaysAgo: 400 },
  { groupId: "g1", userId: "u_sara",    role: "member", joinedDaysAgo: 300 },
  { groupId: "g1", userId: "u_paolo",   role: "member", joinedDaysAgo: 260 },
  { groupId: "g1", userId: "u_elena",   role: "member", joinedDaysAgo:  80 },
  // g2 Dolomiti Riders (6 membri)
  { groupId: "g2", userId: "u_anna",    role: "leader", joinedDaysAgo: 520 },
  { groupId: "g2", userId: "u0",        role: "member", joinedDaysAgo: 180 },
  { groupId: "g2", userId: "u_davide",  role: "admin",  joinedDaysAgo: 500 },
  { groupId: "g2", userId: "u_sofia",   role: "member", joinedDaysAgo: 420 },
  { groupId: "g2", userId: "u_matteo",  role: "member", joinedDaysAgo: 300 },
  { groupId: "g2", userId: "u_giorgio", role: "member", joinedDaysAgo: 180 },
  // g3 Sport Riders (4 membri)
  { groupId: "g3", userId: "u_fede",    role: "leader", joinedDaysAgo: 300 },
  { groupId: "g3", userId: "u0",        role: "member", joinedDaysAgo: 120 },
  { groupId: "g3", userId: "u_loris",   role: "admin",  joinedDaysAgo: 280 },
  { groupId: "g3", userId: "u_max",     role: "member", joinedDaysAgo: 260 },
  // g4 Amici (4 membri)
  { groupId: "g4", userId: "u_dani",    role: "leader", joinedDaysAgo: 900 },
  { groupId: "g4", userId: "u0",        role: "member", joinedDaysAgo: 850 },
  { groupId: "g4", userId: "u_sara",    role: "member", joinedDaysAgo: 700 },
  { groupId: "g4", userId: "u_paolo",   role: "member", joinedDaysAgo: 620 },
];

export function seedMemberships(): Record<UUID, GroupMembership> {
  const out: Record<UUID, GroupMembership> = {};
  let i = 0;
  for (const m of MEMBERSHIPS) {
    i += 1;
    const id = `gm${i}`;
    out[id] = {
      id,
      groupId: m.groupId,
      userId: m.userId,
      role: m.role,
      joinedAt: addDays(NOW, -m.joinedDaysAgo),
    };
  }
  return out;
}

interface RideSeed extends Partial<Pick<GroupRide, "navigatorUserId">> {
  id: UUID;
  groupId: UUID;
  title: string;
  meetupText: string;
  daysFromNow: number;
  hour: number;
  distanceKm: number;
  estimatedDurationMin: number;
  status: GroupRide["status"];
  proposedBy: UUID;
  plannedRouteId?: UUID;
  activityIds?: UUID[];
  invitedCount: number;
  confirmedCount: number;
}

const RIDES: RideSeed[] = [
  // Futuri (preservati dai mock precedenti)
  { id: "r1", groupId: "g1", title: "Passo del Tonale, sunrise", meetupText: "Bar Aquila, Salò",  daysFromNow:   9, hour:  6, distanceKm: 187, estimatedDurationMin: 270, status: "confermata", proposedBy: "u_marco",  plannedRouteId: "pr2", invitedCount: 8,  confirmedCount: 5, navigatorUserId: "u_marco" },
  { id: "r2", groupId: "g1", title: "Giro del Tremalzo",         meetupText: "Piazzale Riva",     daysFromNow:  17, hour:  8, distanceKm: 132, estimatedDurationMin: 200, status: "proposta",   proposedBy: "u0",       invitedCount: 8,  confirmedCount: 3 },
  { id: "r3", groupId: "g1", title: "Notturna dei laghi",        meetupText: "P.zza Duomo BS",    daysFromNow:  22, hour: 20, distanceKm:  96, estimatedDurationMin: 160, status: "proposta",   proposedBy: "u_giulia", plannedRouteId: "pr5", invitedCount: 8, confirmedCount: 2 },
  { id: "r4", groupId: "g2", title: "Passo Gardena + Sella",     meetupText: "Ortisei piazza",    daysFromNow:  16, hour:  7, distanceKm: 240, estimatedDurationMin: 340, status: "confermata", proposedBy: "u_anna",   invitedCount: 12, confirmedCount: 8 },
  { id: "r5", groupId: "g2", title: "3 Cime di Lavaredo",        meetupText: "Cortina centro",    daysFromNow:  24, hour:  5, distanceKm: 180, estimatedDurationMin: 260, status: "proposta",   proposedBy: "u_davide", invitedCount: 12, confirmedCount: 4 },
  { id: "r6", groupId: "g3", title: "Track day Mugello",         meetupText: "Paddock MG",        daysFromNow:  23, hour:  8, distanceKm:   0, estimatedDurationMin: 360, status: "confermata", proposedBy: "u_fede",   invitedCount: 4,  confirmedCount: 3 },
  { id: "r7", groupId: "g4", title: "Colazione in Franciacorta", meetupText: "Bar Centrale",      daysFromNow:  10, hour:  9, distanceKm:  78, estimatedDurationMin: 150, status: "confermata", proposedBy: "u_dani",   invitedCount: 6,  confirmedCount: 4 },
  // In corso
  { id: "r_now", groupId: "g1", title: "Franciacorta loop", meetupText: "Bar Aquila, Salò", daysFromNow: 0, hour: 8, distanceKm: 72, estimatedDurationMin: 150, status: "in-corso", proposedBy: "u_marco", invitedCount: 8, confirmedCount: 6, navigatorUserId: "u_marco" },
  // Annullata
  { id: "r_cxl", groupId: "g2", title: "Presolana spring edition", meetupText: "Clusone piazza", daysFromNow: -5, hour: 8, distanceKm: 160, estimatedDurationMin: 240, status: "annullata", proposedBy: "u_anna", invitedCount: 12, confirmedCount: 3 },
  // Completate — collegate ad activity vere
  { id: "rc1",  groupId: "g1", title: "Tonale replay",            meetupText: "Bar Aquila, Salò", daysFromNow:  -3, hour:  7, distanceKm: 187, estimatedDurationMin: 270, status: "completata", proposedBy: "u_marco",  activityIds: ["a1","b_act1"],    invitedCount: 8,  confirmedCount: 6 },
  { id: "rc2",  groupId: "g1", title: "Franciacorta mattina",     meetupText: "Bar Centrale",     daysFromNow: -11, hour:  8, distanceKm: 125, estimatedDurationMin: 175, status: "completata", proposedBy: "u_giulia", activityIds: ["a11"],            invitedCount: 8,  confirmedCount: 7 },
  { id: "rc3",  groupId: "g2", title: "Dolomiti tour slow",       meetupText: "Ortisei piazza",   daysFromNow: -45, hour:  6, distanceKm: 258, estimatedDurationMin: 390, status: "completata", proposedBy: "u_anna",   activityIds: ["a7","b_act11"],   invitedCount: 12, confirmedCount: 9 },
  { id: "rc4",  groupId: "g2", title: "Stelvio sunrise",          meetupText: "Bormio centro",    daysFromNow: -31, hour:  6, distanceKm: 215, estimatedDurationMin: 310, status: "completata", proposedBy: "u_davide", activityIds: ["a5"],             invitedCount: 12, confirmedCount: 5 },
  { id: "rc5",  groupId: "g1", title: "Mortirolo mattinale",      meetupText: "Edolo bar",        daysFromNow: -52, hour:  7, distanceKm: 199, estimatedDurationMin: 285, status: "completata", proposedBy: "u_marco",  activityIds: ["a8"],             invitedCount: 8,  confirmedCount: 6 },
  { id: "rc6",  groupId: "g4", title: "Colazione + Franciacorta", meetupText: "Bar Centrale",     daysFromNow:  -5, hour:  9, distanceKm:  82, estimatedDurationMin: 135, status: "completata", proposedBy: "u_dani",   activityIds: ["b_act21"],        invitedCount: 6,  confirmedCount: 5 },
  { id: "rc7",  groupId: "g3", title: "Misti veloci",             meetupText: "Autosella Lecco",  daysFromNow:  -3, hour:  8, distanceKm: 165, estimatedDurationMin: 240, status: "completata", proposedBy: "u_fede",   activityIds: ["b_act17"],        invitedCount: 4,  confirmedCount: 4 },
  { id: "rc8",  groupId: "g2", title: "Sterrato esplorativo",     meetupText: "Cortina centro",   daysFromNow: -11, hour:  7, distanceKm: 260, estimatedDurationMin: 420, status: "completata", proposedBy: "u_davide", activityIds: ["b_act13"],        invitedCount: 12, confirmedCount: 4 },
  { id: "rc9",  groupId: "g1", title: "Tre passi primavera",      meetupText: "Bar Aquila, Salò", daysFromNow: -95, hour:  8, distanceKm: 178, estimatedDurationMin: 260, status: "completata", proposedBy: "u_luca",   activityIds: ["a14"],            invitedCount: 8,  confirmedCount: 6 },
  { id: "rc10", groupId: "g1", title: "Valtellina lenta",         meetupText: "Sondrio stazione", daysFromNow: -190,hour:  8, distanceKm: 162, estimatedDurationMin: 230, status: "completata", proposedBy: "u0",       activityIds: ["a19"],            invitedCount: 8,  confirmedCount: 5 },
  { id: "rc11", groupId: "g2", title: "Big one Dolomiti",         meetupText: "Bolzano centro",   daysFromNow: -110,hour:  6, distanceKm: 288, estimatedDurationMin: 420, status: "completata", proposedBy: "u_anna",   activityIds: ["a15","b_act12"],  invitedCount: 12, confirmedCount: 8 },
  { id: "rc12", groupId: "g3", title: "Track prep Misano",        meetupText: "Misano paddock",   daysFromNow: -18, hour:  9, distanceKm: 228, estimatedDurationMin: 330, status: "completata", proposedBy: "u_fede",   activityIds: ["b_act18"],        invitedCount: 4,  confirmedCount: 3 },
];

export function seedGroupRides(): Record<UUID, GroupRide> {
  const out: Record<UUID, GroupRide> = {};
  for (const r of RIDES) {
    const startAt = addDays(NOW, r.daysFromNow);
    // set hour
    const d = new Date(startAt);
    d.setUTCHours(r.hour, 0, 0, 0);
    out[r.id] = {
      id: r.id,
      groupId: r.groupId,
      plannedRouteId: r.plannedRouteId,
      title: r.title,
      meetupText: r.meetupText,
      startAt: d.toISOString(),
      distanceKm: r.distanceKm,
      estimatedDurationMin: r.estimatedDurationMin,
      status: r.status,
      proposedBy: r.proposedBy,
      activityIds: r.activityIds ?? [],
      invitedCount: r.invitedCount,
      confirmedCount: r.confirmedCount,
      navigatorUserId: r.navigatorUserId,
    };
  }
  return out;
}

export function seedRSVPs(): Record<UUID, GroupRideRSVP> {
  const out: Record<UUID, GroupRideRSVP> = {};
  // Mapping gruppo → membri (dalle memberships sopra)
  const members: Record<UUID, UUID[]> = {
    g1: ["u_marco", "u0", "u_giulia", "u_luca", "u_andrea", "u_sara", "u_paolo", "u_elena"],
    g2: ["u_anna", "u0", "u_davide", "u_sofia", "u_matteo", "u_giorgio"],
    g3: ["u_fede", "u0", "u_loris", "u_max"],
    g4: ["u_dani", "u0", "u_sara", "u_paolo"],
  };
  let i = 0;
  for (const r of RIDES) {
    const gm = members[r.groupId] ?? [];
    gm.forEach((userId, idx) => {
      i += 1;
      let value: RSVPValue;
      if (r.status === "completata" || r.status === "in-corso") {
        value = idx < r.confirmedCount ? "going" : "no";
      } else if (r.status === "annullata") {
        value = idx < r.confirmedCount ? "going" : "maybe";
      } else {
        if (idx < r.confirmedCount) value = "going";
        else if (idx < r.confirmedCount + 2) value = "maybe";
        else value = "no";
      }
      // Ray (u0) è sempre nel gruppo — diamogli preferenze realistiche
      if (userId === "u0") {
        if (r.id === "r1" || r.id === "r4" || r.id === "r7" || r.id === "r6") value = "going";
        else if (r.id === "r2" || r.id === "r3") value = "maybe";
        else if (r.status === "completata") value = "going";
      }
      out[`rsvp_${i}`] = {
        id: `rsvp_${i}`,
        groupRideId: r.id,
        userId,
        value,
        respondedAt: addDays(NOW, r.daysFromNow - 3),
      };
    });
  }
  return out;
}

export function seedLiveSessions(): Record<UUID, LiveSession> {
  return {
    ls1: {
      id: "ls1",
      ownerId: "u_marco",
      groupId: "g1",
      activityId: "a1",
      title: "Tonale sunrise — cordata",
      startedAt: addDays(NOW, -3),
      endedAt: addDays(NOW, -3),
      state: "ended_normal",
      shareToken: "TNL-SNR-2026",
    },
  };
}

export const ALL_RIDES = RIDES;
