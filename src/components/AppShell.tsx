"use client";

import { useState } from "react";
import { Header } from "./nav/Header";
import { BottomNav } from "./nav/BottomNav";
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
import { ProfiloScreen } from "@/features/mondo/ProfiloScreen";

export function AppShell() {
  const myGroups = useQuery((db, userId) => listMyGroups(db, userId));
  const [screen, setScreen] = useState<ScreenKey>("io.home");
  const [currentGroupId, setCurrentGroupId] = useState<string>(myGroups[0]?.id ?? "g1");

  const pillar: Pillar = pillarOf(screen);
  const currentGroup = myGroups.find((g) => g.id === currentGroupId) ?? myGroups[0];

  const handlePillarChange = (p: Pillar) => {
    if (p !== pillar) {
      setScreen(PILLARS[p].defaultScreen);
    }
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
      case "mondo.profilo":
        return <ProfiloScreen />;
    }
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col bg-bg">
      <Header pillar={pillar} currentGroup={currentGroup} />
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
