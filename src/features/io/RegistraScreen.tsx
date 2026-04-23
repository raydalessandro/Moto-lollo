import { Placeholder } from "@/components/ui/Placeholder";

export function RegistraScreen() {
  return (
    <Placeholder
      title="Registra"
      subtitle="Il cuore tracking: GPS, metriche live, media, salvataggio attività."
      bullets={[
        "Avvio / pausa / ripresa / stop registrazione",
        "Metriche live (km, velocità, durata, quota)",
        "Selezione moto prima dell'avvio",
        "Dialog recovery se l'app è stata chiusa a registrazione attiva",
        "Salvataggio Activity con titolo, note, tag, visibilità",
        "Allegato media (foto) alla Activity",
      ]}
    />
  );
}
