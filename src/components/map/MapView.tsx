"use client";

import { useEffect, useRef, useState } from "react";
import { isMapboxConfigured, MAPBOX_TOKEN, MAPBOX_STYLE_DARK } from "@/lib/mapbox";

export interface MapViewProps {
  /** Centro iniziale [lon, lat]. */
  center?: [number, number];
  /** Zoom 0-22. Default 13. */
  zoom?: number;
  /** Posizione corrente utente (cerchio ember). */
  userLocation?: { lat: number; lon: number; heading: number | null };
  /** Polyline del route precomputato (Directions). Disegnato come overlay ember. */
  routePolyline?: string;
  /** Polyline del tracciato live (sovrapposta in tempo reale alla user position). */
  livePolyline?: string;
  /** Destinazione [lon, lat] — flag. */
  destination?: [number, number];
  /** Children sovrapposti (HUD, banner, ecc.). */
  children?: React.ReactNode;
  /** ClassName container. */
  className?: string;
  /** Fallback render quando Mapbox non è configurato. Default: gradient scuro semplice. */
  fallback?: React.ReactNode;
}

/**
 * Mappa interattiva Mapbox GL JS. Se il token non è configurato, renderizza
 * `fallback` (o un placeholder neutro). Lazy-load del modulo `mapbox-gl`
 * via dynamic import per non gonfiare il bundle iniziale.
 *
 * Uso tipico in NavigationOverlay:
 *
 *   <MapView
 *     userLocation={pos ? { lat: pos.lat, lon: pos.lon, heading: pos.heading } : undefined}
 *     livePolyline={livePolyline}
 *   >
 *     <SpeedBubble ... />
 *     <NextManeuverBanner ... />
 *   </MapView>
 */
export function MapView(props: MapViewProps) {
  if (!isMapboxConfigured()) {
    return (
      <div
        className={`relative h-full w-full ${props.className ?? ""}`}
        style={{ background: "radial-gradient(circle at 50% 70%, #14110d 0%, #050403 70%)" }}
      >
        {props.fallback}
        {props.children}
      </div>
    );
  }
  return <LiveMapboxView {...props} />;
}

// ─── Live Mapbox GL JS ──────────────────────────────────────────────────────

function LiveMapboxView({
  center,
  zoom = 13,
  userLocation,
  routePolyline,
  livePolyline,
  destination,
  children,
  className = "",
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Use `unknown` to avoid pulling mapbox-gl types into the static analyzer
  // before dynamic import resolves. We narrow to `any` at runtime usage.
  const mapRef = useRef<unknown>(null);
  const [ready, setReady] = useState(false);

  // Initialize map (one-shot).
  useEffect(() => {
    let cancelled = false;
    let map: unknown;
    (async () => {
      try {
        const mod = await import("mapbox-gl");
        if (cancelled || !containerRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapboxgl = (mod as any).default ?? mod;

        const initialCenter: [number, number] =
          center ?? (userLocation ? [userLocation.lon, userLocation.lat] : [10.0, 45.5]);

        map = new mapboxgl.Map({
          accessToken: MAPBOX_TOKEN,
          container: containerRef.current,
          style: MAPBOX_STYLE_DARK,
          center: initialCenter,
          zoom,
          attributionControl: false,
          pitchWithRotate: false,
        });
        mapRef.current = map;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = map as any;
        m.on("error", (e: { error?: Error }) => {
          console.error("[Mapbox] error:", e?.error?.message ?? e);
        });
        m.on("load", () => {
          if (cancelled) return;
          // Ensure the canvas matches the container size (PWA/standalone
          // sometimes initializes before layout settles).
          m.resize();
          setReady(true);
        });
      } catch (err) {
        console.error("[Mapbox] init failed:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (map) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (map as any).remove();
      }
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-resize when container size changes (PWA orientation, header relayout, ecc.).
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapRef.current as any;
    if (!ready || !map || !containerRef.current) return;
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [ready]);

  // Update user marker.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapRef.current as any;
    if (!ready || !map || !userLocation) return;

    const sourceId = "user-position";
    const layerId = "user-position-dot";
    const data = {
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [userLocation.lon, userLocation.lat],
      },
      properties: {},
    };

    if (map.getSource(sourceId)) {
      map.getSource(sourceId).setData(data);
    } else {
      map.addSource(sourceId, { type: "geojson", data });
      map.addLayer({
        id: `${layerId}-halo`,
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 16,
          "circle-color": "#ff6a1f",
          "circle-opacity": 0.18,
        },
      });
      map.addLayer({
        id: layerId,
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 7,
          "circle-color": "#ff6a1f",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#050403",
        },
      });
    }
  }, [ready, userLocation]);

  // Update route polyline (from Directions).
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapRef.current as any;
    if (!ready || !map) return;

    const sourceId = "route-line";
    const layerId = "route-line-layer";

    if (routePolyline) {
      const coords = decodePolyline(routePolyline);
      const data = {
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: coords },
        properties: {},
      };
      if (map.getSource(sourceId)) {
        map.getSource(sourceId).setData(data);
      } else {
        map.addSource(sourceId, { type: "geojson", data });
        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#ff6a1f",
            "line-width": 4,
            "line-opacity": 0.85,
          },
        });
      }
    } else if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
      map.removeSource(sourceId);
    }
  }, [ready, routePolyline]);

  // Update live polyline (recorded so far).
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapRef.current as any;
    if (!ready || !map) return;

    const sourceId = "live-line";
    const layerId = "live-line-layer";

    if (livePolyline) {
      const coords = decodePolyline(livePolyline);
      const data = {
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: coords },
        properties: {},
      };
      if (map.getSource(sourceId)) {
        map.getSource(sourceId).setData(data);
      } else {
        map.addSource(sourceId, { type: "geojson", data });
        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#ffffff",
            "line-width": 3,
            "line-opacity": 0.6,
          },
        });
      }
    } else if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
      map.removeSource(sourceId);
    }
  }, [ready, livePolyline]);

  // Update destination flag.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapRef.current as any;
    if (!ready || !map) return;

    const sourceId = "destination";
    const layerId = "destination-dot";

    if (destination) {
      const data = {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: destination },
        properties: {},
      };
      if (map.getSource(sourceId)) {
        map.getSource(sourceId).setData(data);
      } else {
        map.addSource(sourceId, { type: "geojson", data });
        map.addLayer({
          id: layerId,
          type: "circle",
          source: sourceId,
          paint: {
            "circle-radius": 8,
            "circle-color": "#ff6a1f",
            "circle-stroke-width": 3,
            "circle-stroke-color": "#050403",
          },
        });
      }
    } else if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
      map.removeSource(sourceId);
    }
  }, [ready, destination]);

  // Pan camera to user as it moves (gentle follow).
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapRef.current as any;
    if (!ready || !map || !userLocation) return;
    map.easeTo({
      center: [userLocation.lon, userLocation.lat],
      duration: 600,
    });
  }, [ready, userLocation?.lat, userLocation?.lon, userLocation]);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {children}
    </div>
  );
}

// ─── Polyline decoder (Mapbox polyline format, precision 5) ────────────────

/**
 * Decode Mapbox polyline string → array di [lon, lat]. Algoritmo standard
 * (Google polyline format). Mapbox usa precision 5 di default.
 */
function decodePolyline(encoded: string, precision = 5): [number, number][] {
  const coords: [number, number][] = [];
  const factor = Math.pow(10, precision);
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b = 0;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push([lng / factor, lat / factor]);
  }
  return coords;
}
