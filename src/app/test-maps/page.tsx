"use client";

import { useEffect, useRef, useState } from "react";
import {
  geocode,
  getDirections,
  hasRoutingApi,
  ORS_TOKEN,
} from "@/lib/maps";

/**
 * Pagina diagnostic per la stack mappe.
 * Apri da: https://lollo-ikn4.vercel.app/test-maps
 *
 * 3 sezioni:
 *  1. MapLibre + OpenFreeMap (tile, sempre attivo)
 *  2. OpenRouteService — Geocoding (button)
 *  3. OpenRouteService — Directions (button)
 */
export default function TestMapsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="border-b border-line p-3 font-mono text-[11px]">
        <p className="font-bold">/test-maps · diagnostic</p>
        <p className="text-ink-dim">
          1) tile MapLibre+OpenFreeMap · 2) ORS geocoding · 3) ORS directions
        </p>
      </header>

      <MapBlock />

      <section className="border-b border-line p-3">
        <p className="mb-2 font-mono text-[11px] font-bold">
          2) OpenRouteService — Geocoding (search destinazione)
        </p>
        <OrsGeocodeTest />
      </section>

      <section className="border-b border-line p-3">
        <p className="mb-2 font-mono text-[11px] font-bold">
          3) OpenRouteService — Directions (turn-by-turn)
        </p>
        <OrsDirectionsTest />
      </section>
    </div>
  );
}

// ─── 1) MapLibre + OpenFreeMap ──────────────────────────────────────────────

function MapBlock() {
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
      log("loading maplibre-gl...");
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
        m.on("load", () => log("LOAD ✓"));
        m.on("idle", () => log("IDLE (tiles loaded ✓)"));
        m.on("error", (e: { error?: Error }) => {
          log(`ERROR: ${e?.error?.message ?? JSON.stringify(e)}`);
        });

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
    <section className="border-b border-line">
      <p className="border-b border-line p-3 font-mono text-[11px] font-bold">
        1) MapLibre GL JS + OpenFreeMap (tile, no token)
      </p>
      <div
        ref={ref}
        style={{
          width: "100%",
          height: "40vh",
          background: "#1a1410",
        }}
      />
      <pre className="max-h-32 overflow-auto border-t border-line bg-panel p-2 font-mono text-[9px] leading-relaxed text-ink-soft">
        {logs.length === 0 ? "(no logs yet)" : logs.join("\n")}
      </pre>
    </section>
  );
}

// ─── 2) ORS Geocoding test ──────────────────────────────────────────────────

function OrsGeocodeTest() {
  const [query, setQuery] = useState("Passo del Tonale");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [result, setResult] = useState<string>("");

  const run = async () => {
    setStatus("loading");
    setResult("");
    try {
      const r = await geocode(query, { limit: 3 });
      if (r.length === 0) {
        setStatus("error");
        setResult("(no results returned)");
        return;
      }
      setStatus("ok");
      setResult(
        r
          .map(
            (x, i) =>
              `${i + 1}. ${x.placeName}\n   coords: [${x.center[0].toFixed(4)}, ${x.center[1].toFixed(4)}]`,
          )
          .join("\n\n"),
      );
    } catch (err) {
      setStatus("error");
      setResult(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-lg border border-line bg-panel px-2 py-1 font-mono text-xs"
          placeholder="cerca un posto…"
        />
        <button
          type="button"
          onClick={run}
          disabled={!hasRoutingApi() || status === "loading"}
          className="rounded-lg border border-ember bg-ember/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ember disabled:opacity-50"
        >
          {status === "loading" ? "..." : "Test"}
        </button>
      </div>
      <TokenStatus />
      {result && (
        <pre className="rounded-lg border border-line bg-panel p-2 font-mono text-[10px] leading-relaxed text-ink-soft">
          <span style={{ color: status === "ok" ? "var(--ember)" : "var(--danger)" }}>
            {status.toUpperCase()}
          </span>
          {"\n"}
          {result}
        </pre>
      )}
    </div>
  );
}

// ─── 3) ORS Directions test ─────────────────────────────────────────────────

function OrsDirectionsTest() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [result, setResult] = useState<string>("");

  // Hardcoded Brescia → Verona (entrambi sicuramente su strada).
  const origin: [number, number] = [10.208, 45.544];
  const destination: [number, number] = [10.998, 45.439];

  const run = async () => {
    setStatus("loading");
    setResult("");
    try {
      const r = await getDirections({ origin, destination });
      if (!r) {
        setStatus("error");
        setResult("(no route returned)");
        return;
      }
      setStatus("ok");
      const km = (r.distanceM / 1000).toFixed(1);
      const min = Math.round(r.durationS / 60);
      setResult(
        `Distance: ${km} km\nDuration: ~${min} min\nSteps: ${r.steps.length}\nPolyline length: ${r.polyline.length} chars\n\nFirst 3 steps:\n${r.steps
          .slice(0, 3)
          .map(
            (s, i) =>
              `${i + 1}. ${s.instruction} (${Math.round(s.distanceM)}m, ${Math.round(s.durationS)}s)`,
          )
          .join("\n")}`,
      );
    } catch (err) {
      setStatus("error");
      setResult(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] text-ink-dim">
        Hardcoded route: Brescia ({origin.join(",")}) → Verona ({destination.join(",")})
      </p>
      <button
        type="button"
        onClick={run}
        disabled={!hasRoutingApi() || status === "loading"}
        className="rounded-lg border border-ember bg-ember/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ember disabled:opacity-50"
      >
        {status === "loading" ? "..." : "Test directions"}
      </button>
      {result && (
        <pre className="rounded-lg border border-line bg-panel p-2 font-mono text-[10px] leading-relaxed text-ink-soft">
          <span style={{ color: status === "ok" ? "var(--ember)" : "var(--danger)" }}>
            {status.toUpperCase()}
          </span>
          {"\n"}
          {result}
        </pre>
      )}
    </div>
  );
}

function TokenStatus() {
  const has = hasRoutingApi();
  const preview = ORS_TOKEN
    ? `${ORS_TOKEN.slice(0, 12)}…${ORS_TOKEN.slice(-6)}`
    : "(missing)";
  return (
    <p className="font-mono text-[10px]">
      Token{" "}
      <span style={{ color: has ? "var(--ember)" : "var(--danger)" }}>
        {has ? "✓ configurato" : "✗ missing"}
      </span>{" "}
      <span className="text-ink-dim">{preview}</span>
    </p>
  );
}
