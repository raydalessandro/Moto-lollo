/**
 * Domain model of Moto App.
 *
 * Types below are the single source of truth for what the frontend assumes
 * about data shapes. They are designed so that the in-memory mock DB, the
 * Supabase schema (when we build it), and a future Flutter port can all line
 * up on them without translation.
 *
 * Naming conventions:
 * - All IDs are `UUID` strings.
 * - Timestamps are `ISODate` strings.
 * - Foreign keys are named `<entity>Id`.
 * - Soft-deletable entities expose an optional `deletedAt`.
 * - Server-managed fields (`version`, server `id`) are not modeled here while
 *   we're in prototype phase; we'll lift them in when wiring Supabase.
 */

export type UUID = string;
export type ISODate = string;

export type Visibility = "private" | "followers" | "public";
export type UserRole = "user" | "admin";

// ─── Profile ────────────────────────────────────────────────────────────────

export interface Profile {
  id: UUID;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  initials: string;
  accentColor?: string;
  role: UserRole;
  isPublic: boolean;
  city?: string;
  createdAt: ISODate;
}

export interface UserPreferences {
  userId: UUID;
  theme: "light" | "dark" | "auto";
  language: "it" | "en";
  units: "metric" | "imperial";
  notificationsEnabled: boolean;
  defaultActivityVisibility: Visibility;
  autoSyncEnabled: boolean;
}

// ─── Garage ─────────────────────────────────────────────────────────────────

export interface Motorcycle {
  id: UUID;
  ownerId: UUID;
  name: string;
  brand: string;
  model: string;
  year?: number;
  engineCc?: number;
  color?: string;
  photoUrl?: string;
  totalKm: number;
  isPrimary: boolean;
  purchasedAt?: ISODate;
}

export interface MaintenanceRecord {
  id: UUID;
  motorcycleId: UUID;
  kind: "tagliando" | "gomme" | "catena" | "pastiglie" | "olio" | "altro";
  date: ISODate;
  kmAtService: number;
  notes?: string;
  costEur?: number;
}

export type DocumentKind = "assicurazione" | "bollo" | "revisione" | "patente";

export interface Document {
  id: UUID;
  ownerId: UUID;
  motorcycleId?: UUID;
  kind: DocumentKind;
  expiresAt: ISODate;
  notes?: string;
}

// ─── Tracking / Activities ──────────────────────────────────────────────────

export interface TrackPoint {
  t: number;
  lat: number;
  lon: number;
  speed?: number;
  ele?: number;
  acc?: number;
}

export interface Activity {
  id: UUID;
  ownerId: UUID;
  motorcycleId?: UUID;
  groupRideId?: UUID;
  startedAt: ISODate;
  endedAt: ISODate;
  durationSeconds: number;
  distanceKm: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  elevationGainM?: number;
  polylineSeed?: number;
  trackPoints?: TrackPoint[];
  title: string;
  notes?: string;
  tags: string[];
  visibility: Visibility;
  mediaIds: UUID[];
  publishedRouteId?: UUID;
}

export interface ActivityMedia {
  id: UUID;
  activityId: UUID;
  storageUrl: string;
  caption?: string;
  takenAt: ISODate;
  status: "uploaded" | "uploading" | "failed";
}

// ─── Planning ───────────────────────────────────────────────────────────────

export interface Waypoint {
  lat: number;
  lon: number;
  label?: string;
}

export interface PlannedRoute {
  id: UUID;
  ownerId: UUID;
  title: string;
  notes?: string;
  waypoints: Waypoint[];
  polylineSeed?: number;
  distanceKm: number;
  estimatedDurationMin: number;
  visibility: Visibility;
  tags: string[];
  createdAt: ISODate;
}

// ─── Groups ─────────────────────────────────────────────────────────────────

export interface Group {
  id: UUID;
  slug: string;
  name: string;
  tag: string;
  crestColor: string;
  description?: string;
  membersCount: number;
  foundedAt: ISODate;
}

export interface GroupMembership {
  id: UUID;
  groupId: UUID;
  userId: UUID;
  role: "leader" | "admin" | "member";
  joinedAt: ISODate;
}

export type GroupRideStatus =
  | "proposta"
  | "confermata"
  | "in-corso"
  | "completata"
  | "annullata";

export interface GroupRide {
  id: UUID;
  groupId: UUID;
  plannedRouteId?: UUID;
  title: string;
  meetupText: string;
  startAt: ISODate;
  distanceKm: number;
  estimatedDurationMin: number;
  status: GroupRideStatus;
  proposedBy: UUID;
  activityIds: UUID[];
  /** Denormalized counts, kept on the ride for fast list rendering. */
  invitedCount: number;
  confirmedCount: number;
}

export type RSVPValue = "going" | "maybe" | "no";

export interface GroupRideRSVP {
  id: UUID;
  groupRideId: UUID;
  userId: UUID;
  value: RSVPValue;
  respondedAt: ISODate;
}

// ─── Community ──────────────────────────────────────────────────────────────

export type PublishedRouteSource = "activity" | "planned_route";

export interface PublishedRoute {
  id: UUID;
  sourceType: PublishedRouteSource;
  sourceId: UUID;
  ownerId: UUID;
  title: string;
  coverText?: string;
  heroColor?: string;
  distanceKm: number;
  durationMin?: number;
  area?: string;
  tags: string[];
  publishedAt: ISODate;
}

export interface RouteComment {
  id: UUID;
  publishedRouteId: UUID;
  authorId: UUID;
  text: string;
  createdAt: ISODate;
}

export interface RouteLike {
  id: UUID;
  publishedRouteId: UUID;
  userId: UUID;
  createdAt: ISODate;
}

export interface FollowRelationship {
  id: UUID;
  followerId: UUID;
  followedId: UUID;
  createdAt: ISODate;
}

// ─── Events ─────────────────────────────────────────────────────────────────

export type EventKind = "raduno" | "track_day" | "viaggio" | "corso" | "fiera";

export interface PublicEvent {
  id: UUID;
  kind: EventKind;
  title: string;
  description: string;
  organizerId: UUID;
  location: string;
  startAt: ISODate;
  endAt?: ISODate;
  coverHue: number;
  attendeesCount: number;
}

export interface EventRSVP {
  id: UUID;
  eventId: UUID;
  userId: UUID;
  value: "interested" | "going";
  respondedAt: ISODate;
}

// ─── Classifica / Segments ──────────────────────────────────────────────────

export interface Segment {
  id: UUID;
  title: string;
  area: string;
  distanceKm: number;
  elevationGainM: number;
  surface: "asfalto" | "misto" | "sterrato";
  createdAt: ISODate;
}

export interface SegmentAttempt {
  id: UUID;
  segmentId: UUID;
  userId: UUID;
  activityId: UUID;
  durationSeconds: number;
  attemptedAt: ISODate;
}

export interface Badge {
  id: UUID;
  slug: string;
  title: string;
  description: string;
  iconGlyph: string;
  accentColor: string;
}

export interface UserBadge {
  id: UUID;
  userId: UUID;
  badgeId: UUID;
  earnedAt: ISODate;
}

export interface Challenge {
  id: UUID;
  title: string;
  description: string;
  startAt: ISODate;
  endAt: ISODate;
  targetKm?: number;
  targetElevationM?: number;
  participantsCount: number;
}

// ─── Safety ─────────────────────────────────────────────────────────────────

export interface SafetyContact {
  id: UUID;
  ownerId: UUID;
  name: string;
  phone?: string;
  email?: string;
  notifyEnabled: boolean;
}

export interface LiveSession {
  id: UUID;
  ownerId: UUID;
  groupId?: UUID;
  activityId: UUID;
  title?: string;
  startedAt: ISODate;
  endedAt?: ISODate;
  state: "active" | "ended_normal" | "ended_timeout" | "ended_by_leader";
  shareToken: string;
}

// ─── Notifications ──────────────────────────────────────────────────────────

export type NotificationKind =
  | "like"
  | "comment"
  | "follow"
  | "ride_confirmed"
  | "ride_reminder"
  | "safety_alert"
  | "badge_earned";

export interface Notification {
  id: UUID;
  userId: UUID;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: ISODate;
  readAt?: ISODate;
  linkScreen?: string;
  linkEntityId?: UUID;
}
