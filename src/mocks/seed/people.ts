import type {
  Profile,
  UserPreferences,
  FollowRelationship,
  SafetyContact,
  Notification,
  UUID,
} from "@/types/domain";
import { addDays, addHours } from "../rng";

export const NOW = "2026-04-23T10:00:00Z";

interface PersonSeed {
  id: UUID;
  username: string;
  displayName: string;
  initials: string;
  accent: string;
  city: string;
  bio: string;
}

export const PEOPLE: PersonSeed[] = [
  { id: "u0",        username: "ray",      displayName: "Ray",     initials: "RY", accent: "#ff6a1f", city: "Brescia",  bio: "Touring / passi alpini / colazioni lunghe." },
  { id: "u_marco",   username: "marco.r",  displayName: "Marco",   initials: "MR", accent: "#d13a3a", city: "Brescia",  bio: "Leader Moto Garda. Panigale sotto, passi davanti." },
  { id: "u_giulia",  username: "giu.mt",   displayName: "Giulia",  initials: "GL", accent: "#6bb0ff", city: "Verona",   bio: "MT-09, viaggi lenti, foto a ogni curva." },
  { id: "u_luca",    username: "lukaa",    displayName: "Luca",    initials: "LC", accent: "#7da35f", city: "Mantova",  bio: "GS da 40.000 km. Dovunque, purché lontano." },
  { id: "u_andrea",  username: "andre_v",  displayName: "Andrea",  initials: "AN", accent: "#c8a24b", city: "Bergamo",  bio: "V-Strom + tenda. Weekend = montagna." },
  { id: "u_sara",    username: "sara.k",   displayName: "Sara",    initials: "SR", accent: "#c779c7", city: "Milano",   bio: "Z650, pendolare sorridente." },
  { id: "u_paolo",   username: "pao.tr",   displayName: "Paolo",   initials: "PL", accent: "#4ea39a", city: "Cremona",  bio: "Tracer 900, commute + gite in coppia." },
  { id: "u_elena",   username: "ele.cb",   displayName: "Elena",   initials: "EL", accent: "#e07f3c", city: "Mantova",  bio: "CB500 appena presa. Imparo in curva." },
  { id: "u_anna",    username: "anna.gs",  displayName: "Anna",    initials: "AA", accent: "#6bb0ff", city: "Bolzano",  bio: "Leader Dolomiti Riders. GS1250, colazione alle 6." },
  { id: "u_davide",  username: "dav.at",   displayName: "Davide",  initials: "DV", accent: "#c8a24b", city: "Trento",   bio: "Africa Twin, sterrato ogni volta che posso." },
  { id: "u_sofia",   username: "sofi.t7",  displayName: "Sofia",   initials: "SF", accent: "#c779c7", city: "Bolzano",  bio: "Tenerè 700. Dolomiti = casa." },
  { id: "u_matteo",  username: "matt890",  displayName: "Matteo",  initials: "MT", accent: "#d13a3a", city: "Trento",   bio: "KTM 890 Adv. Passi, sempre." },
  { id: "u_giorgio", username: "gio.xt",   displayName: "Giorgio", initials: "GR", accent: "#7da35f", city: "Verona",   bio: "XT 660 Z Ténéré. Una moto, cento strade." },
  { id: "u_fede",    username: "fede.v4r", displayName: "Fede",    initials: "FD", accent: "#d13a3a", city: "Milano",   bio: "Leader Sport Riders. V4R, casco sempre pronto." },
  { id: "u_loris",   username: "loris.r1", displayName: "Loris",   initials: "LR", accent: "#6bb0ff", city: "Como",     bio: "R1M, track day quando posso." },
  { id: "u_max",     username: "max.v4",   displayName: "Max",     initials: "MX", accent: "#c779c7", city: "Milano",   bio: "Panigale V4. Asfalto o niente." },
  { id: "u_dani",    username: "dani.scr", displayName: "Dani",    initials: "DN", accent: "#7da35f", city: "Brescia",  bio: "Leader Amici. Scrambler + colazione." },
];

export function seedProfiles(): Record<UUID, Profile> {
  const out: Record<UUID, Profile> = {};
  for (const p of PEOPLE) {
    out[p.id] = {
      id: p.id,
      username: p.username,
      displayName: p.displayName,
      bio: p.bio,
      initials: p.initials,
      accentColor: p.accent,
      role: "user",
      isPublic: true,
      city: p.city,
      createdAt: p.id === "u0" ? "2024-05-01T00:00:00Z" : addDays(NOW, -300 - PEOPLE.indexOf(p) * 12),
    };
  }
  return out;
}

export function seedPreferences(): Record<UUID, UserPreferences> {
  return {
    u0: {
      userId: "u0",
      theme: "dark",
      language: "it",
      units: "metric",
      notificationsEnabled: true,
      defaultActivityVisibility: "followers",
      autoSyncEnabled: true,
    },
  };
}

export function seedFollows(): Record<UUID, FollowRelationship> {
  const out: Record<UUID, FollowRelationship> = {};
  const mk = (id: string, follower: UUID, followed: UUID, daysAgo: number) => {
    out[id] = {
      id,
      followerId: follower,
      followedId: followed,
      createdAt: addDays(NOW, -daysAgo),
    };
  };
  // Ray segue
  mk("f1", "u0", "u_marco", 210);
  mk("f2", "u0", "u_anna", 180);
  mk("f3", "u0", "u_giulia", 160);
  mk("f4", "u0", "u_davide", 140);
  mk("f5", "u0", "u_sofia", 120);
  mk("f6", "u0", "u_fede", 90);
  // Seguono Ray
  mk("f7",  "u_marco",   "u0", 215);
  mk("f8",  "u_giulia",  "u0", 165);
  mk("f9",  "u_luca",    "u0", 150);
  mk("f10", "u_dani",    "u0", 140);
  mk("f11", "u_sara",    "u0", 120);
  mk("f12", "u_paolo",   "u0", 110);
  mk("f13", "u_anna",    "u0",  95);
  mk("f14", "u_sofia",   "u0",  70);
  return out;
}

export function seedSafetyContacts(): Record<UUID, SafetyContact> {
  return {
    sc1: { id: "sc1", ownerId: "u0", name: "Mamma", phone: "+393471112233", notifyEnabled: true },
    sc2: { id: "sc2", ownerId: "u0", name: "Fratello", phone: "+393478889900", notifyEnabled: true },
    sc3: { id: "sc3", ownerId: "u0", name: "Lollo", phone: "+393331234567", email: "lollo@example.com", notifyEnabled: false },
  };
}

export function seedNotifications(): Record<UUID, Notification> {
  const out: Record<UUID, Notification> = {};
  const mk = (
    id: string,
    kind: Notification["kind"],
    title: string,
    body: string,
    hoursAgo: number,
    unread: boolean,
    linkScreen?: string,
    linkEntityId?: UUID,
  ) => {
    out[id] = {
      id,
      userId: "u0",
      kind,
      title,
      body,
      createdAt: addHours(NOW, -hoursAgo),
      readAt: unread ? undefined : addHours(NOW, -hoursAgo + 0.5),
      linkScreen,
      linkEntityId,
    };
  };
  mk("n1", "ride_reminder",  "Tra 2 giorni: Colazione in Franciacorta", "Conferma la partecipazione con il gruppo Amici.", 3, true, "gruppo.home");
  mk("n2", "like",           "Marco ha messo like", "Sul tuo percorso \"Passo del Tonale, sunrise\".", 8, true, "mondo.feed");
  mk("n3", "comment",        "Giulia ha commentato", "\"Che foto alle 6 del mattino!\"", 14, false, "mondo.feed");
  mk("n4", "follow",         "Sofia ti segue", "Ora segue le tue uscite pubbliche.", 28, false, "profilo");
  mk("n5", "ride_confirmed", "Uscita confermata", "Passo del Tonale, sunrise — sabato 02 maggio.", 48, false, "gruppo.home");
  mk("n6", "badge_earned",   "Badge: Weekend warrior", "Hai completato 4 weekend consecutivi in sella.", 72, false, "mondo.classifica");
  mk("n7", "like",           "3 like al tuo percorso", "Notturna dei laghi ha ricevuto altri like.", 96, false, "mondo.feed");
  mk("n8", "comment",        "Anna ha risposto", "\"Bellissimo, la prossima veniamo anche noi.\"", 150, false, "mondo.feed");
  return out;
}
