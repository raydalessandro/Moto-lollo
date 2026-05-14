"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/nav/Icon";
import { useQuery } from "@/mocks/DbProvider";
import {
  listMyPlannedRoutes,
  listMyActivities,
  listSavedRoutes,
  getPublishedRoute,
  getProfile,
} from "@/mocks/queries";
import type {
  Activity,
  PlannedRoute,
  PublishedRoute,
  Profile,
  SavedRoute,
} from "@/types/domain";

type ArchiveFilter = "all" | "manual" | "gpx" | "activity" | "saved";

const FILTERS: Array<{ key: ArchiveFilter; label: string }> = [
  { key: "all",      label: "Tutti" },
  { key: "manual",   label: "Creati" },
  { key: "gpx",      label: "Caricati" },
  { key: "activity", label: "Fatti" },
  { key: "saved",    label: "Salvati" },
];

type ArchiveItem =
  | { kind: "manual"; date: string; route: PlannedRoute }
  | { kind: "gpx"; date: string; route: PlannedRoute }
  | { kind: "activity"; date: string; activity: Activity }
  | {
      kind: "saved";
      date: string;
      saved: SavedRoute;
      route: PublishedRoute;
      author?: Profile;
    };

export function MappaScreen() {
  const [filter, setFilter] = useState<ArchiveFilter>("all");

  const planned = useQuery((db, userId) => listMyPlannedRoutes(db, userId));
  const activities = useQuery((db, userId) => listMyActivities(db, userId));
  const savedRows = useQuery((db, userId) => listSavedRoutes(db, userId));
  const savedItems = useQuery((db) =>
    savedRows.map((sr) => {
      const route = getPublishedRoute(db, sr.publishedRouteId);
      if (!route) return undefined;
      const author = getProfile(db, route.ownerId);
      return { saved: sr, route, author };
    }).filter((x): x is { saved: SavedRoute; route: PublishedRoute; author: Profile | undefined } => !!x),
  );

  const all = useMemo<ArchiveItem[]>(() => {
    const items: ArchiveItem[] = [];
    for (const r of planned) {
      items.push({
        kind: r.source,
        date: r.createdAt,
        route: r,
      });
    }
    for (const a of activities) {
      items.push({
        kind: "activity",
        date: a.startedAt,
        activity: a,
      });
    }
    for (const s of savedItems) {
      items.push({
        kind: "saved",
        date: s.saved.savedAt,
        saved: s.saved,
        route: s.route,
        author: s.author,
      });
    }
    items.sort((a, b) => b.date.localeCompare(a.date));
    return items;
  }, [planned, activities, savedItems]);

  const visible = useMemo(
    () => (filter === "all" ? all : all.filter((i) => i.kind === filter)),
    [all, filter],
  );

  const totalKm = useMemo(
    () =>
      visible.reduce((acc, i) => {
        if (i.kind === "activity") return acc + i.activity.distanceKm;
        if (i.kind === "saved") return acc + i.route.distanceKm;
        return acc + i.route.distanceKm;
      }, 0),
    [visible],
  );

  return (
    <div className="screen-enter flex flex-col gap-4 p-5 pb-24">
      <section>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ember">
          ▸ Mappa
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          I tuoi percorsi
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {visible.length} {visible.length === 1 ? "percorso" : "percorsi"} ·{" "}
          {totalKm.toLocaleString("it-IT", { maximumFractionDigits: 0 })} km totali
        </p>
      </section>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 scrollbar-hide">
        {FILTERS.map((f) => (
          <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </Chip>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        {visible.length === 0 && (
          <EmptyState filter={filter} />
        )}
        {visible.map((item) => (
          <ArchiveCard key={cardKey(item)} item={item} />
        ))}
      </section>
    </div>
  );
}

// ─── Card per ogni tipo ──────────────────────────────────────────────────────

function ArchiveCard({ item }: { item: ArchiveItem }) {
  const meta = itemMeta(item);
  const polylineSeed =
    item.kind === "activity"
      ? item.activity.polylineSeed ?? 1
      : item.kind === "saved"
        ? hashSeed(item.route.id)
        : item.route.polylineSeed ?? hashSeed(item.route.id);

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="relative">
        <MiniMap seed={polylineSeed} height={60} />
        {/* Source badge */}
        <span
          className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-bg/80 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest backdrop-blur-sm"
          style={{ color: meta.color }}
        >
          <Icon d={meta.iconPath} size={8} />
          {meta.label}
        </span>
        {/* Author chip (saved only) */}
        {item.kind === "saved" && item.author && (
          <span
            className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-bg/80 px-1.5 py-0.5 font-mono text-[8px] backdrop-blur-sm"
            style={{ color: item.author.accentColor ?? "var(--ink-dim)" }}
          >
            di {item.author.displayName}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-display text-sm font-semibold leading-tight">
          {meta.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-dim">
          <span className="font-mono tabular-nums">{meta.distanceKm} km</span>
          {meta.duration && (
            <span className="font-mono tabular-nums">{meta.duration}</span>
          )}
          <span className="font-mono text-[10px] uppercase tracking-widest">
            {formatRelativeDate(item.date)}
          </span>
          <span className="ml-auto flex gap-1">
            {meta.tags.slice(0, 2).map((t) => (
              <Chip key={t} size="sm">#{t}</Chip>
            ))}
          </span>
        </div>
      </div>
    </Card>
  );
}

// ─── Empty state per filter ──────────────────────────────────────────────────

function EmptyState({ filter }: { filter: ArchiveFilter }) {
  const messages: Record<ArchiveFilter, { title: string; body: string }> = {
    all: {
      title: "Archivio vuoto",
      body: "Crea un percorso dalla Home, registra un'uscita o importa un GPX.",
    },
    manual: {
      title: "Nessun percorso creato",
      body: "Vai in Home → Crea per disegnare un percorso sulla mappa.",
    },
    gpx: {
      title: "Nessun GPX caricato",
      body: "Vai in Home → Carica GPX per importare un tracciato.",
    },
    activity: {
      title: "Nessuna uscita registrata",
      body: "Vai in Home → Registra per cominciare a tracciare.",
    },
    saved: {
      title: "Nessun percorso salvato",
      body: "Apri il Feed e tieni quelli che ti piacciono per ritrovarli qui.",
    },
  };
  const m = messages[filter];
  return (
    <div className="rounded-xl border border-dashed border-line bg-panel/60 p-6 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink-mute">
        <Icon
          d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3z M9 3v15 M15 6v15"
          size={16}
        />
      </div>
      <div className="font-display text-sm font-semibold">{m.title}</div>
      <p className="mt-1 text-[12px] text-ink-dim">{m.body}</p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cardKey(item: ArchiveItem): string {
  if (item.kind === "activity") return `a-${item.activity.id}`;
  if (item.kind === "saved") return `s-${item.saved.id}`;
  return `r-${item.route.id}`;
}

interface ItemMeta {
  label: string;
  iconPath: string;
  color: string;
  title: string;
  distanceKm: number;
  duration: string | null;
  tags: string[];
}

function itemMeta(item: ArchiveItem): ItemMeta {
  if (item.kind === "manual") {
    return {
      label: "creato",
      iconPath: "M12 20h9 M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z",
      color: "var(--ember)",
      title: item.route.title,
      distanceKm: item.route.distanceKm,
      duration: formatDurationMin(item.route.estimatedDurationMin),
      tags: item.route.tags,
    };
  }
  if (item.kind === "gpx") {
    return {
      label: "caricato",
      iconPath: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
      color: "#6bb0ff",
      title: item.route.title,
      distanceKm: item.route.distanceKm,
      duration: formatDurationMin(item.route.estimatedDurationMin),
      tags: item.route.tags,
    };
  }
  if (item.kind === "activity") {
    return {
      label: "fatto",
      iconPath: "M6 3l14 9-14 9z",
      color: "var(--ember)",
      title: item.activity.title,
      distanceKm: item.activity.distanceKm,
      duration: formatDurationSec(item.activity.durationSeconds),
      tags: item.activity.tags,
    };
  }
  // saved
  return {
    label: "salvato",
    iconPath:
      "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
    color: "#c779c7",
    title: item.route.title,
    distanceKm: item.route.distanceKm,
    duration: item.route.durationMin
      ? formatDurationMin(item.route.durationMin)
      : null,
    tags: item.route.tags,
  };
}

function formatDurationMin(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m.toString().padStart(2, "0")}`;
}

function formatDurationSec(sec: number): string {
  return formatDurationMin(Math.round(sec / 60));
}

function formatRelativeDate(iso: string): string {
  const now = Date.now();
  const diff = now - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "oggi";
  if (days < 7) return `${days}g fa`;
  if (days < 30) return `${Math.round(days / 7)}sett`;
  if (days < 365) return `${Math.round(days / 30)}mesi`;
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ─── MiniMap (riusata anche in Home) ─────────────────────────────────────────

function MiniMap({ seed, height = 60 }: { seed: number; height?: number }) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const points: string[] = [];
  const N = 14;
  const W = 320;
  const H = height;
  let x = 16;
  let y = H / 2 + (next() - 0.5) * H * 0.4;
  points.push(`${x},${y}`);
  for (let i = 1; i < N; i++) {
    x += (W - 32) / (N - 1);
    y = Math.max(12, Math.min(H - 12, y + (next() - 0.5) * H * 0.5));
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block h-full w-full"
      style={{ background: "linear-gradient(180deg, #14110d 0%, #060503 100%)" }}
    >
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={t}
          x1={0}
          x2={W}
          y1={H * t}
          y2={H * t}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={1}
        />
      ))}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--ember)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={parseFloat(points[0].split(",")[0])}
        cy={parseFloat(points[0].split(",")[1])}
        r={3}
        fill="var(--ink)"
        stroke="var(--bg)"
        strokeWidth={1.5}
      />
      <circle
        cx={parseFloat(points[points.length - 1].split(",")[0])}
        cy={parseFloat(points[points.length - 1].split(",")[1])}
        r={3}
        fill="var(--ember)"
        stroke="var(--bg)"
        strokeWidth={1.5}
      />
    </svg>
  );
}
