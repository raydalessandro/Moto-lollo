"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Icon } from "@/components/nav/Icon";
import { useQuery } from "@/mocks/DbProvider";
import {
  listPublishedRoutes,
  countLikes,
  getProfile,
} from "@/mocks/queries";
import type { PublishedRoute } from "@/types/domain";

type SortKey = "navigated" | "saved" | "likes" | "recent";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "navigated", label: "Più navigati" },
  { key: "saved",     label: "Più salvati" },
  { key: "likes",     label: "Più amati" },
  { key: "recent",    label: "Recenti" },
];

export function ClassificaScreen() {
  // Solo "route" — i post non hanno counters di saves/navigated.
  const routes = useQuery((db) =>
    listPublishedRoutes(db).filter((r) => r.kind === "route"),
  );
  const [sort, setSort] = useState<SortKey>("navigated");
  const [areaFilter, setAreaFilter] = useState<string | "all">("all");

  const allAreas = useMemo(() => {
    const set = new Set<string>();
    routes.forEach((r) => r.area && set.add(r.area));
    return Array.from(set).sort();
  }, [routes]);

  const sorted = useMemo(() => {
    const filtered =
      areaFilter === "all" ? routes : routes.filter((r) => r.area === areaFilter);
    const copy = [...filtered];
    if (sort === "navigated") copy.sort((a, b) => b.navigatedCount - a.navigatedCount);
    else if (sort === "saved") copy.sort((a, b) => b.savedCount - a.savedCount);
    else if (sort === "recent")
      copy.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return copy;
  }, [routes, sort, areaFilter]);

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-info">
          ▸ Classifica
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          I percorsi top
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Classifica dei percorsi pubblici della community. Non delle persone:
          delle strade.
        </p>
      </section>

      <section>
        <SectionLabel num="01">Ordina per</SectionLabel>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {SORTS.map((s) => (
            <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>
              {s.label}
            </Chip>
          ))}
        </div>

        {allAreas.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
            <Chip active={areaFilter === "all"} onClick={() => setAreaFilter("all")}>
              Tutta Italia
            </Chip>
            {allAreas.map((a) => (
              <Chip key={a} active={areaFilter === a} onClick={() => setAreaFilter(a)}>
                {a}
              </Chip>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionLabel num="02">Classifica</SectionLabel>
        <div className="flex flex-col gap-3">
          {sorted.map((r, i) => (
            <RankRow key={r.id} route={r} rank={i + 1} sort={sort} />
          ))}
          {sorted.length === 0 && (
            <div className="rounded-xl border border-dashed border-line bg-panel/60 p-6 text-center text-sm text-ink-dim">
              Nessun percorso in questa area.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function RankRow({
  route,
  rank,
  sort,
}: {
  route: PublishedRoute;
  rank: number;
  sort: SortKey;
}) {
  const author = useQuery((db) => getProfile(db, route.ownerId));
  const likes = useQuery((db) => countLikes(db, route.id));
  const now = useQuery((_db, _uid, n) => n);

  const medalColor =
    rank === 1 ? "#c8a24b" : rank === 2 ? "#b8b8b8" : rank === 3 ? "#c88248" : "var(--ink-mute)";

  const primaryMetric =
    sort === "navigated"
      ? { label: "navigato da", value: route.navigatedCount }
      : sort === "saved"
        ? { label: "salvato da", value: route.savedCount }
        : sort === "likes"
          ? { label: "like", value: likes }
          : { label: "pubblicato", value: relativeDate(route.publishedAt, now) };

  return (
    <Card>
      <div className="flex items-start gap-3">
        <span
          className="w-8 shrink-0 pt-1 text-right font-display text-lg font-semibold tabular-nums"
          style={{ color: medalColor }}
        >
          {rank}.
        </span>
        <div className="flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="font-display text-base font-semibold">{route.title}</div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
              {route.area ?? "—"}
            </span>
          </div>
          {route.coverText && (
            <p className="mt-1 text-[12px] text-ink-soft">&ldquo;{route.coverText}&rdquo;</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-dim">
            <span>{route.distanceKm} km</span>
            {route.durationMin && (
              <span>
                {Math.floor(route.durationMin / 60)}h {route.durationMin % 60}m
              </span>
            )}
            {route.alsoForCars && (
              <span className="flex items-center gap-1 text-info">
                <Icon
                  d="M5 17h14 M5 17l2-7h10l2 7 M7 17v3 M17 17v3 M7 10V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v5"
                  size={11}
                />
                anche auto
              </span>
            )}
            <span className="ml-auto flex gap-1">
              {route.tags.slice(0, 2).map((t) => (
                <Chip key={t} size="sm">#{t}</Chip>
              ))}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-3 border-t border-line pt-3 text-[11px]">
            <CounterCell
              label={primaryMetric.label}
              value={primaryMetric.value}
              accent
            />
            <CounterCell label="navigati" value={route.navigatedCount} />
            <CounterCell label="salvati" value={route.savedCount} />
            <CounterCell label="like" value={likes} />
          </div>

          {author && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-dim">
              di{" "}
              <div
                className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold"
                style={{ background: author.accentColor, color: "var(--bg)" }}
              >
                {author.initials}
              </div>
              <span className="text-ink">{author.displayName}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function CounterCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        className="font-display text-base tabular-nums"
        style={accent ? { color: "var(--ember)" } : undefined}
      >
        {value}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-ink-mute">
        {label}
      </div>
    </div>
  );
}

function relativeDate(iso: string, nowIso: string): string {
  const ms = new Date(nowIso).getTime() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return "oggi";
  if (days < 7) return `${days}g fa`;
  if (days < 30) return `${Math.round(days / 7)}sett`;
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}
