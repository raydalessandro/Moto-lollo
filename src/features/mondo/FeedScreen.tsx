import { Placeholder } from "@/components/ui/Placeholder";

export function FeedScreen() {
  return (
    <Placeholder
      title="Feed"
      subtitle="Il mondo dei motociclisti pubblici. Percorsi, gente che ti ispira, esplorazione."
      bullets={[
        "Feed personale (activity + route di utenti seguiti)",
        "Feed pubblico con filtri (zona, tag, lunghezza)",
        "Pubblicazione di Activity o PlannedRoute come PublishedRoute",
        "Like, commenti, salvataggio",
        "Profilo pubblico di un altro utente",
        "Follow / unfollow",
        "Segnalazione contenuto o utente",
      ]}
    />
  );
}
