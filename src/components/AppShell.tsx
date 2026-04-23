"use client";

import { useState } from "react";
import { Header } from "./nav/Header";
import { BottomNav } from "./nav/BottomNav";
import { navItems, type ScreenKey } from "./nav/navItems";
import { HomeScreen } from "@/features/home/HomeScreen";
import { RegistraScreen } from "@/features/registra/RegistraScreen";
import { PianificaScreen } from "@/features/pianifica/PianificaScreen";
import { CommunityScreen } from "@/features/community/CommunityScreen";
import { GarageScreen } from "@/features/garage/GarageScreen";
import { GruppiScreen } from "@/features/gruppi/GruppiScreen";
import { ClassificaScreen } from "@/features/classifica/ClassificaScreen";
import { ProfiloScreen } from "@/features/profilo/ProfiloScreen";

const screens: Record<ScreenKey, () => React.JSX.Element> = {
  home: HomeScreen,
  registra: RegistraScreen,
  pianifica: PianificaScreen,
  community: CommunityScreen,
  garage: GarageScreen,
  gruppi: GruppiScreen,
  classifica: ClassificaScreen,
  profilo: ProfiloScreen,
};

export function AppShell() {
  const [active, setActive] = useState<ScreenKey>("home");
  const ActiveScreen = screens[active];
  const headerTitle = navItems.find((i) => i.key === active)?.label ?? "";

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col bg-bg">
      <Header title={headerTitle} />
      <main key={active} className="flex-1 overflow-y-auto scrollbar-hide">
        <ActiveScreen />
      </main>
      <BottomNav active={active} onChange={setActive} />
    </div>
  );
}
