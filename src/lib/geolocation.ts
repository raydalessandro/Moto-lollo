"use client";

import { useEffect, useState } from "react";

export interface GeoPoint {
  lat: number;
  lon: number;
  /** Velocità in m/s (può essere null). */
  speed: number | null;
  /** Heading in gradi (può essere null). */
  heading: number | null;
  /** Accuracy in metri. */
  accuracy: number;
  /** Altitudine in metri (può essere null). */
  altitude: number | null;
  /** Timestamp (ms since epoch). */
  t: number;
}

export interface GeoState {
  /** Punto corrente, null se non ancora disponibile. */
  position: GeoPoint | null;
  /** Stato corrente del watch. */
  status: "idle" | "requesting" | "watching" | "denied" | "error" | "unsupported";
  /** Ultimo errore. */
  error: GeolocationPositionError | null;
}

/**
 * `useGeolocation(watching)` — quando `watching` è true, attiva
 * `navigator.geolocation.watchPosition()` e aggiorna lo stato a ogni fix.
 *
 * Tipico uso: in NavigationOverlay quando l'utente preme "Avvia".
 *
 * Note:
 * - Richiede HTTPS (Vercel ce l'ha)
 * - Browser chiede permission alla prima invocazione
 * - Su Safari iOS PWA: limitato a foreground (schermo acceso, app in primo
 *   piano). Per quello serve Wake Lock + accettazione dell'utente.
 */
export function useGeolocation(watching: boolean) {
  const [state, setState] = useState<GeoState>({
    position: null,
    status: "idle",
    error: null,
  });

  useEffect(() => {
    if (!watching) {
      setState((s) => ({ ...s, status: "idle" }));
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !("geolocation" in navigator) ||
      !navigator.geolocation
    ) {
      setState({
        position: null,
        status: "unsupported",
        error: null,
      });
      return;
    }

    setState({ position: null, status: "requesting", error: null });

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          position: {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            t: pos.timestamp,
          },
          status: "watching",
          error: null,
        });
      },
      (err) => {
        setState({
          position: null,
          status: err.code === err.PERMISSION_DENIED ? "denied" : "error",
          error: err,
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [watching]);

  return state;
}

/** Calcola distanza in metri tra 2 punti via Haversine. */
export function haversineMeters(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
