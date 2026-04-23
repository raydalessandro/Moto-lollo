/**
 * Domain types aligned with the spec's data model.
 * Fields that only exist server-side (version, deletedAt, server id) are kept
 * optional so the same types can be reused when we wire Supabase later.
 */

export type UUID = string;
export type ISODate = string;

export type Visibility = "private" | "followers" | "public";
export type UserRole = "user" | "admin";

export interface Profile {
  id: UUID;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  role: UserRole;
  isPublic: boolean;
  createdAt: ISODate;
}

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
}

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
  startedAt: ISODate;
  endedAt: ISODate;
  durationSeconds: number;
  distanceKm: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  elevationGainM?: number;
  polylineEncoded?: string;
  trackPoints?: TrackPoint[];
  title: string;
  notes?: string;
  tags: string[];
  visibility: Visibility;
  mediaUrls: string[];
}

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
  polylineEncoded?: string;
  distanceKm: number;
  estimatedDurationMin: number;
  visibility: Visibility;
  createdAt: ISODate;
}

export interface PublishedRoute {
  id: UUID;
  sourceType: "activity" | "planned_route";
  sourceId: UUID;
  ownerId: UUID;
  title: string;
  coverText?: string;
  likesCount: number;
  commentsCount: number;
  publishedAt: ISODate;
}

export interface Comment {
  id: UUID;
  publishedRouteId: UUID;
  authorId: UUID;
  text: string;
  createdAt: ISODate;
}

export interface Group {
  id: UUID;
  slug: string;
  name: string;
  crestColor: string;
  membersCount: number;
  isMember: boolean;
}

export interface GroupRide {
  id: UUID;
  groupId: UUID;
  title: string;
  meetupText: string;
  startAt: ISODate;
  distanceKm: number;
  confirmed: number;
  total: number;
  status: "proposta" | "confermata" | "in-corso" | "completata";
}

export interface SafetyContact {
  id: UUID;
  name: string;
  phone?: string;
  email?: string;
  notifyEnabled: boolean;
}

export interface LiveSession {
  id: UUID;
  ownerId: UUID;
  activityId: UUID;
  title?: string;
  startedAt: ISODate;
  endedAt?: ISODate;
  state: "active" | "ended_normal" | "ended_timeout" | "ended_by_leader";
  shareToken: string;
}
