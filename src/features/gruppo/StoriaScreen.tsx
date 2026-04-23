"use client";

import { Placeholder } from "@/components/ui/Placeholder";
import type { Group } from "@/types/domain";

interface StoriaScreenProps {
  group: Group;
}

export function StoriaScreen({ group }: StoriaScreenProps) {
  return (
    <Placeholder
      title={`Storie · ${group.name}`}
      subtitle="Riepilogo narrativo post-uscita: replay del tracciato, medie, medagliette, momenti salienti condivisi."
      bullets={[
        "Replay animato del percorso con progress draw",
        "Medagliette assegnate automaticamente (primo al ritrovo, più km, più costante)",
        "Momenti: foto scattate, commenti, pause condivise",
        "Commenti e reazioni dei membri",
        "Export Storia come immagine condivisibile",
      ]}
    />
  );
}
