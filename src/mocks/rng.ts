/**
 * Deterministic PRNG so the seed output is stable between refreshes.
 * Mulberry32 — small, fast, good enough for fixture data.
 */

export interface Rng {
  next: () => number;
  int: (minInclusive: number, maxExclusive: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  sample: <T>(arr: readonly T[], n: number) => T[];
  maybe: (probability: number) => boolean;
  id: (prefix?: string) => string;
  float: (min: number, max: number, decimals?: number) => number;
}

export function makeRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo));

  const pick = <T,>(arr: readonly T[]) => arr[int(0, arr.length)];

  const sample = <T,>(arr: readonly T[], n: number) => {
    const copy = [...arr];
    const out: T[] = [];
    const take = Math.min(n, copy.length);
    for (let i = 0; i < take; i++) {
      const idx = int(0, copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  };

  const maybe = (p: number) => next() < p;

  let idCounter = 0;
  const id = (prefix = "id") => {
    idCounter += 1;
    const n = Math.floor(next() * 0xffffff)
      .toString(16)
      .padStart(6, "0");
    return `${prefix}_${idCounter.toString(36)}${n}`;
  };

  const float = (lo: number, hi: number, decimals = 2) => {
    const v = lo + next() * (hi - lo);
    const f = Math.pow(10, decimals);
    return Math.round(v * f) / f;
  };

  return { next, int, pick, sample, maybe, id, float };
}

/** Subtract `days` days from `iso`, returning ISO string. */
export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function addHours(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setUTCHours(d.getUTCHours() + hours);
  return d.toISOString();
}
