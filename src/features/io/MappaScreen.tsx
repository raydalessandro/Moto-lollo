import { Placeholder } from "@/components/ui/Placeholder";

export function MappaScreen() {
  return (
    <Placeholder
      title="Mappa"
      subtitle="La tua mappa personale: dove sei, dove sei stato, dove vuoi andare."
      bullets={[
        "Mappa interattiva con posizione corrente",
        "Stato moto primaria e prossima scadenza",
        "POI: benzina, officina, parcheggio, caffè",
        "Layer attività recenti (heatmap personale)",
        "Search luogo con tap per navigare",
      ]}
    />
  );
}
