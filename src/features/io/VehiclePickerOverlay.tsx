"use client";

import { useEffect } from "react";
import { Icon } from "@/components/nav/Icon";
import type { Motorcycle } from "@/types/domain";

interface VehiclePickerOverlayProps {
  open: boolean;
  vehicles: Motorcycle[];
  currentId: string;
  onPick: (vehicleId: string) => void;
  onClose: () => void;
}

const MOTO_ICON =
  "M5 17 a2 2 0 1 0 0 -4 a2 2 0 0 0 0 4z M19 17 a2 2 0 1 0 0 -4 a2 2 0 0 0 0 4z M7 15 h10 M9 11 l2-4 h4 l2 4";
const AUTO_ICON =
  "M5 11 l1.5-4 a2 2 0 0 1 2-1.5 h7 a2 2 0 0 1 2 1.5 L19 11 M5 11 h14 v6 h-2 v-2 H7 v2 H5 z M7 14 h1 M16 14 h1";

/**
 * Bottom-sheet picker per scegliere il veicolo attivo (moto o auto).
 * Si apre via long-press o tap sul chevron nell'hero del Garage.
 * Pattern: stesso UX del GroupPickerOverlay (slide-down).
 */
export function VehiclePickerOverlay({
  open,
  vehicles,
  currentId,
  onPick,
  onClose,
}: VehiclePickerOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-200"
      style={{ opacity: open ? 1 : 0 }}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        style={{ pointerEvents: open ? "auto" : "none" }}
      />

      <aside
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 top-0 mx-auto w-full max-w-3xl border-b border-line bg-bg shadow-2xl transition-transform duration-300 ease-out"
        style={{
          transform: open ? "translateY(0)" : "translateY(-100%)",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <header className="flex items-center justify-between border-b border-line px-4 pt-3 pb-2">
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-dim">
            ▸ Scegli un veicolo
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-dim hover:text-ink"
          >
            <Icon d="M18 6L6 18 M6 6l12 12" size={12} />
          </button>
        </header>

        <ul className="flex flex-col gap-1 px-3 py-3">
          {vehicles.map((v) => {
            const isActive = v.id === currentId;
            const isAuto = v.kind === "auto";
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => onPick(v.id)}
                  className="flex w-full items-center gap-3 rounded-lg border bg-panel px-3 py-2.5 text-left transition-colors"
                  style={{
                    borderColor: isActive ? "var(--ember)" : "var(--line)",
                    background: isActive ? "rgba(255,106,31,0.08)" : "var(--panel)",
                  }}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                    style={{
                      background: isActive
                        ? "rgba(255,106,31,0.18)"
                        : "var(--line-soft)",
                      color: isActive ? "var(--ember)" : "var(--ink-soft)",
                      border: isActive
                        ? "1px solid rgba(255,106,31,0.55)"
                        : "1px solid var(--line)",
                    }}
                  >
                    <Icon d={isAuto ? AUTO_ICON : MOTO_ICON} size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className="truncate font-display text-sm font-semibold"
                        style={{ color: isActive ? "var(--ember)" : "var(--ink)" }}
                      >
                        {v.brand} {v.model}
                      </p>
                      {isActive && (
                        <span className="font-mono text-[9px] uppercase tracking-widest text-ember">
                          · attivo
                        </span>
                      )}
                    </div>
                    <p className="truncate font-mono text-[10px] text-ink-dim">
                      «{v.name}» · {v.year ?? "—"} ·{" "}
                      {v.totalKm.toLocaleString("it-IT")} km
                    </p>
                  </div>
                  {!isActive && (
                    <Icon
                      d="M9 18l6-6-6-6"
                      size={12}
                      className="text-ink-mute"
                    />
                  )}
                </button>
              </li>
            );
          })}

          <li className="mt-2 border-t border-line pt-2">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg border border-dashed border-line bg-bg px-3 py-2.5 text-left transition-colors hover:border-ember/40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-dashed border-line text-ink-dim">
                <Icon d="M12 5v14 M5 12h14" size={14} />
              </span>
              <div className="flex-1">
                <p className="font-display text-sm font-semibold">Aggiungi veicolo</p>
                <p className="font-mono text-[10px] text-ink-dim">
                  Moto, auto, scooter — placeholder
                </p>
              </div>
            </button>
          </li>
        </ul>

        <footer className="border-t border-line px-4 py-2 text-center font-mono text-[9px] uppercase tracking-widest text-ink-mute">
          tieni premuto sull&apos;hero · oppure scorri ←/→
        </footer>
      </aside>
    </div>
  );
}
