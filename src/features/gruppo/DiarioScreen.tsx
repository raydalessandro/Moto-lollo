"use client";

import { Placeholder } from "@/components/ui/Placeholder";
import type { Group } from "@/types/domain";

interface DiarioScreenProps {
  group: Group;
}

export function DiarioScreen({ group }: DiarioScreenProps) {
  return (
    <Placeholder
      title={`Diario · ${group.name}`}
      subtitle="Archivio cronologico di tutte le uscite del gruppo: dove siete stati, quando, chi c'era."
      bullets={[
        "Lista uscite in ordine cronologico inverso",
        "Filtri: anno, periodo, km, partecipanti",
        "Dettaglio uscita: mappa, statistiche, partecipanti",
        "Mappa aggregata di tutti i percorsi del gruppo",
        "Statistiche gruppo: km totali, uscite, membri più attivi",
      ]}
    />
  );
}
