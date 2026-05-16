"use client";

import { useMemo, useRef, useState } from "react";
import { useDb, useQuery } from "@/mocks/DbProvider";
import {
  listMyMotorcycles,
  listMaintenanceForBike,
  getPrimaryMotorcycle,
  listMyDocuments,
} from "@/mocks/queries";
import { Icon } from "@/components/nav/Icon";
import { GarageDetailModal, type GarageCategory } from "./GarageDetailModal";
import { VehiclePickerOverlay } from "./VehiclePickerOverlay";
import type { Document, MaintenanceRecord, Motorcycle } from "@/types/domain";

function daysUntil(iso: string, nowIso: string): number {
  return Math.round(
    (new Date(iso).getTime() - new Date(nowIso).getTime()) / 86_400_000,
  );
}

type StatusLevel = "ok" | "soon" | "late";

function colorForStatus(level: StatusLevel): string {
  switch (level) {
    case "ok":
      return "var(--ok)";
    case "soon":
      return "var(--warn)";
    case "late":
      return "var(--danger)";
  }
}

interface CategoryStatus {
  level: StatusLevel;
  primaryLabel: string; // es. "Bollo · tra 18g" o "Tutto ok"
  secondaryLabel?: string; // es. "scadenza 15 nov"
}

/**
 * Calcola lo stato della categoria Pagamenti (bollo + assicurazione).
 * Trova il documento più imminente, classifica per giorni rimanenti.
 */
function pagamentiStatus(
  docs: Document[],
  now: string,
): CategoryStatus {
  const items = docs
    .filter((d) => d.kind === "bollo" || d.kind === "assicurazione")
    .map((d) => ({ doc: d, days: daysUntil(d.expiresAt, now) }))
    .sort((a, b) => a.days - b.days);

  if (items.length === 0) {
    return { level: "ok", primaryLabel: "Nessun pagamento" };
  }
  const next = items[0];
  const kindLabel = next.doc.kind === "bollo" ? "Bollo" : "Assicurazione";
  if (next.days < 0) {
    return {
      level: "late",
      primaryLabel: `${kindLabel} scaduto`,
      secondaryLabel: `da ${-next.days} giorni`,
    };
  }
  if (next.days <= 60) {
    return {
      level: "soon",
      primaryLabel: `${kindLabel} tra ${next.days}g`,
      secondaryLabel: new Date(next.doc.expiresAt).toLocaleDateString("it-IT", {
        day: "numeric",
        month: "short",
      }),
    };
  }
  return {
    level: "ok",
    primaryLabel: "Tutto regolare",
    secondaryLabel: `prossimo: ${kindLabel.toLowerCase()} ${next.days}g`,
  };
}

/**
 * Categoria Controlli: revisione (Document) + manutenzioni (storico).
 * Lo stato è guidato dalla revisione; il sub-label informa sul tagliando.
 */
function controlliStatus(
  docs: Document[],
  maint: MaintenanceRecord[],
  bikeTotalKm: number,
  now: string,
): CategoryStatus {
  const revisione = docs
    .filter((d) => d.kind === "revisione")
    .map((d) => ({ doc: d, days: daysUntil(d.expiresAt, now) }))
    .sort((a, b) => a.days - b.days)[0];

  const lastTagliando = maint
    .filter((m) => m.kind === "tagliando")
    .sort((a, b) => b.kmAtService - a.kmAtService)[0];

  if (!revisione) {
    return {
      level: "ok",
      primaryLabel: "Nessuna revisione registrata",
      secondaryLabel: lastTagliando
        ? `ult. tagliando ${bikeTotalKm - lastTagliando.kmAtService} km fa`
        : undefined,
    };
  }
  const subLast = lastTagliando
    ? `ult. tagliando ${(bikeTotalKm - lastTagliando.kmAtService).toLocaleString("it-IT")} km fa`
    : undefined;

  if (revisione.days < 0) {
    return {
      level: "late",
      primaryLabel: "Revisione scaduta",
      secondaryLabel: `da ${-revisione.days} giorni`,
    };
  }
  if (revisione.days <= 60) {
    return {
      level: "soon",
      primaryLabel: `Revisione tra ${revisione.days}g`,
      secondaryLabel: new Date(revisione.doc.expiresAt).toLocaleDateString(
        "it-IT",
        { day: "numeric", month: "short" },
      ),
    };
  }
  return { level: "ok", primaryLabel: "Tutto regolare", secondaryLabel: subLast };
}

function documentiStatus(docs: Document[], now: string): CategoryStatus {
  const personal = docs
    .filter((d) => d.kind === "patente")
    .map((d) => ({ doc: d, days: daysUntil(d.expiresAt, now) }))
    .sort((a, b) => a.days - b.days);

  if (personal.length === 0) {
    return { level: "ok", primaryLabel: "Nessun documento" };
  }
  const next = personal[0];
  if (next.days < 0) {
    return {
      level: "late",
      primaryLabel: "Patente scaduta",
      secondaryLabel: `da ${-next.days} giorni`,
    };
  }
  if (next.days <= 90) {
    return {
      level: "soon",
      primaryLabel: `Patente tra ${next.days}g`,
      secondaryLabel: new Date(next.doc.expiresAt).toLocaleDateString("it-IT", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };
  }
  const yrs = Math.floor(next.days / 365);
  return {
    level: "ok",
    primaryLabel: "Patente valida",
    secondaryLabel: yrs >= 1 ? `${yrs} ${yrs === 1 ? "anno" : "anni"}` : `${next.days}g`,
  };
}

function storicoStatus(
  maint: MaintenanceRecord[],
  bike: Motorcycle | undefined,
): CategoryStatus {
  const totalSpent = maint.reduce((s, m) => s + (m.costEur ?? 0), 0);
  const km = bike?.totalKm ?? 0;
  return {
    level: "ok",
    primaryLabel: `${km.toLocaleString("it-IT")} km`,
    secondaryLabel: `${maint.length} interventi · €${totalSpent.toLocaleString("it-IT")}`,
  };
}

const CATEGORY_META: Record<
  GarageCategory,
  { title: string; iconPath: string }
> = {
  pagamenti: {
    title: "Pagamenti",
    // euro sign in cerchio
    iconPath:
      "M12 22 a10 10 0 1 1 0 -20 a10 10 0 0 1 0 20z M7 10 h8 M7 14 h8 M17 7 c-1.5-1.5-3-2-5-2 c-3 0-6 3-6 7 s3 7 6 7 c2 0 3.5-0.5 5-2",
  },
  controlli: {
    title: "Controlli",
    // wrench
    iconPath:
      "M14.7 6.3 a1 1 0 0 0 0 1.4 l1.6 1.6 a1 1 0 0 0 1.4 0 l3.77-3.77 a6 6 0 0 1 -7.94 7.94 l-6.91 6.91 a2.12 2.12 0 0 1 -3-3 l6.91-6.91 a6 6 0 0 1 7.94-7.94 l-3.76 3.76z",
  },
  documenti: {
    title: "Documenti",
    iconPath:
      "M14 2 H6 a2 2 0 0 0 -2 2 v16 a2 2 0 0 0 2 2 h12 a2 2 0 0 0 2-2 V8z M14 2 v6 h6 M16 13 H8 M16 17 H8 M10 9 H8",
  },
  storico: {
    title: "Storico",
    iconPath: "M3 3 v18 h18 M7 15 v3 M11 11 v7 M15 7 v11 M19 13 v5",
  },
};

export function GarageScreen() {
  const { setPrimaryMotorcycle } = useDb();
  const bikes = useQuery((db, userId) => listMyMotorcycles(db, userId));
  const primary = useQuery((db, userId) => getPrimaryMotorcycle(db, userId));
  const docs = useQuery((db, userId) => listMyDocuments(db, userId));
  const now = useQuery((_db, _userId, n) => n);
  const maintenance = useQuery((db) =>
    primary ? listMaintenanceForBike(db, primary.id) : [],
  );
  const [openCategory, setOpenCategory] = useState<GarageCategory | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Doc filtrati per la moto primaria (se motorcycleId è settato) + ownerLevel.
  const bikeDocs = useMemo(
    () =>
      docs.filter(
        (d) =>
          d.motorcycleId === undefined ||
          (primary && d.motorcycleId === primary.id),
      ),
    [docs, primary],
  );

  const statuses = useMemo(
    () => ({
      pagamenti: pagamentiStatus(bikeDocs, now),
      controlli: controlliStatus(bikeDocs, maintenance, primary?.totalKm ?? 0, now),
      documenti: documentiStatus(bikeDocs, now),
      storico: storicoStatus(maintenance, primary),
    }),
    [bikeDocs, maintenance, primary, now],
  );

  const currentIdx = primary ? bikes.findIndex((b) => b.id === primary.id) : -1;
  const cycleVehicle = (direction: 1 | -1) => {
    if (bikes.length < 2 || currentIdx < 0) return;
    const next = (currentIdx + direction + bikes.length) % bikes.length;
    setPrimaryMotorcycle(bikes[next].id);
  };

  const vehicleNoun = primary?.kind === "auto" ? "auto" : "moto";

  return (
    <div className="screen-enter flex flex-col gap-4 p-4 pb-24">
      <header className="flex items-baseline justify-between">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ember">
            ▸ Garage
          </span>
          {primary && (
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
              {primary.brand} {primary.model}
            </h1>
          )}
        </div>
        <button
          type="button"
          className="font-mono text-[10px] uppercase tracking-widest text-ink-dim hover:text-ember"
          aria-label={`Aggiungi ${vehicleNoun}`}
        >
          + nuovo veicolo
        </button>
      </header>

      {primary && (
        <PrimaryBikeHero
          bike={primary}
          totalCount={bikes.length}
          index={currentIdx}
          onSwipe={cycleVehicle}
          onOpenPicker={() => setPickerOpen(true)}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(CATEGORY_META) as GarageCategory[]).map((cat) => (
          <CategoryCard
            key={cat}
            category={cat}
            status={statuses[cat]}
            onClick={() => setOpenCategory(cat)}
          />
        ))}
      </div>

      <VehiclePickerOverlay
        open={pickerOpen}
        vehicles={bikes}
        currentId={primary?.id ?? ""}
        onPick={(id) => {
          setPrimaryMotorcycle(id);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />

      {openCategory && primary && (
        <GarageDetailModal
          category={openCategory}
          title={CATEGORY_META[openCategory].title}
          bike={primary}
          docs={bikeDocs}
          maintenance={maintenance}
          now={now}
          onClose={() => setOpenCategory(null)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function PrimaryBikeHero({
  bike,
  totalCount,
  index,
  onSwipe,
  onOpenPicker,
}: {
  bike: Motorcycle;
  totalCount: number;
  index: number;
  onSwipe: (direction: 1 | -1) => void;
  onOpenPicker: () => void;
}) {
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const isAuto = bike.kind === "auto";
  const noun = isAuto ? "auto" : "moto";
  const ccUnit = isAuto ? "cm³" : "cc";

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.t;
    // Swipe orizzontale: > 50px, prevalentemente orizzontale, < 600ms
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 600) {
      onSwipe(dx < 0 ? 1 : -1);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-line p-4 select-none"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,106,31,0.12) 0%, rgba(255,106,31,0.04) 50%, var(--panel) 100%)",
        touchAction: "pan-y",
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Silhouette dinamico moto/auto */}
      <svg
        viewBox="0 0 200 80"
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.08]"
        style={{ width: "70%", maxWidth: 280 }}
        fill="none"
        stroke="var(--ember)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isAuto ? (
          <>
            <path d="M20 58 L36 36 L80 30 L120 30 L150 38 L180 44 L182 58 Z" />
            <path d="M20 58 L182 58" />
            <circle cx={55} cy={62} r={10} />
            <circle cx={150} cy={62} r={10} />
            <path d="M80 30 L80 50 M115 30 L115 50" />
          </>
        ) : (
          <>
            <circle cx={40} cy={56} r={16} />
            <circle cx={160} cy={56} r={16} />
            <path d="M40 56 L70 30 L110 30 L130 56 L160 56" />
            <path d="M70 30 L85 18 L110 18" />
            <path d="M110 18 L115 30" />
            <path d="M100 30 L100 45" />
          </>
        )}
      </svg>

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ember/80">
            {noun} primaria
          </div>
          {bike.name && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (totalCount > 1) onOpenPicker();
              }}
              className="mt-1 inline-flex items-center gap-1.5 font-display text-lg font-semibold italic transition-colors hover:text-ember"
              aria-label="Cambia veicolo"
            >
              <span>«{bike.name}»</span>
              {totalCount > 1 && (
                <span
                  className="font-mono text-[10px] not-italic text-ink-dim"
                  aria-hidden
                >
                  ▾
                </span>
              )}
            </button>
          )}
          <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
            {bike.year ?? "—"}
            {bike.engineCc && ` · ${bike.engineCc} ${ccUnit}`}
            {bike.color && ` · ${bike.color}`}
          </div>
        </div>
      </div>

      <div className="relative mt-6 flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-3xl font-medium tabular-nums leading-none text-ember">
            {bike.totalKm.toLocaleString("it-IT")}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink-dim">
            km totali
          </span>
        </div>

        {totalCount > 1 && (
          <div
            className="flex items-center gap-1.5"
            aria-label={`Veicolo ${index + 1} di ${totalCount}`}
          >
            {Array.from({ length: totalCount }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === index ? 14 : 5,
                  background:
                    i === index ? "var(--ember)" : "rgba(255,255,255,0.18)",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  status,
  onClick,
}: {
  category: GarageCategory;
  status: CategoryStatus;
  onClick: () => void;
}) {
  const meta = CATEGORY_META[category];
  const statusColor = colorForStatus(status.level);
  const isAlert = status.level !== "ok";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2 rounded-xl border bg-panel p-3 text-left transition-colors hover:bg-panel-raised"
      style={{ borderColor: isAlert ? `${statusColor}66` : "var(--line)" }}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{
            background: isAlert ? `${statusColor}1a` : "var(--line-soft)",
            color: isAlert ? statusColor : "var(--ink-soft)",
          }}
        >
          <Icon d={meta.iconPath} size={16} />
        </div>
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: statusColor }}
        />
      </div>
      <div>
        <div className="font-mono text-[9px] uppercase tracking-widest text-ink-dim">
          {meta.title}
        </div>
        <div
          className="mt-0.5 font-display text-[13px] font-semibold leading-tight"
          style={isAlert ? { color: statusColor } : undefined}
        >
          {status.primaryLabel}
        </div>
        {status.secondaryLabel && (
          <div className="mt-0.5 truncate font-mono text-[10px] text-ink-dim">
            {status.secondaryLabel}
          </div>
        )}
      </div>
    </button>
  );
}
