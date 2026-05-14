"use client";

import { useState } from "react";
import { Header } from "./nav/Header";
import { BottomNav } from "./nav/BottomNav";
import { HamburgerDrawer, type DrawerDestination } from "./nav/HamburgerDrawer";
import { NavigationOverlay, type NavMode } from "./nav/NavigationOverlay";
import {
  PILLARS,
  pillarOf,
  type Pillar,
  type ScreenKey,
} from "./nav/pillars";
import { useQuery } from "@/mocks/DbProvider";
import { listMyGroups, listOtherGroups, listAllGroups } from "@/mocks/queries";
import type { Group } from "@/types/domain";

import { HomeScreen } from "@/features/io/HomeScreen";
import { MappaScreen } from "@/features/io/MappaScreen";
import { GarageScreen } from "@/features/io/GarageScreen";

import { GruppoHomeScreen } from "@/features/gruppo/GruppoHomeScreen";
import { PianificaScreen } from "@/features/gruppo/PianificaScreen";
import { CordataScreen } from "@/features/gruppo/CordataScreen";
import { StoriaScreen } from "@/features/gruppo/StoriaScreen";
import { DiarioScreen } from "@/features/gruppo/DiarioScreen";

// Feed lives in the IO pillar (3rd tab). Eventi + Classifica live in the drawer.
import { FeedScreen } from "@/features/mondo/FeedScreen";
import { EventiScreen } from "@/features/mondo/EventiScreen";
import { ClassificaScreen } from "@/features/mondo/ClassificaScreen";
import { ProfiloScreen } from "@/features/profilo/ProfiloScreen";

type Overlay =
  | null
  | { kind: "profilo" }
  | { kind: "eventi" }
  | { kind: "classifica" }
  | { kind: "impostazioni" }
  | { kind: "privacy" };

export function AppShell() {
  const myGroups = useQuery((db, userId) => listMyGroups(db, userId));
  const otherGroups = useQuery((db, userId) => listOtherGroups(db, userId));
  const allGroups = useQuery((db) => listAllGroups(db));
  const [screen, setScreen] = useState<ScreenKey>("io.home");
  const [currentGroupId, setCurrentGroupId] = useState<string>(myGroups[0]?.id ?? "g1");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [navMode, setNavMode] = useState<NavMode | null>(null);

  const pillar: Pillar = pillarOf(screen);
  // currentGroup can now be a group I'm NOT a member of (after discovery
  // tap). Fall back to listAllGroups so the lookup never returns undefined.
  const currentGroup =
    allGroups.find((g) => g.id === currentGroupId) ?? myGroups[0];
  const isMemberOfCurrent = myGroups.some((g) => g.id === currentGroup.id);

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
        return <HomeScreen onNavigate={setScreen} onStartNavigation={setNavMode} />;
      case "io.mappa":
        return <MappaScreen />;
      case "io.feed":
        return <FeedScreen />;
      case "io.garage":
        return <GarageScreen />;
      case "gruppo.home":
        return <GruppoHomeScreen group={currentGroup} isMember={isMemberOfCurrent} />;
      case "gruppo.pianifica":
        return <PianificaScreen group={currentGroup} isMember={isMemberOfCurrent} />;
      case "gruppo.cordata":
        return <CordataScreen group={currentGroup} onStartNavigation={setNavMode} />;
      case "gruppo.storia":
        return <StoriaScreen group={currentGroup} />;
      case "gruppo.diario":
        return <DiarioScreen group={currentGroup} />;
    }
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col bg-bg">
      <Header
        pillar={pillar}
        currentGroup={currentGroup}
        onOpenMenu={() => setDrawerOpen(true)}
        onPillarChange={handlePillarChange}
      />
      {pillar === "gruppo" && (
        <GroupSelector
          groups={myGroups}
          currentGroup={currentGroup}
          currentGroupId={currentGroup.id}
          onChange={setCurrentGroupId}
          onExplore={() => setExploreOpen(true)}
        />
      )}
      <main key={screen} className="flex-1 overflow-y-auto scrollbar-hide">
        {renderScreen()}
      </main>
      <BottomNav
        pillar={pillar}
        screen={screen}
        onScreenChange={setScreen}
        currentGroup={currentGroup}
      />

      <HamburgerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={handleDrawerNavigate}
      />

      {overlay && <DrawerOverlay overlay={overlay} onClose={() => setOverlay(null)} />}

      {exploreOpen && (
        <ExploreGroupsOverlay
          myGroups={myGroups}
          otherGroups={otherGroups}
          currentGroupId={currentGroup.id}
          onPick={(gid) => {
            setCurrentGroupId(gid);
            setScreen("gruppo.home");
            setExploreOpen(false);
          }}
          onClose={() => setExploreOpen(false)}
        />
      )}

      {navMode && (
        <NavigationOverlay mode={navMode} onClose={() => setNavMode(null)} />
      )}
    </div>
  );
}

interface GroupSelectorProps {
  groups: ReturnType<typeof listMyGroups>;
  currentGroup: Group;
  currentGroupId: string;
  onChange: (id: string) => void;
  onExplore: () => void;
}

function GroupSelector({
  groups,
  currentGroup,
  currentGroupId,
  onChange,
  onExplore,
}: GroupSelectorProps) {
  // When currentGroup is NOT in my groups (we entered through Esplora), show
  // it as the active chip prepended so the user understands the context.
  const inMyGroups = groups.some((g) => g.id === currentGroupId);
  return (
    <div className="shrink-0 border-b border-line bg-bg px-3 py-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {!inMyGroups && (
          <button
            type="button"
            disabled
            className="flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5"
            style={{
              borderColor: currentGroup.crestColor,
              background: `${currentGroup.crestColor}15`,
              color: currentGroup.crestColor,
            }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: currentGroup.crestColor }}
            />
            <span className="text-[11px] font-medium uppercase tracking-wider">
              {currentGroup.name}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest opacity-70">
              · ospite
            </span>
          </button>
        )}
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
        <button
          type="button"
          onClick={onExplore}
          className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-line bg-bg px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-dim transition-colors hover:border-ember/60 hover:text-ember"
        >
          + esplora
        </button>
      </div>
    </div>
  );
}

interface ExploreGroupsOverlayProps {
  myGroups: Group[];
  otherGroups: Group[];
  currentGroupId: string;
  onPick: (groupId: string) => void;
  onClose: () => void;
}

function ExploreGroupsOverlay({
  myGroups,
  otherGroups,
  currentGroupId,
  onPick,
  onClose,
}: ExploreGroupsOverlayProps) {
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
          Esplora gruppi
        </span>
        <span className="w-12" />
      </header>
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="flex flex-col gap-6 p-5 pb-24">
          {myGroups.length > 0 && (
            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-soft">
                  ▸ I tuoi gruppi
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                  {myGroups.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {myGroups.map((g) => (
                  <GroupRow
                    key={g.id}
                    group={g}
                    isMember
                    isCurrent={g.id === currentGroupId}
                    onClick={() => onPick(g.id)}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-soft">
                ▸ Scopri altri
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                {otherGroups.length} pubblici
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {otherGroups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line bg-panel/60 p-6 text-center text-sm text-ink-dim">
                  Sei già membro di tutti i gruppi che conosciamo.
                </div>
              ) : (
                otherGroups.map((g) => (
                  <GroupRow
                    key={g.id}
                    group={g}
                    isMember={false}
                    isCurrent={false}
                    onClick={() => onPick(g.id)}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function GroupRow({
  group,
  isMember,
  isCurrent,
  onClick,
}: {
  group: Group;
  isMember: boolean;
  isCurrent: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border bg-panel p-3 text-left transition-colors hover:border-line-soft"
      style={{
        borderColor: isCurrent ? group.crestColor : "var(--line)",
        background: isCurrent ? `${group.crestColor}10` : "var(--panel)",
      }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border font-display text-[11px] font-semibold uppercase"
        style={{
          background: `${group.crestColor}22`,
          color: group.crestColor,
          borderColor: `${group.crestColor}55`,
        }}
      >
        {group.tag}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-base font-semibold">{group.name}</span>
          {isMember && (
            <span
              className="font-mono text-[9px] uppercase tracking-widest"
              style={{ color: group.crestColor }}
            >
              · membro
            </span>
          )}
        </div>
        <div className="text-[11px] text-ink-dim">
          {group.area ?? "—"} · {group.membersCount} membri · {group.publicRoutesCount} percorsi pubblici
        </div>
      </div>
      <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
        →
      </span>
    </button>
  );
}

interface DrawerOverlayProps {
  overlay: NonNullable<Overlay>;
  onClose: () => void;
}

function DrawerOverlay({ overlay, onClose }: DrawerOverlayProps) {
  const titles: Record<NonNullable<Overlay>["kind"], string> = {
    profilo: "Profilo",
    eventi: "Eventi",
    classifica: "Classifica",
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
        {overlay.kind === "eventi" && <EventiScreen />}
        {overlay.kind === "classifica" && <ClassificaScreen />}
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
        <p className="mt-1 text-sm text-ink-dim">
          Placeholder. Le voci sotto sono quelle che vivranno qui.
        </p>
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
        <p className="mt-1 text-sm text-ink-dim">
          Placeholder. Le voci sotto sono quelle che vivranno qui.
        </p>
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
