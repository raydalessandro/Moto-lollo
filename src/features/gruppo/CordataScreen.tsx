"use client";

import { Placeholder } from "@/components/ui/Placeholder";
import type { Group } from "@/types/domain";

interface CordataScreenProps {
  group: Group;
}

export function CordataScreen({ group }: CordataScreenProps) {
  return (
    <Placeholder
      title={`Cordata ${group.name}`}
      subtitle="Sessione live di gruppo: vedi tutti in tempo reale sulla mappa, rimani connesso anche se uno si stacca."
      bullets={[
        "Mappa live con posizione di ciascun membro (aggiornamento 5s)",
        "Filo cordata: polyline tra i rider in ordine",
        "Alert: rider indietro, rider fermo, rider perso segnale",
        "Chat cordata testuale + comandi rapidi (si parte, pausa, benzina)",
        "Share link esterno per contatti di emergenza / famiglia",
        "Archivio cordata post-uscita (diventa Storia)",
      ]}
    />
  );
}
