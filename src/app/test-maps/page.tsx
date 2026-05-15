"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Pagina diagnostic minimale per la mappa.
 * Apri da: https://lollo-ikn4.vercel.app/test-maps
 *
 * Niente Next layout, niente AppShell, niente HomeScreen.
 * Solo una MapLibre map con OpenFreeMap. Se anche qui vedi nero → il
 * problema è MapLibre / OpenFreeMap / il browser. Se la vedi → il
 * problema è il wiring nei nostri component più grandi.
 */
export default function TestMapsPage() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const log = (msg: string) => {
    console.log("[TestMaps]", msg);
    setLogs((l) => [...l, `${new Date().toISOString().slice(11, 19)} ${msg}`]);
  };

  useEffect(() => {
    let map: unknown;
    let cancelled = false;

    (async () => {
      log("loading maplibre-gl module...");
      try {
        const mod = await import("maplibre-gl");
        log("module loaded");

        if (cancelled || !ref.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const maplibregl = (mod as any).default ?? mod;
        log(`maplibregl version: ${maplibregl.version ?? "?"}`);

        log("creating map...");
        map = new maplibregl.Map({
          container: ref.current,
          style: "https://tiles.openfreemap.org/styles/positron",
          center: [10.0, 45.5],
          zoom: 5,
          attributionControl: false,
        });
        log("map created");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = map as any;
        m.on("load", () => log("map LOAD event ✓"));
        m.on("idle", () => log("map IDLE (tiles loaded ✓)"));
        m.on("error", (e: { error?: Error }) => {
          const msg = e?.error?.message ?? JSON.stringify(e);
          log(`ERROR: ${msg}`);
        });
        m.on("styledata", () => log("style data received"));
        m.on("sourcedata", (e: { sourceId?: string; isSourceLoaded?: boolean }) => {
          if (e.isSourceLoaded) log(`source loaded: ${e.sourceId}`);
        });
        m.on("dataloading", () => log("data loading start"));

        // Force resize after small delay (PWA viewport quirk).
        setTimeout(() => {
          log("forced resize");
          m.resize();
        }, 500);
      } catch (err) {
        log(`CATCH: ${err instanceof Error ? err.message : String(err)}`);
      }
    })();

    return () => {
      cancelled = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (map) (map as any).remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="border-b border-line p-3 font-mono text-[11px]">
        <p className="font-bold">/test-maps</p>
        <p className="text-ink-dim">
          Container forzato 100vw × 60vh. Logs sotto.
        </p>
      </header>
      <div
        ref={ref}
        className="border-b border-line"
        style={{
          width: "100vw",
          height: "60vh",
          background: "#1a1410",
        }}
      />
      <pre className="flex-1 overflow-auto bg-panel p-3 font-mono text-[10px] leading-relaxed text-ink-soft">
        {logs.length === 0 ? "(no logs yet)" : logs.join("\n")}
      </pre>
    </div>
  );
}
