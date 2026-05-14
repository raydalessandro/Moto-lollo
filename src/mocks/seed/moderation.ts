import type {
  SavedRoute,
  RouteProposal,
  GroupMembershipRequest,
  RideBoardComment,
  UUID,
} from "@/types/domain";
import { addDays, addHours } from "../rng";
import { NOW } from "./people";

// ─── SavedRoute ─────────────────────────────────────────────────────────────
// Routes Ray saved from MONDO feed → end up in his io.mappa archive.

export function seedSavedRoutes(): Record<UUID, SavedRoute> {
  const out: Record<UUID, SavedRoute> = {};
  const mk = (id: string, pubId: UUID, daysAgo: number, note?: string) => {
    out[id] = {
      id,
      ownerId: "u0",
      publishedRouteId: pubId,
      savedAt: addDays(NOW, -daysAgo),
      note,
    };
  };
  mk("sv1", "pub5", 1,  "Cordata Marco, vedere se replicare in coppia.");
  mk("sv2", "pub6", 5,  "Lungo raggio nord, magari weekend lungo a luglio.");
  mk("sv3", "pub7", 3);
  mk("sv4", "pub8", 9,  "Sterrato di Davide. Servono Tubeless.");
  return out;
}

// ─── RouteProposal ──────────────────────────────────────────────────────────
// Members propose one of their planned routes; the admin approves/rejects.

export function seedRouteProposals(): Record<UUID, RouteProposal> {
  const out: Record<UUID, RouteProposal> = {};
  const mk = (
    id: string,
    groupId: UUID,
    proposedBy: UUID,
    plannedRouteId: UUID,
    daysAgo: number,
    status: RouteProposal["status"],
    note?: string,
    reviewedBy?: UUID,
  ) => {
    out[id] = {
      id,
      groupId,
      proposedBy,
      plannedRouteId,
      status,
      reviewedBy,
      reviewedAt: status === "pending" ? undefined : addDays(NOW, -daysAgo + 1),
      note,
      createdAt: addDays(NOW, -daysAgo),
    };
  };
  // Ray proposes the Stelvio loop to Moto Garda — still waiting.
  mk("rp1", "g1", "u0",       "pr1", 2, "pending", "Curve pulite, partenza Bormio. Si fa in giornata.");
  // Giulia proposes a sunset Tonale — approved last week.
  mk("rp2", "g1", "u_giulia", "pr2", 7, "approved", "Tramonto sopra il Tonale.", "u_marco");
  // Sara proposes the urban nighttime loop — rejected, troppo cittadino.
  mk("rp3", "g1", "u_sara",   "pr5", 12, "rejected", "Troppo cittadino per il gruppo, riproviamo a settembre.", "u_marco");
  // Ray proposes Iseo costa ovest to Amici — pending.
  mk("rp4", "g4", "u0",       "pr4", 1, "pending", "Colazione + giro Iseo, domenica mattina lenta.");
  return out;
}

// ─── GroupMembershipRequest ─────────────────────────────────────────────────
// Pending join requests visible to the admin.

export function seedMembershipRequests(): Record<UUID, GroupMembershipRequest> {
  const out: Record<UUID, GroupMembershipRequest> = {};
  const mk = (
    id: string,
    groupId: UUID,
    userId: UUID,
    daysAgo: number,
    status: GroupMembershipRequest["status"],
    reviewedBy?: UUID,
  ) => {
    out[id] = {
      id,
      groupId,
      userId,
      status,
      reviewedBy,
      reviewedAt: status === "pending" ? undefined : addDays(NOW, -daysAgo + 1),
      createdAt: addDays(NOW, -daysAgo),
    };
  };
  // Two riders ask to join Moto Garda — Ray will see them as admin (Step 7).
  mk("mr1", "g1", "u_loris",  3, "pending");
  mk("mr2", "g1", "u_max",    2, "pending");
  // Sofia's old request to join Garda — approved.
  mk("mr3", "g1", "u_sofia", 90, "approved", "u_marco");
  return out;
}

// ─── RideBoardComment ───────────────────────────────────────────────────────
// Comments on the bacheca of a group ride (visible only to members).

export function seedRideBoardComments(): Record<UUID, RideBoardComment> {
  const out: Record<UUID, RideBoardComment> = {};
  const mk = (id: string, groupRideId: UUID, authorId: UUID, hoursAgo: number, text: string) => {
    out[id] = {
      id,
      groupRideId,
      authorId,
      text,
      createdAt: addHours(NOW, -hoursAgo),
    };
  };
  // Bacheca della prossima Tonale sunrise di Moto Garda
  mk("rbc1", "r1", "u_marco",  72, "Partenza 6:00 in punto, bar Aquila. Pieno fatto la sera prima.");
  mk("rbc2", "r1", "u0",       60, "Io porto la camera per le foto al passo.");
  mk("rbc3", "r1", "u_giulia", 48, "Casco intercom, mi colleghiamo in 4?");
  mk("rbc4", "r1", "u_luca",   24, "Se piove ci risentiamo entro le 22.");
  // Notturna laghi — meno gente
  mk("rbc5", "r3", "u_giulia", 90, "Idea: chiudiamo con birra a Lazise.");
  mk("rbc6", "r3", "u0",       80, "Per me ok, mi porto la GoPro.");
  // Track day Mugello — domande logistiche
  mk("rbc7", "r6", "u_loris",  36, "Gomme: chi viene gomme da pista o stradali?");
  mk("rbc8", "r6", "u_fede",   30, "Stradali bastano, dirò turni open mattina.");
  // Colazione Franciacorta — più informale
  mk("rbc9", "r7", "u_dani",   18, "Bar Centrale conferma tavolo per 4.");
  return out;
}
