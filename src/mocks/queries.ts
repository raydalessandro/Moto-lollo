/**
 * Accessor functions for the in-memory DB.
 *
 * All reads go through this module — screens never import the tables
 * directly. This keeps every screen one find/replace away from being wired
 * to Supabase later on.
 */

import type {
  Profile,
  Motorcycle,
  MaintenanceRecord,
  Document,
  Activity,
  ActivityMedia,
  PlannedRoute,
  Group,
  GroupMembership,
  GroupMembershipRequest,
  GroupRide,
  GroupRideRSVP,
  RouteProposal,
  RideBoardComment,
  PublishedRoute,
  PublishedRouteScope,
  RouteComment,
  RouteLike,
  SavedRoute,
  FollowRelationship,
  PublicEvent,
  EventRSVP,
  Badge,
  UserBadge,
  SafetyContact,
  LiveSession,
  Notification,
  UUID,
} from "@/types/domain";
import type { Db } from "./db";

// ─── Profile ────────────────────────────────────────────────────────────────

export function getProfile(db: Db, userId: UUID): Profile | undefined {
  return db.profiles[userId];
}

export function requireProfile(db: Db, userId: UUID): Profile {
  const p = db.profiles[userId];
  if (!p) throw new Error(`Profile ${userId} not found`);
  return p;
}

export function getMyPreferences(db: Db, userId: UUID) {
  return db.userPreferences[userId];
}

// ─── Garage ─────────────────────────────────────────────────────────────────

export function listMyMotorcycles(db: Db, userId: UUID): Motorcycle[] {
  return Object.values(db.motorcycles).filter((m) => m.ownerId === userId);
}

export function getPrimaryMotorcycle(db: Db, userId: UUID): Motorcycle | undefined {
  return listMyMotorcycles(db, userId).find((m) => m.isPrimary);
}

export function getMotorcycle(db: Db, id: UUID): Motorcycle | undefined {
  return db.motorcycles[id];
}

export function listMaintenanceForBike(db: Db, motorcycleId: UUID): MaintenanceRecord[] {
  return Object.values(db.maintenanceRecords)
    .filter((m) => m.motorcycleId === motorcycleId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function listMyDocuments(db: Db, userId: UUID): Document[] {
  return Object.values(db.documents)
    .filter((d) => d.ownerId === userId)
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
}

// ─── Activities ───────────────────────────────────────────────────────────────

export function listMyActivities(db: Db, userId: UUID): Activity[] {
  return Object.values(db.activities)
    .filter((a) => a.ownerId === userId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function getActivity(db: Db, id: UUID): Activity | undefined {
  return db.activities[id];
}

export function getLastActivity(db: Db, userId: UUID): Activity | undefined {
  return listMyActivities(db, userId)[0];
}

export function listActivityMedia(db: Db, activityId: UUID): ActivityMedia[] {
  return Object.values(db.activityMedia)
    .filter((m) => m.activityId === activityId)
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
}

// ─── Planned routes ──────────────────────────────────────────────────────────────

export function listMyPlannedRoutes(db: Db, userId: UUID): PlannedRoute[] {
  return Object.values(db.plannedRoutes)
    .filter((p) => p.ownerId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getPlannedRoute(db: Db, id: UUID): PlannedRoute | undefined {
  return db.plannedRoutes[id];
}

// ─── Groups ─────────────────────────────────────────────────────────────────

export function listAllGroups(db: Db): Group[] {
  return Object.values(db.groups);
}

export function listMyGroups(db: Db, userId: UUID): Group[] {
  const myMemberships = Object.values(db.groupMemberships).filter(
    (m) => m.userId === userId,
  );
  const ids = new Set(myMemberships.map((m) => m.groupId));
  return Object.values(db.groups).filter((g) => ids.has(g.id));
}

export function getGroup(db: Db, id: UUID): Group | undefined {
  return db.groups[id];
}

export function listGroupMembers(db: Db, groupId: UUID): Array<{ profile: Profile; role: GroupMembership["role"] }> {
  return Object.values(db.groupMemberships)
    .filter((m) => m.groupId === groupId)
    .map((m) => ({
      profile: db.profiles[m.userId],
      role: m.role,
    }))
    .filter((x) => !!x.profile);
}

export function listGroupRides(db: Db, groupId: UUID): GroupRide[] {
  return Object.values(db.groupRides)
    .filter((r) => r.groupId === groupId)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function listUpcomingGroupRides(db: Db, groupId: UUID, nowIso: string): GroupRide[] {
  return listGroupRides(db, groupId).filter(
    (r) => r.startAt >= nowIso && r.status !== "annullata" && r.status !== "completata",
  );
}

export function listPastGroupRides(db: Db, groupId: UUID, nowIso: string): GroupRide[] {
  return listGroupRides(db, groupId)
    .filter((r) => r.startAt < nowIso || r.status === "completata" || r.status === "annullata")
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
}

export function getNextConfirmedRide(db: Db, groupId: UUID, nowIso: string): GroupRide | undefined {
  return listUpcomingGroupRides(db, groupId, nowIso).find(
    (r) => r.status === "confermata",
  );
}

export function listRideRSVPs(db: Db, groupRideId: UUID): GroupRideRSVP[] {
  return Object.values(db.groupRideRSVPs).filter((r) => r.groupRideId === groupRideId);
}

export function getMyRideRSVP(
  db: Db,
  groupRideId: UUID,
  userId: UUID,
): GroupRideRSVP | undefined {
  return Object.values(db.groupRideRSVPs).find(
    (r) => r.groupRideId === groupRideId && r.userId === userId,
  );
}

export function listUpcomingRidesFor(
  db: Db,
  userId: UUID,
  nowIso: string,
  limit = 5,
): Array<{ ride: GroupRide; group: Group | undefined }> {
  const myGroupIds = new Set(listMyGroups(db, userId).map((g) => g.id));
  return Object.values(db.groupRides)
    .filter(
      (r) =>
        myGroupIds.has(r.groupId) &&
        r.startAt >= nowIso &&
        r.status !== "annullata" &&
        r.status !== "completata",
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, limit)
    .map((ride) => ({ ride, group: db.groups[ride.groupId] }));
}

// ─── Community ──────────────────────────────────────────────────────────────

export function listPublishedRoutes(db: Db): PublishedRoute[] {
  return Object.values(db.publishedRoutes).sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}

export function listFeedFor(
  db: Db,
  userId: UUID,
  filter: "following" | "all" = "following",
): PublishedRoute[] {
  if (filter === "all") return listPublishedRoutes(db);
  const following = new Set(
    Object.values(db.followRelationships)
      .filter((f) => f.followerId === userId)
      .map((f) => f.followedId),
  );
  following.add(userId);
  return listPublishedRoutes(db).filter((p) => following.has(p.ownerId));
}

export function getPublishedRoute(db: Db, id: UUID): PublishedRoute | undefined {
  return db.publishedRoutes[id];
}

export function listCommentsFor(
  db: Db,
  publishedRouteId: UUID,
): RouteComment[] {
  return Object.values(db.routeComments)
    .filter((c) => c.publishedRouteId === publishedRouteId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function listLikesFor(
  db: Db,
  publishedRouteId: UUID,
): RouteLike[] {
  return Object.values(db.routeLikes).filter(
    (l) => l.publishedRouteId === publishedRouteId,
  );
}

export function countLikes(db: Db, publishedRouteId: UUID): number {
  return listLikesFor(db, publishedRouteId).length;
}

export function hasLiked(db: Db, publishedRouteId: UUID, userId: UUID): boolean {
  return !!Object.values(db.routeLikes).find(
    (l) => l.publishedRouteId === publishedRouteId && l.userId === userId,
  );
}

export function listFollowers(db: Db, userId: UUID): FollowRelationship[] {
  return Object.values(db.followRelationships).filter(
    (f) => f.followedId === userId,
  );
}

export function listFollowing(db: Db, userId: UUID): FollowRelationship[] {
  return Object.values(db.followRelationships).filter(
    (f) => f.followerId === userId,
  );
}

export function isFollowing(db: Db, followerId: UUID, followedId: UUID): boolean {
  return !!Object.values(db.followRelationships).find(
    (f) => f.followerId === followerId && f.followedId === followedId,
  );
}

// ─── Events ─────────────────────────────────────────────────────────────────

export function listEvents(
  db: Db,
  options: { nowIso?: string; timeframe?: "upcoming" | "past" | "all" } = {},
): PublicEvent[] {
  const all = Object.values(db.events).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const { nowIso, timeframe = "all" } = options;
  if (!nowIso || timeframe === "all") return all;
  if (timeframe === "upcoming") return all.filter((e) => e.startAt >= nowIso);
  return all.filter((e) => e.startAt < nowIso).reverse();
}

export function getEvent(db: Db, id: UUID): PublicEvent | undefined {
  return db.events[id];
}

export function listEventRSVPs(db: Db, eventId: UUID): EventRSVP[] {
  return Object.values(db.eventRSVPs).filter((r) => r.eventId === eventId);
}

export function getMyEventRSVP(
  db: Db,
  eventId: UUID,
  userId: UUID,
): EventRSVP | undefined {
  return Object.values(db.eventRSVPs).find(
    (r) => r.eventId === eventId && r.userId === userId,
  );
}

// ─── Badges ─────────────────────────────────────────────────────────────────

export function listAllBadges(db: Db): Badge[] {
  return Object.values(db.badges);
}

export function listUserBadges(db: Db, userId: UUID): Array<{ badge: Badge; earnedAt: string }> {
  return Object.values(db.userBadges)
    .filter((ub) => ub.userId === userId)
    .map((ub) => ({ badge: db.badges[ub.badgeId], earnedAt: ub.earnedAt }))
    .filter((x) => !!x.badge)
    .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt));
}

// ─── Safety ─────────────────────────────────────────────────────────────────

export function listSafetyContacts(db: Db, userId: UUID): SafetyContact[] {
  return Object.values(db.safetyContacts).filter((c) => c.ownerId === userId);
}

export function listActiveLiveSessions(db: Db): LiveSession[] {
  return Object.values(db.liveSessions).filter((l) => l.state === "active");
}

// ─── Notifications ───────────────────────────────────────────────────────────

export function listNotifications(db: Db, userId: UUID): Notification[] {
  return Object.values(db.notifications)
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function countUnreadNotifications(db: Db, userId: UUID): number {
  return listNotifications(db, userId).filter((n) => !n.readAt).length;
}

// ─── Moderation: proposals, requests, board, saved routes ──────────────

export function isAdminOfGroup(db: Db, userId: UUID, groupId: UUID): boolean {
  return Object.values(db.groupMemberships).some(
    (m) =>
      m.userId === userId &&
      m.groupId === groupId &&
      (m.role === "admin" || m.role === "leader"),
  );
}

export function listGroupsIAdmin(db: Db, userId: UUID): Group[] {
  const adminIds = new Set(
    Object.values(db.groupMemberships)
      .filter(
        (m) =>
          m.userId === userId && (m.role === "admin" || m.role === "leader"),
      )
      .map((m) => m.groupId),
  );
  return Object.values(db.groups).filter((g) => adminIds.has(g.id));
}

export function listOtherGroups(db: Db, userId: UUID): Group[] {
  const myIds = new Set(
    Object.values(db.groupMemberships)
      .filter((m) => m.userId === userId)
      .map((m) => m.groupId),
  );
  return Object.values(db.groups).filter((g) => !myIds.has(g.id));
}

export function listRouteProposals(
  db: Db,
  groupId: UUID,
  status?: RouteProposal["status"],
): RouteProposal[] {
  return Object.values(db.routeProposals)
    .filter((p) => p.groupId === groupId)
    .filter((p) => !status || p.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listMembershipRequests(
  db: Db,
  groupId: UUID,
  status?: GroupMembershipRequest["status"],
): GroupMembershipRequest[] {
  return Object.values(db.groupMembershipRequests)
    .filter((r) => r.groupId === groupId)
    .filter((r) => !status || r.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listBoardComments(
  db: Db,
  groupRideId: UUID,
): RideBoardComment[] {
  return Object.values(db.rideBoardComments)
    .filter((c) => c.groupRideId === groupRideId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function listSavedRoutes(db: Db, userId: UUID): SavedRoute[] {
  return Object.values(db.savedRoutes)
    .filter((s) => s.ownerId === userId)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function listSavedPublishedRoutes(db: Db, userId: UUID): PublishedRoute[] {
  const saved = listSavedRoutes(db, userId);
  const ids = new Set(saved.map((s) => s.publishedRouteId));
  return Object.values(db.publishedRoutes).filter((p) => ids.has(p.id));
}

export function listPublishedRoutesByScope(
  db: Db,
  scope: PublishedRouteScope,
): PublishedRoute[] {
  return Object.values(db.publishedRoutes)
    .filter((p) => p.scope === scope)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
