import type {
  Profile,
  UserPreferences,
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
  RouteComment,
  RouteLike,
  SavedRoute,
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

import {
  seedProfiles,
  seedPreferences,
  seedFollows,
  seedSafetyContacts,
  seedNotifications,
} from "./seed/people";
import {
  seedMotorcycles,
  seedMaintenance,
  seedDocuments,
} from "./seed/garage";
import {
  seedActivities,
  seedActivityMedia,
  seedPlannedRoutes,
} from "./seed/rides";
import {
  seedGroups,
  seedMemberships,
  seedGroupRides,
  seedRSVPs,
  seedLiveSessions,
} from "./seed/gruppi";
import {
  seedPublishedRoutes,
  seedRouteComments,
  seedRouteLikes,
  seedEvents,
  seedEventRSVPs,
  seedSegments,
  seedSegmentAttempts,
  seedBadges,
  seedUserBadges,
  seedChallenges,
} from "./seed/mondo";
import {
  seedSavedRoutes,
  seedRouteProposals,
  seedMembershipRequests,
  seedRideBoardComments,
} from "./seed/moderation";

export interface Db {
  profiles: Record<UUID, Profile>;
  userPreferences: Record<UUID, UserPreferences>;
  motorcycles: Record<UUID, Motorcycle>;
  maintenanceRecords: Record<UUID, MaintenanceRecord>;
  documents: Record<UUID, Document>;
  activities: Record<UUID, Activity>;
  activityMedia: Record<UUID, ActivityMedia>;
  plannedRoutes: Record<UUID, PlannedRoute>;
  groups: Record<UUID, Group>;
  groupMemberships: Record<UUID, GroupMembership>;
  groupMembershipRequests: Record<UUID, GroupMembershipRequest>;
  groupRides: Record<UUID, GroupRide>;
  groupRideRSVPs: Record<UUID, GroupRideRSVP>;
  routeProposals: Record<UUID, RouteProposal>;
  rideBoardComments: Record<UUID, RideBoardComment>;
  publishedRoutes: Record<UUID, PublishedRoute>;
  routeComments: Record<UUID, RouteComment>;
  routeLikes: Record<UUID, RouteLike>;
  savedRoutes: Record<UUID, SavedRoute>;
  followRelationships: Record<UUID, FollowRelationship>;
  events: Record<UUID, PublicEvent>;
  eventRSVPs: Record<UUID, EventRSVP>;
  segments: Record<UUID, Segment>;
  segmentAttempts: Record<UUID, SegmentAttempt>;
  badges: Record<UUID, Badge>;
  userBadges: Record<UUID, UserBadge>;
  challenges: Record<UUID, Challenge>;
  safetyContacts: Record<UUID, SafetyContact>;
  liveSessions: Record<UUID, LiveSession>;
  notifications: Record<UUID, Notification>;
}

export function seedDb(): Db {
  return {
    profiles: seedProfiles(),
    userPreferences: seedPreferences(),
    motorcycles: seedMotorcycles(),
    maintenanceRecords: seedMaintenance(),
    documents: seedDocuments(),
    activities: seedActivities(),
    activityMedia: seedActivityMedia(),
    plannedRoutes: seedPlannedRoutes(),
    groups: seedGroups(),
    groupMemberships: seedMemberships(),
    groupMembershipRequests: seedMembershipRequests(),
    groupRides: seedGroupRides(),
    groupRideRSVPs: seedRSVPs(),
    routeProposals: seedRouteProposals(),
    rideBoardComments: seedRideBoardComments(),
    publishedRoutes: seedPublishedRoutes(),
    routeComments: seedRouteComments(),
    routeLikes: seedRouteLikes(),
    savedRoutes: seedSavedRoutes(),
    followRelationships: seedFollows(),
    events: seedEvents(),
    eventRSVPs: seedEventRSVPs(),
    segments: seedSegments(),
    segmentAttempts: seedSegmentAttempts(),
    badges: seedBadges(),
    userBadges: seedUserBadges(),
    challenges: seedChallenges(),
    safetyContacts: seedSafetyContacts(),
    liveSessions: seedLiveSessions(),
    notifications: seedNotifications(),
  };
}

/** Singleton DB instance for the current session. */
export const db: Db = seedDb();
