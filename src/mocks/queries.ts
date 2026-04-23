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
  GroupRide,
  GroupRideRSVP,
  PublishedRoute,
  RouteComment,
  RouteLike,
  FollowRelationship,
  PublicEvent,
  EventRSVP,
  Segment,
  SegmentAttempt,
  Badge,
  UserBadge,
  Challenge,
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

// ─── Activities ─────────────────────────────────────────────────────────────

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

// ─── Planned routes ─────────────────────────────────────────────────────────

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

// ─── Classifica ─────────────────────────────────────────────────────────────

export function listSegments(db: Db): Segment[] {
  return Object.values(db.segments);
}

export function getSegment(db: Db, id: UUID): Segment | undefined {
  return db.segments[id];
}

export interface LeaderboardEntry {
  rank: number;
  profile: Profile | undefined;
  attempt: SegmentAttempt;
}

export function listLeaderboardFor(
  db: Db,
  segmentId: UUID,
  limit = 10,
): LeaderboardEntry[] {
  const attempts = Object.values(db.segmentAttempts)
    .filter((a) => a.segmentId === segmentId)
    .sort((a, b) => a.durationSeconds - b.durationSeconds);
  // keep only each user's best attempt
  const bestByUser = new Map<UUID, SegmentAttempt>();
  for (const a of attempts) {
    if (!bestByUser.has(a.userId)) bestByUser.set(a.userId, a);
  }
  return [...bestByUser.values()]
    .slice(0, limit)
    .map((attempt, i) => ({
      rank: i + 1,
      profile: db.profiles[attempt.userId],
      attempt,
    }));
}

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

export function listActiveChallenges(db: Db, nowIso: string): Challenge[] {
  return Object.values(db.challenges).filter(
    (c) => c.startAt <= nowIso && c.endAt >= nowIso,
  );
}

// ─── Safety ─────────────────────────────────────────────────────────────────

export function listSafetyContacts(db: Db, userId: UUID): SafetyContact[] {
  return Object.values(db.safetyContacts).filter((c) => c.ownerId === userId);
}

export function listActiveLiveSessions(db: Db): LiveSession[] {
  return Object.values(db.liveSessions).filter((l) => l.state === "active");
}

// ─── Notifications ──────────────────────────────────────────────────────────

export function listNotifications(db: Db, userId: UUID): Notification[] {
  return Object.values(db.notifications)
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function countUnreadNotifications(db: Db, userId: UUID): number {
  return listNotifications(db, userId).filter((n) => !n.readAt).length;
}
