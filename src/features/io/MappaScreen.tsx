"use client";

import { useMemo, useState } from "react";
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

type SourceFilter = "all" | "manual" | "gpx" | "activity" | "saved";
type SortMode = "recent" | "longest";

const SOURCES: Array<{ key: SourceFilter; label: string; color: string }> = [
  { key: "all",      label: "Tutti",      color: "var(--ink)" },
  { key: "manual",   label: "Disegnati",  color: "var(--ember)" },
  { key: "gpx",      label: "Importati",  color: "#6bb0ff" },
  { key: "activity", label: "Tracciati",  color: "var(--ember)" },
  { key: "saved",    label: "Salvati",    color: "#c779c7" },
];

/** Tag più frequenti nei mock — base per i filtri secondari espandibili. */
const POPULAR_TAGS = [
  "alpi",
  "passi",
  "dolomiti",
  "tour",
  "garda",
  "epic",
  "urban",
  "night",
] as const;

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
  const [source, setSource] = useState<SourceFilter>("all");
  const [includeAuto, setIncludeAuto] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortMode>("recent");

  const planned = useQuery((db, userId) => listMyPlannedRoutes(db, userId));
  const activities = useQuery((db, userId) => listMyActivities(db, userId));
  const savedRows = useQuery((db, userId) => listSavedRoutes(db, userId));
  const savedItems = useQuery((db) =>
    savedRows
      .map((sr) => {
        const route = getPublishedRoute(db, sr.publishedRouteId);
        if (!route) return undefined;
        const author = getProfile(db, route.ownerId);
        return { saved: sr, route, author };
      })
      .filter(
        (x): x is { saved: SavedRoute; route: PublishedRoute; author: Profile | undefined } =>
          !!x,
      ),
  );

  const all = useMemo<ArchiveItem[]>(() => {
    const items: ArchiveItem[] = [];
    for (const r of planned) items.push({ kind: r.source, date: r.createdAt, route: r });
    for (const a of activities) items.push({ kind: "activity", date: a.startedAt, activity: a });
    for (const s of savedItems)
      items.push({
        kind: "saved",
        date: s.saved.savedAt,
        saved: s.saved,
        route: s.route,
        author: s.author,
      });
    return items;
  }, [planned, activities, savedItems]);

  const visible = useMemo(() => {
    let items = source === "all" ? all : all.filter((i) => i.kind === source);
    if (activeTags.size > 0) {
      items = items.filter((i) =>
        getTags(i).some((t) => activeTags.has(t)),
      );
    }
    items.sort((a, b) =>
      sort === "recent"
        ? b.date.localeCompare(a.date)
        : getDistance(b) - getDistance(a),
    );
    return items;
  }, [all, source, activeTags, sort]);

  const totalKm = useMemo(
    () => visible.reduce((acc, i) => acc + getDistance(i), 0),
    [visible],
  );

  const activeFilterCount = activeTags.size + (sort !== "recent" ? 1 : 0);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  return (
    <div className="screen-enter flex flex-col gap-4 p-5 pb-24">
      <section>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ember">
              ▸ Percorsi
            </span>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
              I tuoi percorsi
            </h1>
          </div>
          <AutoToggle on={includeAuto} onChange={setIncludeAuto} />
        </div>
        <p className="mt-1 text-sm text-ink-dim">
          {visible.length} {visible.length === 1 ? "percorso" : "percorsi"} ·{" "}
          {totalKm.toLocaleString("it-IT", { maximumFractionDigits: 0 })} km totali
        </p>
      </section>

      {/* Tabs sorgente: sempre visibili, scrollabili */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 scrollbar-hide">
        {SOURCES.map((s) => (
          <SourceTab
            key={s.key}
            active={source === s.key}
            color={s.color}
            onClick={() => setSource(s.key)}
          >
            {s.label}
          </SourceTab>
        ))}
      </div>

      {/* Filtri secondari espandibili */}
      <div>
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-ink-dim transition-colors hover:text-ink"
        >
          <span aria-hidden>{filtersOpen ? "▾" : "▸"}</span>
          Filtri
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-ember/15 px-1.5 py-0.5 text-ember">
              {activeFilterCount} attiv{activeFilterCount === 1 ? "o" : "i"}
            </span>
          )}
        </button>
        {filtersOpen && (
          <div className="mt-2 flex flex-col gap-3 rounded-xl border border-line bg-panel/60 p-3">
            <div>
              <div className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-ink-mute">
                Tag
              </div>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_TAGS.map((t) => (
                  <Chip key={t} size="sm" active={activeTags.has(t)} onClick={() => toggleTag(t)}>
                    #{t}
                  </Chip>
                ))}
                {activeTags.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTags(new Set())}
                    className="font-mono text-[10px] uppercase tracking-widest text-ink-mute hover:text-ember"
                  >
                    azzera
                  </button>
                )}
              </div>
            </div>
            <div>
              <div className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-ink-mute">
                Ordina
              </div>
              <div className="flex gap-1.5">
                <Chip size="sm" active={sort === "recent"} onClick={() => setSort("recent")}>
                  recenti
                </Chip>
                <Chip size="sm" active={sort === "longest"} onClick={() => setSort("longest")}>
                  più lunghi
                </Chip>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid card quadrate */}
      {visible.length === 0 ? (
        <EmptyState filter={source} />
      ) : (
        <section className="grid grid-cols-2 gap-3">
          {visible.map((item) => (
            <ArchiveCard key={cardKey(item)} item={item} />
          ))}
        </section>
      )}
    </div>
  );
}

// ─── Tab pill per sorgente (visivamente distinta dai chip filtri) ────────────

function SourceTab({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full border px-3.5 py-1.5 font-display text-xs font-medium transition-colors"
      style={{
        borderColor: active ? color : "var(--line)",
        background: active ? `${color === "var(--ink)" ? "rgba(255,255,255,0.06)" : color + "18"}` : "transparent",
        color: active ? color : "var(--ink-soft)",
      }}
    >
      {children}
    </button>
  );
}

// ─── Toggle "anche auto" (placeholder: nessun campo vehicle nei mock) ────────

function AutoToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className="flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 transition-colors"
      style={{
        borderColor: on ? "var(--ember)" : "var(--line)",
        background: on ? "rgba(255,106,31,0.08)" : "transparent",
      }}
      title="Includi anche percorsi in auto"
    >
      <span
        className="flex h-4 w-7 items-center rounded-full transition-colors"
        style={{ background: on ? "var(--ember)" : "var(--line)" }}
      >
        <span
          className="h-3 w-3 rounded-full bg-bg transition-transform"
          style={{ transform: on ? "translateX(14px)" : "translateX(2px)" }}
        />
      </span>
      <span
        className="font-mono text-[9px] uppercase tracking-widest"
        style={{ color: on ? "var(--ember)" : "var(--ink-dim)" }}
      >
        anche auto
      </span>
    </button>
  );
}

// ─── Card quadrata con mini-mappa ────────────────────────────────────────────

function ArchiveCard({ item }: { item: ArchiveItem }) {
  const now = useQuery((_db, _uid, n) => n);
  const meta = itemMeta(item);
  const polylineSeed =
    item.kind === "activity"
      ? item.activity.polylineSeed ?? 1
      : item.kind === "saved"
        ? hashSeed(item.route.id)
        : item.route.polylineSeed ?? hashSeed(item.route.id);

  return (
    <button
      type="button"
      className="group flex aspect-square flex-col overflow-hidden rounded-xl border border-line bg-panel text-left transition-colors hover:border-line-soft"
    >
      <div className="relative flex-1 min-h-0">
        <MiniMap seed={polylineSeed} />
        <span
          className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-md bg-bg/85 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest backdrop-blur-sm"
          style={{ color: meta.color }}
        >
          <Icon d={meta.iconPath} size={8} />
          {meta.label}
        </span>
        {item.kind === "saved" && item.author && (
          <span
            className="absolute right-1.5 top-1.5 max-w-[60%] truncate rounded-md bg-bg/85 px-1.5 py-0.5 font-mono text-[8px] backdrop-blur-sm"
            style={{ color: item.author.accentColor ?? "var(--ink-dim)" }}
          >
            di {item.author.displayName.split(" ")[0]}
          </span>
        )}
      </div>
      <div className="shrink-0 border-t border-line px-2.5 py-2">
        <p className="truncate font-display text-[12px] font-semibold leading-tight">
          {meta.title}
        </p>
        <div className="mt-1 flex items-center gap-2 font-mono text-[10px] tabular-nums text-ink-dim">
          <span>{meta.distanceKm}km</span>
          {meta.duration && <span>· {meta.duration}</span>}
          <span className="ml-auto text-[9px] uppercase tracking-widest text-ink-mute">
            {formatRelativeDate(item.date, now)}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Empty state per filtro ──────────────────────────────────────────────────

function EmptyState({ filter }: { filter: SourceFilter }) {
  const messages: Record<SourceFilter, { title: string; body: string }> = {
    all: {
      title: "Archivio vuoto",
      body: "Crea un percorso dalla Home, registra un'uscita o importa un GPX.",
    },
    manual: {
      title: "Nessun percorso disegnato",
      body: "Vai in Home → Crea per disegnare un percorso sulla mappa.",
    },
    gpx: {
      title: "Nessun GPX importato",
      body: "Vai in Home → Carica GPX per importare un tracciato.",
    },
    activity: {
      title: "Nessun percorso tracciato",
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
        <Icon d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3z M9 3v15 M15 6v15" size={16} />
      </div>
      <div className="font-display text-sm font-semibold">{m.title}</div>
      <p className="mt-1 text-[12px] text-ink-dim">{m.body}</p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTags(item: ArchiveItem): string[] {
  if (item.kind === "activity") return item.activity.tags;
  if (item.kind === "saved") return item.route.tags;
  return item.route.tags;
}

function getDistance(item: ArchiveItem): number {
  if (item.kind === "activity") return item.activity.distanceKm;
  if (item.kind === "saved") return item.route.distanceKm;
  return item.route.distanceKm;
}

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
}

function itemMeta(item: ArchiveItem): ItemMeta {
  if (item.kind === "manual") {
    return {
      label: "disegnato",
      iconPath: "M12 20h9 M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z",
      color: "var(--ember)",
      title: item.route.title,
      distanceKm: item.route.distanceKm,
      duration: formatDurationMin(item.route.estimatedDurationMin),
    };
  }
  if (item.kind === "gpx") {
    return {
      label: "importato",
      iconPath: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
      color: "#6bb0ff",
      title: item.route.title,
      distanceKm: item.route.distanceKm,
      duration: formatDurationMin(item.route.estimatedDurationMin),
    };
  }
  if (item.kind === "activity") {
    return {
      label: "tracciato",
      iconPath: "M6 3l14 9-14 9z",
      color: "var(--ember)",
      title: item.activity.title,
      distanceKm: item.activity.distanceKm,
      duration: formatDurationSec(item.activity.durationSeconds),
    };
  }
  return {
    label: "salvato",
    iconPath:
      "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
    color: "#c779c7",
    title: item.route.title,
    distanceKm: item.route.distanceKm,
    duration: item.route.durationMin ? formatDurationMin(item.route.durationMin) : null,
  };
}

function formatDurationMin(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, "0")}`;
}

function formatDurationSec(sec: number): string {
  return formatDurationMin(Math.round(sec / 60));
}

function formatRelativeDate(iso: string, nowIso: string): string {
  const diff = new Date(nowIso).getTime() - new Date(iso).getTime();
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

// ─── MiniMap (versione "fill", N punti, occupa tutto il container) ───────────

function MiniMap({ seed }: { seed: number }) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Random walk meandrato, normalizzato in 100x100 viewBox.
  const N = 20;
  const pts: Array<[number, number]> = [];
  let x = 12 + next() * 10;
  let y = 50 + (next() - 0.5) * 30;
  pts.push([x, y]);
  for (let i = 1; i < N; i++) {
    x += (next() - 0.2) * 8;
    y += (next() - 0.5) * 14;
    x = Math.max(8, Math.min(92, x));
    y = Math.max(10, Math.min(90, y));
    pts.push([x, y]);
  }
  const polyline = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className="block h-full w-full"
      style={{ background: "linear-gradient(155deg, #15110c 0%, #060503 100%)" }}
    >
      {/* griglia leggera */}
      {[20, 40, 60, 80].map((v) => (
        <g key={v}>
          <line x1={0} x2={100} y1={v} y2={v} stroke="rgba(255,255,255,0.035)" strokeWidth={0.4} />
          <line x1={v} x2={v} y1={0} y2={100} stroke="rgba(255,255,255,0.035)" strokeWidth={0.4} />
        </g>
      ))}
      {/* glow */}
      <polyline
        points={polyline}
        fill="none"
        stroke="var(--ember)"
        strokeOpacity={0.25}
        strokeWidth={4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points={polyline}
        fill="none"
        stroke="var(--ember)"
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={pts[0][0]} cy={pts[0][1]} r={2} fill="var(--ink)" stroke="var(--bg)" strokeWidth={0.8} />
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r={2.2}
        fill="var(--ember)"
        stroke="var(--bg)"
        strokeWidth={0.8}
      />
    </svg>
  );
}
