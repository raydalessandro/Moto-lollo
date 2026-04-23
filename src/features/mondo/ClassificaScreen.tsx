import { Placeholder } from "@/components/ui/Placeholder";

export function ClassificaScreen() {
  return (
    <Placeholder
      title="Classifica"
      subtitle="Gamification, segmenti, sfide, leaderboard, badge."
      bullets={[
        "Segmenti tipo Strava: ranking su tratti ricorrenti",
        "Leaderboard globale e per gruppo",
        "Sfide mensili e badge sbloccabili",
        "Obiettivi personali (km settimanali, nuove strade)",
        "Storico badge sul profilo",
      ]}
    />
  );
}
