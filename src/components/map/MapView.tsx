"use client";

import "maplibre-gl/dist/maplibre-gl.css"; 
import { useEffect, useRef, useState } from "react";
import { MAP_STYLE_URL, decodePolyline } from "@/lib/maps";

export interface MapViewProps {
  /** Centro iniziale [lon, lat]. */
  center?: [number, number];
  /** Zoom 0-22. Default 13. */
  zoom?: number;
  /** Posizione corrente utente (cerchio ember). */
  userLocation?: { lat: number; lon: number; heading: number | null };
  /** Polyline del route precomputato (Directions). */
  routePolyline?: string;
  /** Polyline del tracciato live (registrato finora). */
  livePolyline?: string;
  /** Destinazione [lon, lat] — flag. */
  destination?: [number, number];
  /** Children sovrapposti (HUD, banner, ecc.). */
  children?: React.ReactNode;
  /** ClassName container. */
  className?: string;
  /** Fallback render alternativo durante caricamento map. */
  fallback?: React.ReactNode;
}

/**
 * Mappa interattiva via **MapLibre GL JS** con tile da OpenFreeMap.
 * Dynamic import per non gonfiare il bundle iniziale (~700KB).
 *
 * Tile gratis e illimitate, no token richiesto. Per Geocoding/Directions
 * vedere lib/maps.ts (OpenRouteService).
 */
export function MapView(props: MapViewProps) {
  return <LiveMaplibreView {...props} />;
}

function LiveMaplibreView({
  center,
  zoom = 13,
  userLocation,
  routePolyline,
  livePolyline,
  destination,
  children,
  className = "",
  fallback,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const [ready, setReady] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const t = new Date().toISOString().slice(14, 19);
    console.log("[MapView]", msg);
    setDebugLogs((l) => [...l.slice(-9), `${t} ${msg}`]);
  };

  // Initialize map (one-shot).
  useEffect(() => {
    let cancelled = false;
    let map: unknown;
    (async () => {
      try {
        addLog("import maplibre-gl…");
        const mod = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const maplibregl = (mod as any).default ?? mod;
        addLog(`module v${maplibregl.version ?? "?"}`);

        const rect0 = containerRef.current.getBoundingClientRect();
        addLog(
          `container ${rect0.width.toFixed(0)}x${rect0.height.toFixed(0)} px`,
        );

        const initialCenter: [number, number] =
          center ?? (userLocation ? [userLocation.lon, userLocation.lat] : [10.0, 45.5]);

        map = new maplibregl.Map({
          container: containerRef.current,
          style: MAP_STYLE_URL,
          center: initialCenter,
          zoom,
          attributionControl: false,
          pitchWithRotate: false,
        });
        mapRef.current = map;
        addLog("map created");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = map as any;
        m.on("error", (e: { error?: Error }) => {
          addLog(`ERROR: ${e?.error?.message ?? JSON.stringify(e)}`);
        });
        m.on("styledata", () => addLog("styledata"));
        m.on("load", () => {
          if (cancelled) return;
          const rect = containerRef.current?.getBoundingClientRect();
          addLog(
            `LOAD ✓ ${rect?.width.toFixed(0)}x${rect?.height.toFixed(0)}`,
          );
          m.resize();
          setReady(true);
        });
        m.on("idle", () => addLog("idle (tiles ✓)"));
        m.on("data", (e: { dataType?: string; tile?: unknown }) => {
          if (e.dataType === "source" && e.tile) {
            // count tiles silently
          }
        });
      } catch (err) {
        addLog(`CATCH: ${err instanceof Error ? err.message : String(err)}`);
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

  // Re-resize on container size change (orientation, header relayout).
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapRef.current as any;
    if (!ready || !map || !containerRef.current) return;
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [ready]);

  // User position marker.
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

  // Route polyline (from Directions).
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

  // Live polyline (registered so far).
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

  // Destination flag.
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

  // Gentle camera follow.
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
      {!ready && fallback && (
        <div className="absolute inset-0">{fallback}</div>
      )}
      {children}

      {/* Debug HUD on-screen — togliere quando la mappa funziona */}
      <div
        className="pointer-events-none absolute left-2 top-2 max-w-[70vw] rounded-md bg-black/70 px-2 py-1 font-mono text-[9px] leading-tight text-white"
        style={{ zIndex: 100 }}
      >
        <div style={{ color: ready ? "#7da35f" : "#ff6a1f" }}>
          [Map] ready={String(ready)}
        </div>
        {debugLogs.map((l, i) => (
          <div key={i} style={{ opacity: 0.85 }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
