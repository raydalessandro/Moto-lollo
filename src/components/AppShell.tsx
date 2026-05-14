"use client";

import { useState } from "react";
import { Header } from "./nav/Header";
import { BottomNav } from "./nav/BottomNav";
import { HamburgerDrawer, type DrawerDestination } from "./nav/HamburgerDrawer";
import {
  PILLARS,
  pillarOf,
  type Pillar,
  type ScreenKey,
} from "./nav/pillars";
import { useQuery } from "@/mocks/DbProvider";
import { listMyGroups } from "@/mocks/queries";

import { HomeScreen } from "@/features/io/HomeScreen";
import { MappaScreen } from "@/features/io/MappaScreen";
import { CreaScreen } from "@/features/io/CreaScreen";
import { GarageScreen } from "@/features/io/GarageScreen";

import { GruppoHomeScreen } from "@/features/gruppo/GruppoHomeScreen";
import { PianificaScreen } from "@/features/gruppo/PianificaScreen";
import { CordataScreen } from "@/features/gruppo/CordataScreen";
import { StoriaScreen } from "@/features/gruppo/StoriaScreen";
import { DiarioScreen } from "@/features/gruppo/DiarioScreen";

import { FeedScreen } from "@/features/mondo/FeedScreen";
import { EventiScreen } from "@/features/mondo/EventiScreen";
import { ClassificaScreen } from "@/features/mondo/ClassificaScreen";
// ProfiloScreen lives in features/mondo for now but is no longer a MONDO tab.
// Reachable through the hamburger drawer (DrawerOverlay below).
import { ProfiloScreen } from "@/features/mondo/ProfiloScreen";

type Overlay = null | { kind: "profilo" } | { kind: "impostazioni" } | { kind: "privacy" };

export function AppShell() {
  const myGroups = useQuery((db, userId) => listMyGroups(db, userId));
  const [screen, setScreen] = useState<ScreenKey>("io.home");
  const [currentGroupId, setCurrentGroupId] = useState<string>(myGroups[0]?.id ?? "g1");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);

  const pillar: Pillar = pillarOf(screen);
  const currentGroup = myGroups.find((g) => g.id === currentGroupId) ?? myGroups[0];

  const handlePillarChange = (p: Pillar) => {
    if (p !== pillar) {
      setScreen(PILLARS[p].defaultScreen);
    }
  };

  const handleDrawerNavigate = (dest: DrawerDestination) => {
    if (dest === "logout") {
      // No-op in prototipo. In produzione: clear session + redirect login.
      return;
    }
    setOverlay({ kind: dest });
  };

  const renderScreen = (): React.ReactNode => {
    switch (screen) {
      case "io.home":
        return <HomeScreen />;
      case "io.mappa":
        return <MappaScreen />;
      case "io.crea":
        return <CreaScreen />;
      case "io.garage":
        return <GarageScreen />;
      case "gruppo.home":
        return <GruppoHomeScreen group={currentGroup} />;
      case "gruppo.pianifica":
        return <PianificaScreen />;
      case "gruppo.cordata":
        return <CordataScreen group={currentGroup} />;
      case "gruppo.storia":
        return <StoriaScreen group={currentGroup} />;
      case "gruppo.diario":
        return <DiarioScreen group={currentGroup} />;
      case "mondo.feed":
        return <FeedScreen />;
      case "mondo.eventi":
        return <EventiScreen />;
      case "mondo.classifica":
        return <ClassificaScreen />;
    }
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col bg-bg">
      <Header
        pillar={pillar}
        currentGroup={currentGroup}
        onOpenMenu={() => setDrawerOpen(true)}
      />
      {pillar === "gruppo" && (
        <GroupSelector
          groups={myGroups}
          currentGroupId={currentGroup.id}
          onChange={setCurrentGroupId}
        />
      )}
      <main key={screen} className="flex-1 overflow-y-auto scrollbar-hide">
        {renderScreen()}
      </main>
      <BottomNav
        pillar={pillar}
        screen={screen}
        onPillarChange={handlePillarChange}
        onScreenChange={setScreen}
        currentGroup={currentGroup}
      />

      <HamburgerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={handleDrawerNavigate}
      />

      {overlay && <DrawerOverlay overlay={overlay} onClose={() => setOverlay(null)} />}
    </div>
  );
}

interface GroupSelectorProps {
  groups: ReturnType<typeof listMyGroups>;
  currentGroupId: string;
  onChange: (id: string) => void;
}

function GroupSelector({ groups, currentGroupId, onChange }: GroupSelectorProps) {
  return (
    <div className="shrink-0 border-b border-line bg-bg px-3 py-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {groups.map((g) => {
          const isActive = g.id === currentGroupId;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onChange(g.id)}
              className="flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 transition-colors"
              style={{
                borderColor: isActive ? g.crestColor : "var(--line)",
                background: isActive ? `${g.crestColor}15` : "var(--panel)",
                color: isActive ? g.crestColor : "var(--ink-dim)",
              }}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: g.crestColor }}
              />
              <span className="text-[11px] font-medium uppercase tracking-wider">
                {g.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DrawerOverlayProps {
  overlay: NonNullable<Overlay>;
  onClose: () => void;
}

function DrawerOverlay({ overlay, onClose }: DrawerOverlayProps) {
  const titles: Record<NonNullable<Overlay>["kind"], string> = {
    profilo: "Profilo",
    impostazioni: "Impostazioni",
    privacy: "Privacy & Policy",
  };

  return (
    <div className="screen-enter absolute inset-0 z-40 flex flex-col bg-bg">
      <header className="flex shrink-0 items-center justify-between border-b border-line bg-panel/90 px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[10px] uppercase tracking-widest text-ink-dim hover:text-ink"
        >
          ← chiudi
        </button>
        <span className="font-display text-sm uppercase tracking-[0.2em] text-ink">
          {titles[overlay.kind]}
        </span>
        <span className="w-12" />
      </header>
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        {overlay.kind === "profilo" && <ProfiloScreen />}
        {overlay.kind === "impostazioni" && <SettingsPlaceholder />}
        {overlay.kind === "privacy" && <PrivacyPlaceholder />}
      </main>
    </div>
  );
}

function SettingsPlaceholder() {
  return (
    <div className="flex flex-col gap-6 p-5 pb-24">
      <section>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ember">
          ▸ Impostazioni
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Preferenze
        </h1>
        <p className="mt-1 text-sm text-ink-dim">Da costruire nello Step 15.</p>
      </section>
      <ul className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4 text-sm text-ink-soft">
        {[
          "Tema: chiaro / scuro / auto",
          "Lingua: it / en",
          "Unità: metric / imperial",
          "Notifiche push e in-app",
          "Visibilità di default delle attività",
          "Auto-sync attivo",
        ].map((b, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-[7px] inline-block h-[5px] w-[5px] rounded-full bg-ember" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PrivacyPlaceholder() {
  return (
    <div className="flex flex-col gap-6 p-5 pb-24">
      <section>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ember">
          ▸ Privacy &amp; Policy
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          I tuoi dati
        </h1>
        <p className="mt-1 text-sm text-ink-dim">Da costruire nello Step 15.</p>
      </section>
      <ul className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4 text-sm text-ink-soft">
        {[
          "Profilo pubblico / privato",
          "Chi può vedere le mie attività",
          "Chi può commentare i miei percorsi",
          "Esporta i miei dati (CSV / JSON)",
          "Cancella account",
          "Termini di servizio · Privacy policy",
        ].map((b, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-[7px] inline-block h-[5px] w-[5px] rounded-full bg-ember" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
