import type { Group, GroupRide } from "@/types/domain";

export const groups: Group[] = [
  { id: "g1", slug: "garda",    name: "Moto Garda",      crestColor: "#ff6a1f", membersCount: 8,  isMember: true },
  { id: "g2", slug: "dolomiti", name: "Dolomiti Riders", crestColor: "#6bb0ff", membersCount: 6,  isMember: true },
  { id: "g3", slug: "sport",    name: "Sport Riders",    crestColor: "#d13a3a", membersCount: 4,  isMember: true },
  { id: "g4", slug: "amici",    name: "Amici",           crestColor: "#7da35f", membersCount: 4,  isMember: true },
];

export const groupRides: GroupRide[] = [
  { id: "r1", groupId: "g1", title: "Passo del Tonale, sunrise", meetupText: "Bar Aquila, Salò",  startAt: "2026-05-02T06:30:00Z", distanceKm: 187, confirmed: 5, total: 8, status: "confermata" },
  { id: "r2", groupId: "g1", title: "Giro del Tremalzo",         meetupText: "Piazzale Riva",     startAt: "2026-05-10T08:00:00Z", distanceKm: 132, confirmed: 3, total: 8, status: "proposta" },
  { id: "r3", groupId: "g1", title: "Notturna dei laghi",        meetupText: "P.zza Duomo BS",    startAt: "2026-05-15T20:00:00Z", distanceKm: 96,  confirmed: 2, total: 8, status: "proposta" },
  { id: "r4", groupId: "g2", title: "Passo Gardena + Sella",     meetupText: "Ortisei piazza",    startAt: "2026-05-09T07:00:00Z", distanceKm: 240, confirmed: 8, total: 12, status: "confermata" },
  { id: "r5", groupId: "g2", title: "3 Cime di Lavaredo",        meetupText: "Cortina centro",    startAt: "2026-05-17T05:30:00Z", distanceKm: 180, confirmed: 4, total: 12, status: "proposta" },
  { id: "r6", groupId: "g3", title: "Track day Mugello",         meetupText: "Paddock MG",        startAt: "2026-05-16T08:00:00Z", distanceKm: 0,   confirmed: 3, total: 4,  status: "confermata" },
  { id: "r7", groupId: "g4", title: "Colazione in Franciacorta", meetupText: "Bar Centrale",      startAt: "2026-05-03T09:30:00Z", distanceKm: 78,  confirmed: 4, total: 6,  status: "confermata" },
];
