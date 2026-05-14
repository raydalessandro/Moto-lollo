"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Icon } from "@/components/nav/Icon";
import { useQuery } from "@/mocks/DbProvider";
import { listMyPlannedRoutes } from "@/mocks/queries";
import type { PlannedRoute, Visibility } from "@/types/domain";

type ArchiveFilter = "all" | "mine" | "saved";

const FILTERS: Array<{ key: ArchiveFilter; label: string }> = [
  { key: "all",   label: "Tutti" },
  { key: "mine",  label: "Creati da me" },
  { key: "saved", label: "Salvati" },
];

const VIS_LABEL: Record<Visibility, string> = {
  private: "privato",
  followers: "follower",
  public: "pubblico",
};

export function MappaScreen() {
  const [filter, setFilter] = useState<ArchiveFilter>("all");
  // "Saved" bucket renders SavedRoute → PublishedRoute joined back. Wiring
  // pending in a follow-up screen iteration.
  const myCreated = useQuery((db, userId) => listMyPlannedRoutes(db, userId));
  const saved: PlannedRoute[] = [];

  const visible =
    filter === "mine"  ? myCreated :
    filter === "saved" ? saved :
    [...myCreated, ...saved];

  const totalKm = visible.reduce((acc, r) => acc + r.distanceKm, 0);

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ember">
          ▸ Mappa
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          I tuoi percorsi
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {visible.length} percorsi · {totalKm.toLocaleString("it-IT", { maximumFractionDigits: 0 })} km totali
        </p>
      </section>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {FILTERS.map((f) => (
          <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </Chip>
        ))}
      </div>

      <section>
        <SectionLabel num="01" action="Nuovo">Archivio</SectionLabel>
        <div className="flex flex-col gap-3">
          {visible.length === 0 && filter === "saved" && (
            <EmptyState
              title="Nessun percorso salvato"
              body="Quando salvi un percorso da Mondo o da un Gruppo, lo trovi qui pronto da navigare o ripubblicare."
            />
          )}
          {visible.length === 0 && filter !== "saved" && (
            <EmptyState
              title="Niente in archivio"
              body="Crea un percorso da Registra → Crea un percorso, o importa un GPX."
            />
          )}
          {visible.map((r) => (
            <RouteCard key={r.id} route={r} />
          ))}
        </div>
      </section>

      <section>
        <SectionLabel num="02">Da costruire</SectionLabel>
        <ul className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4 text-sm text-ink-soft">
          {[
            "Mini-mappa anteprima del tracciato per ogni percorso",
            "Tap percorso → dettaglio fullscreen (statistiche, replay, condivisione)",
            "Pubblica su Mondo / pubblica solo dentro un gruppo",
            "Wiring sezione \"Salvati\" (SavedRoute esiste, manca il render)",
            "Filtri avanzati per tag, area, durata",
            "Modifica / duplica / elimina percorso",
          ].map((b, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-[7px] inline-block h-[5px] w-[5px] rounded-full bg-ember" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function RouteCard({ route }: { route: PlannedRoute }) {
  return (
    <Card onClick={() => {}}>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="font-display text-base font-semibold">{route.title}</div>
          {route.notes && (
            <div className="text-sm text-ink-dim">{route.notes}</div>
          )}
        </div>
        <Chip size="sm" active={route.visibility === "public"}>
          {VIS_LABEL[route.visibility]}
        </Chip>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-ink-dim">
        <span>{route.distanceKm} km</span>
        <span>
          {Math.floor(route.estimatedDurationMin / 60)}h {route.estimatedDurationMin % 60}m
        </span>
        <span>{route.waypoints.length} waypoint</span>
        <div className="ml-auto flex gap-1">
          {route.tags.slice(0, 3).map((t) => (
            <Chip key={t} size="sm">#{t}</Chip>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 text-[11px] uppercase tracking-wider text-ink-soft transition-colors hover:border-line-soft hover:text-ink"
        >
          <Icon d="M3 11l19-9-9 19-2-8z" size={12} />
          Naviga
        </button>
        <button
          type="button"
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-ember/40 bg-ember/10 px-3 py-1.5 text-[11px] uppercase tracking-wider text-ember transition-colors hover:bg-ember/15"
        >
          <Icon d="M4 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M20 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M20 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M8.59 13.51l6.83 3.98 M15.41 6.51l-6.82 3.98" size={12} />
          Pubblica
        </button>
      </div>
    </Card>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-panel/60 p-6 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink-mute">
        <Icon
          d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3z M9 3v15 M15 6v15"
          size={16}
        />
      </div>
      <div className="font-display text-sm font-semibold">{title}</div>
      <p className="mt-1 text-[12px] text-ink-dim">{body}</p>
    </div>
  );
}
