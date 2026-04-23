import type { Group, GroupRide } from "@/types/domain";

export const groups: Group[] = [
  { id: "g1", slug: "garda",    name: "Moto Garda",      tag: "GRD", crestColor: "#ff6a1f", membersCount: 8,  foundedAt: "2022-03-14T00:00:00Z" },
  { id: "g2", slug: "dolomiti", name: "Dolomiti Riders", tag: "DOL", crestColor: "#6bb0ff", membersCount: 6,  foundedAt: "2023-05-02T00:00:00Z" },
  { id: "g3", slug: "sport",    name: "Sport Riders",    tag: "SPT", crestColor: "#d13a3a", membersCount: 4,  foundedAt: "2024-01-20T00:00:00Z" },
  { id: "g4", slug: "amici",    name: "Amici",           tag: "AMC", crestColor: "#7da35f", membersCount: 4,  foundedAt: "2021-06-01T00:00:00Z" },
];

export const groupRides: GroupRide[] = [
  { id: "r1", groupId: "g1", title: "Passo del Tonale, sunrise", meetupText: "Bar Aquila, Salò",  startAt: "2026-05-02T06:30:00Z", distanceKm: 187, estimatedDurationMin: 270, status: "confermata", proposedBy: "u_marco",  activityIds: [], invitedCount: 8,  confirmedCount: 5 },
  { id: "r2", groupId: "g1", title: "Giro del Tremalzo",         meetupText: "Piazzale Riva",     startAt: "2026-05-10T08:00:00Z", distanceKm: 132, estimatedDurationMin: 200, status: "proposta",   proposedBy: "u0",       activityIds: [], invitedCount: 8,  confirmedCount: 3 },
  { id: "r3", groupId: "g1", title: "Notturna dei laghi",        meetupText: "P.zza Duomo BS",    startAt: "2026-05-15T20:00:00Z", distanceKm: 96,  estimatedDurationMin: 160, status: "proposta",   proposedBy: "u_giulia", activityIds: [], invitedCount: 8,  confirmedCount: 2 },
  { id: "r4", groupId: "g2", title: "Passo Gardena + Sella",     meetupText: "Ortisei piazza",    startAt: "2026-05-09T07:00:00Z", distanceKm: 240, estimatedDurationMin: 340, status: "confermata", proposedBy: "u_anna",   activityIds: [], invitedCount: 12, confirmedCount: 8 },
  { id: "r5", groupId: "g2", title: "3 Cime di Lavaredo",        meetupText: "Cortina centro",    startAt: "2026-05-17T05:30:00Z", distanceKm: 180, estimatedDurationMin: 260, status: "proposta",   proposedBy: "u_davide", activityIds: [], invitedCount: 12, confirmedCount: 4 },
  { id: "r6", groupId: "g3", title: "Track day Mugello",         meetupText: "Paddock MG",        startAt: "2026-05-16T08:00:00Z", distanceKm: 0,   estimatedDurationMin: 360, status: "confermata", proposedBy: "u_fede",   activityIds: [], invitedCount: 4,  confirmedCount: 3 },
  { id: "r7", groupId: "g4", title: "Colazione in Franciacorta", meetupText: "Bar Centrale",      startAt: "2026-05-03T09:30:00Z", distanceKm: 78,  estimatedDurationMin: 150, status: "confermata", proposedBy: "u_dani",   activityIds: [], invitedCount: 6,  confirmedCount: 4 },
];
