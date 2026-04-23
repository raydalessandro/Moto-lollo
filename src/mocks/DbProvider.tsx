"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  RSVPValue,
  UUID,
} from "@/types/domain";
import { seedDb, type Db } from "./db";

// The "today" of the prototype — every query that filters on time uses this
// so refreshes are reproducible.
export const NOW_ISO = "2026-04-23T10:00:00Z";

interface DbContextValue {
  db: Db;
  currentUserId: UUID;
  now: string;
  /** Toggle like on a published route. Optimistic — mutates the store. */
  toggleLike: (publishedRouteId: UUID) => void;
  /** Set the RSVP of the current user for a group ride. */
  setMyRSVP: (groupRideId: UUID, value: RSVPValue) => void;
  /** Mark a motorcycle as the user's primary (at most one per owner). */
  setPrimaryMotorcycle: (motorcycleId: UUID) => void;
  /** Mark all notifications as read. */
  markAllNotificationsRead: () => void;
}

const DbContext = createContext<DbContextValue | null>(null);

interface DbProviderProps {
  children: ReactNode;
  /** Override the seed (useful for tests). */
  initialDb?: Db;
  /** Override the current user (rarely needed). */
  currentUserId?: UUID;
}

export function DbProvider({
  children,
  initialDb,
  currentUserId = "u0",
}: DbProviderProps) {
  const [db, setDb] = useState<Db>(() => initialDb ?? seedDb());

  const nextId = useCallback((prefix: string) => {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  const toggleLike = useCallback(
    (publishedRouteId: UUID) => {
      setDb((prev) => {
        const existing = Object.values(prev.routeLikes).find(
          (l) => l.publishedRouteId === publishedRouteId && l.userId === currentUserId,
        );
        const nextLikes = { ...prev.routeLikes };
        if (existing) {
          delete nextLikes[existing.id];
        } else {
          const id = nextId("lk");
          nextLikes[id] = {
            id,
            publishedRouteId,
            userId: currentUserId,
            createdAt: new Date().toISOString(),
          };
        }
        return { ...prev, routeLikes: nextLikes };
      });
    },
    [currentUserId, nextId],
  );

  const setMyRSVP = useCallback(
    (groupRideId: UUID, value: RSVPValue) => {
      setDb((prev) => {
        const existing = Object.values(prev.groupRideRSVPs).find(
          (r) => r.groupRideId === groupRideId && r.userId === currentUserId,
        );
        const nextRsvps = { ...prev.groupRideRSVPs };
        if (existing) {
          nextRsvps[existing.id] = { ...existing, value, respondedAt: new Date().toISOString() };
        } else {
          const id = nextId("rsvp");
          nextRsvps[id] = {
            id,
            groupRideId,
            userId: currentUserId,
            value,
            respondedAt: new Date().toISOString(),
          };
        }
        // Update denormalized counters on the ride.
        const ride = prev.groupRides[groupRideId];
        const rsvpsForRide = Object.values(nextRsvps).filter(
          (r) => r.groupRideId === groupRideId,
        );
        const confirmedCount = rsvpsForRide.filter((r) => r.value === "going").length;
        const nextRides = {
          ...prev.groupRides,
          [groupRideId]: ride ? { ...ride, confirmedCount } : ride,
        };
        return { ...prev, groupRideRSVPs: nextRsvps, groupRides: nextRides };
      });
    },
    [currentUserId, nextId],
  );

  const setPrimaryMotorcycle = useCallback(
    (motorcycleId: UUID) => {
      setDb((prev) => {
        const moto = prev.motorcycles[motorcycleId];
        if (!moto) return prev;
        const owner = moto.ownerId;
        const nextBikes = { ...prev.motorcycles };
        for (const b of Object.values(prev.motorcycles)) {
          if (b.ownerId === owner) {
            nextBikes[b.id] = { ...b, isPrimary: b.id === motorcycleId };
          }
        }
        return { ...prev, motorcycles: nextBikes };
      });
    },
    [],
  );

  const markAllNotificationsRead = useCallback(() => {
    setDb((prev) => {
      const next = { ...prev.notifications };
      const readAt = new Date().toISOString();
      for (const n of Object.values(prev.notifications)) {
        if (n.userId === currentUserId && !n.readAt) {
          next[n.id] = { ...n, readAt };
        }
      }
      return { ...prev, notifications: next };
    });
  }, [currentUserId]);

  const value = useMemo<DbContextValue>(
    () => ({
      db,
      currentUserId,
      now: NOW_ISO,
      toggleLike,
      setMyRSVP,
      setPrimaryMotorcycle,
      markAllNotificationsRead,
    }),
    [db, currentUserId, toggleLike, setMyRSVP, setPrimaryMotorcycle, markAllNotificationsRead],
  );

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb(): DbContextValue {
  const ctx = useContext(DbContext);
  if (!ctx) {
    throw new Error("useDb must be used inside <DbProvider>");
  }
  return ctx;
}

/**
 * Helper hook that runs a memoized selector over the current DB.
 *
 * Usage:
 *   const myBikes = useQuery((db, userId) => listMyMotorcycles(db, userId));
 */
export function useQuery<T>(
  selector: (db: Db, userId: UUID, now: string) => T,
): T {
  const { db, currentUserId, now } = useDb();
  return useMemo(() => selector(db, currentUserId, now), [db, currentUserId, now, selector]);
}
