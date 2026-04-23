import { Placeholder } from "@/components/ui/Placeholder";

export function PianificaScreen() {
  return (
    <Placeholder
      title="Pianifica"
      subtitle="Itinerari, waypoint, import/export GPX, navigazione guidata."
      bullets={[
        "Editor mappa con waypoint tap-to-add (2-10 punti tipici)",
        "Polyline stimata + distanza e durata live",
        "Salva come PlannedRoute (privata di default)",
        "Lista percorsi personali, duplica, modifica, elimina",
        "Import / export GPX",
        "Avvio navigazione turn-by-turn da un percorso",
        "Gestione mappe offline (post-MVP)",
      ]}
    />
  );
}
