import { Placeholder } from "@/components/ui/Placeholder";

export function EventiScreen() {
  return (
    <Placeholder
      title="Eventi"
      subtitle="Eventi pubblici della community: raduni, track day, viaggi aperti a cui chiunque può partecipare."
      bullets={[
        "Feed eventi per zona geografica",
        "Filtri: data, tipo (raduno, track day, viaggio), distanza",
        "Dettaglio evento: descrizione, partecipanti, luogo",
        "RSVP pubblico (interessato, vado)",
        "Proponi un evento aperto",
        "Calendario personale eventi salvati",
      ]}
    />
  );
}
