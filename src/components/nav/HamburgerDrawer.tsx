"use client";

import { useEffect } from "react";
import { Icon } from "./Icon";
import { useQuery } from "@/mocks/DbProvider";
import { getProfile } from "@/mocks/queries";

export type DrawerDestination =
  | "profilo"
  | "eventi"
  | "classifica"
  | "impostazioni"
  | "privacy"
  | "logout";

interface HamburgerDrawerProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (dest: DrawerDestination) => void;
}

interface DrawerItem {
  key: DrawerDestination;
  label: string;
  description: string;
  iconPath: string;
}

const ITEMS: DrawerItem[] = [
  {
    key: "profilo",
    label: "Profilo",
    description: "Identità pubblica, statistiche, badge",
    iconPath:
      "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  },
  {
    key: "eventi",
    label: "Eventi",
    description: "Raduni, track day, fiere — eventi curati",
    iconPath: "M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18",
  },
  {
    key: "classifica",
    label: "Classifica percorsi",
    description: "I percorsi top della community",
    iconPath:
      "M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22 M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22 M18 2H6v7a6 6 0 0 0 12 0z",
  },
  {
    key: "impostazioni",
    label: "Impostazioni",
    description: "Tema, lingua, unità, notifiche",
    iconPath:
      "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  },
  {
    key: "privacy",
    label: "Privacy & Policy",
    description: "Visibilità, consensi, termini",
    iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  },
  {
    key: "logout",
    label: "Esci",
    description: "Termina la sessione",
    iconPath:
      "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  },
];

export function HamburgerDrawer({ open, onClose, onNavigate }: HamburgerDrawerProps) {
  const me = useQuery((db, userId) => getProfile(db, userId));

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
        className="absolute left-0 top-0 flex h-full w-[82%] max-w-sm flex-col border-r border-line bg-bg shadow-2xl transition-transform duration-300 ease-out"
        style={{
          transform: open ? "translateX(0)" : "translateX(-100%)",
          pointerEvents: open ? "auto" : "none",
        }}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            {me && (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-bold"
                style={{ background: me.accentColor, color: "var(--bg)" }}
              >
                {me.initials}
              </div>
            )}
            <div>
              <div className="font-display text-sm font-semibold">
                {me?.displayName}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                @{me?.username}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-dim hover:text-ink"
          >
            <Icon d="M18 6L6 18 M6 6l12 12" size={16} />
          </button>
        </header>

        <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
          <ul className="flex flex-col gap-1 px-3">
            {ITEMS.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate(item.key);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-panel"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-ember"
                    style={item.key === "logout" ? { color: "var(--danger)" } : undefined}
                  >
                    <Icon d={item.iconPath} size={16} />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="font-display text-sm font-semibold">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-ink-dim">
                      {item.description}
                    </span>
                  </span>
                  <Icon
                    d="M9 18l6-6-6-6"
                    size={14}
                    className="text-ink-mute"
                  />
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <footer className="border-t border-line px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Moto_App · v0.1 · prototipo UX
        </footer>
      </aside>
    </div>
  );
}
