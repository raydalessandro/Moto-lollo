export type ScreenKey =
  | "home"
  | "registra"
  | "pianifica"
  | "community"
  | "garage"
  | "gruppi"
  | "classifica"
  | "profilo";

export interface NavItem {
  key: ScreenKey;
  label: string;
  iconPaths: string; // single-path SVG d
}

// SVG paths extracted from the prototype's icon set (lucide-compatible 24x24).
export const navItems: NavItem[] = [
  {
    key: "home",
    label: "Home",
    iconPaths: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2z M9 22V12h6v10",
  },
  {
    key: "registra",
    label: "Registra",
    iconPaths: "M6 3l14 9-14 9z",
  },
  {
    key: "pianifica",
    label: "Pianifica",
    iconPaths: "M9 3L3 6v15l6-3 6 3 6-3V3l-6 3z M9 3v15 M15 6v15",
  },
  {
    key: "community",
    label: "Feed",
    iconPaths:
      "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
  },
  {
    key: "garage",
    label: "Garage",
    iconPaths:
      "M5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M5 15l3-7 4 7 3-7h-3 M15 8h3",
  },
  {
    key: "gruppi",
    label: "Gruppi",
    iconPaths:
      "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    key: "classifica",
    label: "Classifica",
    iconPaths:
      "M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22 M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22 M18 2H6v7a6 6 0 0 0 12 0z",
  },
  {
    key: "profilo",
    label: "Profilo",
    iconPaths:
      "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  },
];
