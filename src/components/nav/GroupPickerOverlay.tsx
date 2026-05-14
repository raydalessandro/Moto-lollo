"use client";

import { useEffect } from "react";
import { Icon } from "./Icon";
import type { Group } from "@/types/domain";

interface GroupPickerOverlayProps {
  open: boolean;
  groups: Group[];
  currentGroupId: string;
  onPick: (groupId: string) => void;
  onExplore: () => void;
  onClose: () => void;
}

/**
 * Bottom-sheet style overlay that lets the user switch the active group.
 * Opened by long-press on the GRUPPO toggle in the Header.
 */
export function GroupPickerOverlay({
  open,
  groups,
  currentGroupId,
  onPick,
  onExplore,
  onClose,
}: GroupPickerOverlayProps) {
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        style={{ pointerEvents: open ? "auto" : "none" }}
      />

      {/* Sheet, slides down from the top */}
      <aside
        role="dialog"
        aria-modal="true"
        className="absolute left-1/2 top-0 w-full max-w-3xl -translate-x-1/2 border-b border-line bg-bg shadow-2xl transition-transform duration-300 ease-out"
        style={{
          transform: open ? "translate(-50%, 0)" : "translate(-50%, -100%)",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <header className="flex items-center justify-between border-b border-line px-4 pt-3 pb-2">
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-dim">
            ▸ Scegli un gruppo
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
          {groups.map((g) => {
            const isActive = g.id === currentGroupId;
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => onPick(g.id)}
                  className="flex w-full items-center gap-3 rounded-lg border bg-panel px-3 py-2.5 text-left transition-colors"
                  style={{
                    borderColor: isActive ? g.crestColor : "var(--line)",
                    background: isActive
                      ? `${g.crestColor}12`
                      : "var(--panel)",
                  }}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: `${g.crestColor}25`,
                      color: g.crestColor,
                      border: `1px solid ${g.crestColor}55`,
                    }}
                  >
                    {g.tag}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className="truncate font-display text-sm font-semibold"
                        style={{ color: isActive ? g.crestColor : "var(--ink)" }}
                      >
                        {g.name}
                      </p>
                      {isActive && (
                        <span
                          className="font-mono text-[9px] uppercase tracking-widest"
                          style={{ color: g.crestColor }}
                        >
                          · attivo
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-ink-dim">
                      {g.area ?? "—"} · {g.membersCount} membri
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

          {/* Esplora altri */}
          <li className="mt-2 border-t border-line pt-2">
            <button
              type="button"
              onClick={onExplore}
              className="flex w-full items-center gap-3 rounded-lg border border-dashed border-line bg-bg px-3 py-2.5 text-left transition-colors hover:border-ember/40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-dashed border-line text-ink-dim">
                <Icon d="M12 5v14 M5 12h14" size={14} />
              </span>
              <div className="flex-1">
                <p className="font-display text-sm font-semibold">
                  Esplora altri gruppi
                </p>
                <p className="text-[11px] text-ink-dim">
                  Trova e iscriviti a un gruppo pubblico
                </p>
              </div>
              <Icon
                d="M9 18l6-6-6-6"
                size={12}
                className="text-ink-mute"
              />
            </button>
          </li>
        </ul>

        <footer className="border-t border-line px-4 py-2 text-center font-mono text-[9px] uppercase tracking-widest text-ink-mute">
          tieni premuto GRUPPO per riaprire
        </footer>
      </aside>
    </div>
  );
}
