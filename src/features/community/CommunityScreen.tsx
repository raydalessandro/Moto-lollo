import { Placeholder } from "@/components/ui/Placeholder";

export function CommunityScreen() {
  return (
    <Placeholder
      title="Community"
      subtitle="Scoperta percorsi pubblici, feed social, recensioni, follow."
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
