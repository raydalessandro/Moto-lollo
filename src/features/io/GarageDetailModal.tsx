"use client";

import { useEffect } from "react";
import { Icon } from "@/components/nav/Icon";
import type { Document, MaintenanceRecord, Motorcycle } from "@/types/domain";

export type GarageCategory = "pagamenti" | "controlli" | "documenti" | "storico";

interface GarageDetailModalProps {
  category: GarageCategory;
  title: string;
  bike: Motorcycle;
  docs: Document[];
  maintenance: MaintenanceRecord[];
  now: string;
  onClose: () => void;
}

function daysUntil(iso: string, nowIso: string): number {
  return Math.round(
    (new Date(iso).getTime() - new Date(nowIso).getTime()) / 86_400_000,
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Modal fullscreen che mostra gli items della categoria scelta.
 * Read-only per ora: bottone "Aggiungi" è placeholder, attivazione vera
 * arriva quando organizziamo le sub-pagine (post-MVP nav).
 */
export function GarageDetailModal({
  category,
  title,
  bike,
  docs,
  maintenance,
  now,
  onClose,
}: GarageDetailModalProps) {
  // Escape key chiude.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <header
        className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3"
        style={{ background: "rgba(5,4,3,0.95)", backdropFilter: "blur(8px)" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:text-ink"
        >
          <Icon d="M15 18 L9 12 L15 6" size={14} />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-ember">
            {bike.brand} {bike.model}
          </span>
          <span className="font-display text-[13px] font-semibold">{title}</span>
        </div>
        <button
          type="button"
          aria-label="Aggiungi"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-ember/40 text-ember transition-colors hover:bg-ember/10"
        >
          <Icon d="M12 5v14 M5 12h14" size={14} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {category === "pagamenti" && (
          <PagamentiList docs={docs} now={now} />
        )}
        {category === "controlli" && (
          <ControlliList docs={docs} maint={maintenance} bike={bike} now={now} />
        )}
        {category === "documenti" && (
          <DocumentiList docs={docs} now={now} />
        )}
        {category === "storico" && (
          <StoricoList maint={maintenance} bike={bike} />
        )}
      </div>
    </div>
  );
}

// ─── Singoli render per categoria ───────────────────────────────────────────

function PagamentiList({ docs, now }: { docs: Document[]; now: string }) {
  const items = docs
    .filter((d) => d.kind === "bollo" || d.kind === "assicurazione")
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));

  if (items.length === 0) {
    return <EmptyState text="Nessun pagamento registrato" />;
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((d) => {
        const days = daysUntil(d.expiresAt, now);
        return (
          <DocRow
            key={d.id}
            title={d.kind === "bollo" ? "Bollo" : "Assicurazione"}
            subtitle={d.notes}
            days={days}
            isoDate={d.expiresAt}
          />
        );
      })}
    </div>
  );
}

function ControlliList({
  docs,
  maint,
  bike,
  now,
}: {
  docs: Document[];
  maint: MaintenanceRecord[];
  bike: Motorcycle;
  now: string;
}) {
  const revisione = docs
    .filter((d) => d.kind === "revisione")
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));

  return (
    <div className="flex flex-col gap-5">
      {revisione.length > 0 && (
        <section>
          <SectionHeader>Revisione</SectionHeader>
          <div className="flex flex-col gap-2">
            {revisione.map((d) => (
              <DocRow
                key={d.id}
                title="Revisione"
                subtitle={d.notes}
                days={daysUntil(d.expiresAt, now)}
                isoDate={d.expiresAt}
              />
            ))}
          </div>
        </section>
      )}
      <section>
        <SectionHeader>
          Manutenzione · {maint.length} {maint.length === 1 ? "voce" : "voci"}
        </SectionHeader>
        {maint.length === 0 ? (
          <EmptyState text="Nessuna manutenzione registrata" />
        ) : (
          <div className="flex flex-col gap-2">
            {maint.map((m) => (
              <MaintRow
                key={m.id}
                kind={m.kind}
                notes={m.notes}
                date={m.date}
                kmAtService={m.kmAtService}
                cost={m.costEur}
                bikeKm={bike.totalKm}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DocumentiList({ docs, now }: { docs: Document[]; now: string }) {
  const items = docs
    .filter((d) => d.kind === "patente")
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));

  if (items.length === 0) {
    return <EmptyState text="Nessun documento personale" />;
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((d) => (
        <DocRow
          key={d.id}
          title="Patente"
          subtitle={d.notes}
          days={daysUntil(d.expiresAt, now)}
          isoDate={d.expiresAt}
        />
      ))}
    </div>
  );
}

function StoricoList({
  maint,
  bike,
}: {
  maint: MaintenanceRecord[];
  bike: Motorcycle;
}) {
  const totalSpent = maint.reduce((s, m) => s + (m.costEur ?? 0), 0);
  const byKind = maint.reduce<Record<string, number>>((acc, m) => {
    acc[m.kind] = (acc[m.kind] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-2 gap-3">
        <StatBlock label="km totali" value={bike.totalKm.toLocaleString("it-IT")} unit="km" />
        <StatBlock label="speso" value={`€ ${totalSpent.toLocaleString("it-IT")}`} unit="" />
        <StatBlock label="interventi" value={String(maint.length)} unit="" />
        <StatBlock
          label="€/km medio"
          value={
            bike.totalKm > 0 ? `${(totalSpent / bike.totalKm).toFixed(3)}` : "—"
          }
          unit="€"
        />
      </section>

      {Object.keys(byKind).length > 0 && (
        <section>
          <SectionHeader>Suddivisione interventi</SectionHeader>
          <div className="flex flex-col gap-2">
            {Object.entries(byKind)
              .sort(([, a], [, b]) => b - a)
              .map(([kind, count]) => (
                <div
                  key={kind}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel px-3 py-2"
                >
                  <span className="font-display text-sm font-medium capitalize">
                    {kind}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-ink-dim">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Atom rows ──────────────────────────────────────────────────────────────

function DocRow({
  title,
  subtitle,
  days,
  isoDate,
}: {
  title: string;
  subtitle?: string;
  days: number;
  isoDate: string;
}) {
  const late = days < 0;
  const soon = !late && days <= 60;
  const color = late
    ? "var(--danger)"
    : soon
      ? "var(--warn)"
      : "var(--ok)";
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl border bg-panel px-4 py-3"
      style={{ borderColor: `${color}55` }}
    >
      <div className="min-w-0">
        <div className="font-display text-sm font-semibold">{title}</div>
        {subtitle && (
          <div className="mt-0.5 truncate font-mono text-[10px] text-ink-dim">
            {subtitle}
          </div>
        )}
      </div>
      <div className="text-right">
        <div
          className="font-mono text-[11px] uppercase tracking-widest"
          style={{ color }}
        >
          {late ? `scaduto ${-days}g fa` : days <= 1 ? `oggi/domani` : `tra ${days}g`}
        </div>
        <div className="mt-0.5 font-mono text-[10px] text-ink-mute">
          {formatDate(isoDate)}
        </div>
      </div>
    </div>
  );
}

function MaintRow({
  kind,
  notes,
  date,
  kmAtService,
  cost,
  bikeKm,
}: {
  kind: string;
  notes?: string;
  date: string;
  kmAtService: number;
  cost?: number;
  bikeKm: number;
}) {
  const kmAgo = bikeKm - kmAtService;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel px-3 py-2.5">
      <div className="min-w-0">
        <div className="font-display text-sm font-medium capitalize">{kind}</div>
        {notes && (
          <div className="mt-0.5 truncate font-mono text-[10px] text-ink-dim">
            {notes}
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="font-mono text-[11px] text-ink-soft tabular-nums">
          {kmAtService.toLocaleString("it-IT")} km
        </div>
        <div className="font-mono text-[9px] text-ink-mute">
          {formatDate(date)} · {kmAgo.toLocaleString("it-IT")} km fa
        </div>
        {cost != null && cost > 0 && (
          <div className="mt-0.5 font-mono text-[10px] text-ember">
            € {cost}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-dim">
      {children}
    </div>
  );
}

function StatBlock({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-3">
      <div className="font-mono text-[9px] uppercase tracking-widest text-ink-dim">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-display text-xl font-medium tabular-nums leading-none">
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-dim">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-line py-12 font-mono text-[11px] text-ink-dim">
      {text}
    </div>
  );
}
