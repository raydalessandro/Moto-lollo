"use client";

import { useEffect, useState } from "react";
import { MAPBOX_TOKEN, isMapboxConfigured } from "@/lib/mapbox";

interface TestResult {
  label: string;
  url: string;
  status?: number;
  ok?: boolean;
  body?: string;
  error?: string;
}

/**
 * Pagina diagnostic per Mapbox. Aprila da:
 *   https://lollo-ikn4.vercel.app/test-mapbox
 *
 * Mostra:
 * - Se il token è configurato (env var arriva al client?)
 * - Stato del Style API endpoint (autorizzazione base)
 * - Stato di una tile vettoriale (l'endpoint che ci dava 403)
 * - Stato Geocoding API
 *
 * Tutto client-side, niente Mapbox SDK — request fetch nude per
 * vedere il vero status code.
 */
export default function TestMapboxPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const runTests = async () => {
    setRunning(true);
    const out: TestResult[] = [];

    const tests: Array<{ label: string; url: string }> = [
      {
        label: "1) Mapbox Style API (auth basic check)",
        url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11.json?access_token=${MAPBOX_TOKEN}`,
      },
      {
        label: "2) Mapbox Vector Tile (lo stesso endpoint che dava 403)",
        url: `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/0/0/0.vector.pbf?access_token=${MAPBOX_TOKEN}`,
      },
      {
        label: "3) Mapbox Geocoding API",
        url: `https://api.mapbox.com/geocoding/v5/mapbox.places/Brescia.json?access_token=${MAPBOX_TOKEN}&limit=1`,
      },
      {
        label: "4) Mapbox Static Image API",
        url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/10.0,45.5,9/200x100?access_token=${MAPBOX_TOKEN}`,
      },
    ];

    for (const t of tests) {
      try {
        const res = await fetch(t.url);
        let bodyPreview = "";
        try {
          const text = await res.text();
          bodyPreview = text.length > 250 ? text.slice(0, 250) + "…" : text;
        } catch {
          bodyPreview = "(binary)";
        }
        out.push({
          label: t.label,
          url: t.url,
          status: res.status,
          ok: res.ok,
          body: bodyPreview,
        });
      } catch (err) {
        out.push({
          label: t.label,
          url: t.url,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      setResults([...out]);
    }
    setRunning(false);
  };

  useEffect(() => {
    runTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tokenPreview = MAPBOX_TOKEN
    ? `${MAPBOX_TOKEN.slice(0, 24)}…${MAPBOX_TOKEN.slice(-8)}`
    : "(missing!)";

  return (
    <div className="min-h-dvh bg-bg p-5 font-mono text-sm text-ink">
      <h1 className="font-display text-xl font-semibold">Mapbox diagnostic</h1>
      <p className="mt-1 text-ink-dim">
        Pagina di test temporanea. Apri questa URL su qualsiasi browser.
      </p>

      <section className="mt-5 rounded-xl border border-line bg-panel p-3">
        <p className="text-[10px] uppercase tracking-widest text-ink-dim">Token</p>
        <p className="mt-1">
          <span
            style={{
              color: isMapboxConfigured() ? "var(--ember)" : "var(--danger)",
            }}
          >
            {isMapboxConfigured() ? "✓ configurato" : "✗ MISSING"}
          </span>
          {" — "}
          <span className="text-ink-soft">{tokenPreview}</span>
        </p>
      </section>

      <section className="mt-4 space-y-3">
        {results.map((r, i) => (
          <div key={i} className="rounded-xl border border-line bg-panel p-3">
            <p className="font-display text-sm font-semibold">{r.label}</p>
            <p className="mt-1 break-all text-[10px] text-ink-dim">{r.url}</p>
            <p className="mt-2">
              Status:{" "}
              {r.error ? (
                <span className="text-danger">FETCH ERROR — {r.error}</span>
              ) : (
                <span
                  style={{
                    color: r.ok ? "var(--ember)" : "var(--danger)",
                  }}
                >
                  {r.status} {r.ok ? "OK" : "FAIL"}
                </span>
              )}
            </p>
            {r.body && (
              <pre className="mt-2 whitespace-pre-wrap break-all rounded-lg bg-bg p-2 text-[10px] text-ink-soft">
                {r.body}
              </pre>
            )}
          </div>
        ))}
      </section>

      <button
        type="button"
        onClick={runTests}
        disabled={running}
        className="mt-5 rounded-xl border border-ember bg-ember/10 px-4 py-2 font-mono text-xs uppercase tracking-wider text-ember disabled:opacity-50"
      >
        {running ? "Running…" : "Re-run tests"}
      </button>

      <p className="mt-5 text-[11px] text-ink-mute">
        Quando il problema è risolto, questa pagina può essere cancellata.
      </p>
    </div>
  );
}
