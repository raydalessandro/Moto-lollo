/**
 * 3-pillar navigation model from the prototype.
 * Each pillar has its own set of tabs and its own accent color.
 */

export type Pillar = "io" | "gruppo" | "mondo";

export type ScreenKey =
  // IO
  | "io.home"
  | "io.mappa"
  | "io.garage"
  // GRUPPO
  | "gruppo.home"
  | "gruppo.pianifica"
  | "gruppo.cordata"
  | "gruppo.storia"
  | "gruppo.diario"
  // MONDO
  | "mondo.feed"
  | "mondo.eventi"
  | "mondo.classifica";

export interface TabDef {
  key: ScreenKey;
  label: string;
  iconPath: string;
  live?: boolean;
}

export interface PillarDef {
  key: Pillar;
  label: string;
  subtitle: string;
  accent: string;
  defaultScreen: ScreenKey;
  tabs: TabDef[];
}

// Lucide-compatible 24x24 paths, extracted from the prototype icon set.
const I = {
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2z M9 22V12h6v10",
  map: "M9 3L3 6v15l6-3 6 3 6-3V3l-6 3z M9 3v15 M15 6v15",
  plus: "M12 5v14 M5 12h14",
  play: "M6 3l14 9-14 9z",
  wrench:
    "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  users:
    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  calendar: "M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18",
  radio:
    "M4.93 19.07a10 10 0 0 1 0-14.14 M19.07 4.93a10 10 0 0 1 0 14.14 M7.76 16.24a5 5 0 0 1 0-8.48 M16.24 7.76a5 5 0 0 1 0 8.48",
  flag: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22V15",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M4 19.5V4a2 2 0 0 1 2-2h14v15 M6.5 17H20v5H6.5a2.5 2.5 0 0 1 0-5z",
  feed:
    "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
  trophy:
    "M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22 M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22 M18 2H6v7a6 6 0 0 0 12 0z",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
};

export const PILLARS: Record<Pillar, PillarDef> = {
  io: {
    key: "io",
    label: "IO",
    subtitle: "personale",
    accent: "#ff6a1f",
    defaultScreen: "io.home",
    tabs: [
      { key: "io.home",   label: "Home",   iconPath: I.home },
      { key: "io.mappa",  label: "Mappa",  iconPath: I.map },
      { key: "io.garage", label: "Garage", iconPath: I.wrench },
    ],
  },
  gruppo: {
    key: "gruppo",
    label: "GRUPPO",
    subtitle: "", // filled at runtime with the current group tag
    accent: "#ff6a1f", // overridden at runtime by current group color
    defaultScreen: "gruppo.home",
    tabs: [
      { key: "gruppo.home",      label: "Gruppo",    iconPath: I.users },
      { key: "gruppo.pianifica", label: "Pianifica", iconPath: I.calendar },
      { key: "gruppo.cordata",   label: "Cordata",   iconPath: I.radio, live: true },
      { key: "gruppo.storia",    label: "Storia",    iconPath: I.flag },
      { key: "gruppo.diario",    label: "Diario",    iconPath: I.book },
    ],
  },
  mondo: {
    key: "mondo",
    label: "MONDO",
    subtitle: "community",
    accent: "#6bb0ff",
    defaultScreen: "mondo.feed",
    tabs: [
      { key: "mondo.feed",       label: "Feed",     iconPath: I.feed },
      { key: "mondo.eventi",     label: "Eventi",   iconPath: I.calendar },
      { key: "mondo.classifica", label: "Classif.", iconPath: I.trophy },
    ],
  },
};

export const PILLAR_ORDER: Pillar[] = ["io", "gruppo", "mondo"];

export function pillarOf(screen: ScreenKey): Pillar {
  return screen.split(".")[0] as Pillar;
}
