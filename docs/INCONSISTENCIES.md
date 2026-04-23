# Incongruenze tra fonti

Tracciamento delle divergenze tra le tre fonti di verità:

- **Specs zip** — `docs/sources/spec_bundle.zip` (specifiche tecniche back + data model)
- **HTML prototipo** — `docs/sources/prototype.html` (design system e flussi UX)
- **Excel** — `docs/sources/spec.xlsx` (affinamento funzionale più recente, cronologicamente)

**Convenzione:** l'Excel è la fonte più aggiornata per le funzionalità. Il prototipo è la fonte visuale. Le specs zip valgono per modello dati e flussi tecnici back-end.

Le incongruenze vengono scoperte man mano che costruiamo il frontend. Quando troviamo una divergenza:
1. La annotiamo qui con `status: open`
2. Decidiamo quale fonte fa fede per il frontend
3. Quando il frontend è consolidato, risolviamo aggiornando la fonte "perdente" (o segnandola superata) prima di scrivere il backend reale

---

## [F-001] Moduli applicativi: l'Excel ne ha 8, la spec zip ne ha 7

- **status:** open
- **area:** architettura / perimetro
- **fonti:**
  - Excel → 8 aree utente: **HOME, REGISTRA, PIANIFICA, COMMUNITY, GARAGE, GRUPPI & EVENTI, CLASSIFICA, PROFILO** + funzioni di sistema trasversali
  - Spec zip → 7 moduli: tracking, sync, garage, community, navigation, safety, planning, settings/profile, ui_components (nessun modulo "home", "gruppi & eventi", "classifica")
  - Prototipo → 15 screen che includono HomeScreen, EventiScreen (gruppi & eventi), SegmentiScreen (classifica), oltre a tutto il resto
- **impatto frontend:** il prototipo copre entrambe le fonti; l'Excel e il prototipo coincidono. Costruiamo 8 aree.
- **impatto backend:** le spec zip non hanno data model per `groups`, `group_rides`, `events`, `segments`, `leaderboards`, `badges`, `challenges`. Da aggiungere quando alliniamo back/front.
- **decisione per il frontend:** seguiamo Excel + prototipo (8 aree).

---

## [F-002] Excel e spec zip hanno obiettivi prodotto diversi

- **status:** open
- **area:** positioning / scope
- **fonti:**
  - Spec zip `00_overview.md` → *"MVP single-device, zero Next.js, solo app mobile. Niente pagine pubbliche, niente admin panel web."* Stack previsto: **Flutter + Supabase**.
  - Excel `Spiegazione App` → *"App smartphone pensata per accompagnare il motociclista prima, durante e dopo ogni uscita"*, con monetizzazione (premium/abbonamenti) e admin completo previsti in Release 2.
- **impatto frontend:** l'utente ha esplicitamente detto *"lavoriamo in next/react così pusho su Vercel e la vediamo online. Poi refattorizzeremo per Flutter"*. Quindi Next.js è il **veicolo del prototipo UX**, non il target di deployment finale. Quando ci sposteremo su Flutter dovremo riscrivere, ma l'architettura feature-based e i tipi domain-level si porteranno con un minimo di ginnastica.
- **decisione:** Next.js + React ora, target Flutter dopo. Le spec zip sulla scelta stack sono informative ma non bloccanti nella fase prototipo.

---

## [F-003] Cancellazione account: vincolo temporale username

- **status:** open
- **area:** settings / profilo
- **fonti:**
  - Spec zip `99_open_questions.md A.12` → *"Username modificabile solo entro 7 giorni dalla creazione"* (stato PROPOSED).
  - Excel → da verificare nel foglio `14_PROFILO`.
- **impatto frontend:** la UI del form username dovrà mostrare banner "modificabile ancora per N giorni". Prima di implementare lo screen di profilo, controllare cosa dice l'Excel.
- **decisione:** pending.

---

## [F-004] Safety / SOS: presenza nell'Excel

- **status:** open
- **area:** safety
- **fonti:**
  - Spec zip → modulo 09_safety dedicato, con SafetyContact, SOS, LiveSession.
  - Excel → da verificare se Safety è dentro PROFILO, dentro FUNZIONI DI SISTEMA TRASVERSALI, o un'area a sé.
- **impatto frontend:** se l'Excel NON mette Safety in bottom nav, lo nidificheremo dentro Profilo > Impostazioni > Sicurezza. Il prototipo ha il pulsante SOS embedded nella CordataScreen.
- **decisione:** pending. Da verificare in `07_Funzioni_Sistema_Trasv` e `14_PROFILO` dell'Excel.

---

## [F-006] Architettura navigazione: 3 pillars vs 8 aree flat

- **status:** resolved · seguiamo il prototipo (3 pillars)
- **area:** information architecture
- **fonti:**
  - Excel → 8 aree applicative come pari-livello (HOME, REGISTRA, PIANIFICA, COMMUNITY, GARAGE, GRUPPI & EVENTI, CLASSIFICA, PROFILO).
  - Prototipo → 3 pillar (IO · personale / GRUPPO / MONDO · community) con tabs DIVERSE per ciascun pillar. Onboarding 3-step del prototipo (riga 4217 di `_refs/prototype/app3.jsx`) spiega esattamente la logica:
    - *"IO — Il tuo cockpit personale — registra uscite, pianifica percorsi, segui il tuo garage. Quando riguarda solo te."*
    - *"GRUPPO — Il tuo moto club. Uscite condivise, cordata live quando siete in strada, storie post-ride. Un mondo chiuso."*
    - *"MONDO — Tutti i motociclisti pubblici. Percorsi nuovi, gente che ti ispira, eventi aperti. Esplorazione."*
- **impatto frontend:** con 8 tab flat l'UI diventa illeggibile. Con 3 pillar ogni spazio ha uno scopo preciso: personale, branco, mondo. Il mapping delle 8 aree Excel sui 3 pillar prototipo è:
  - IO: **Home**, Mappa, Crea *(hub: inizia una Registra, un Percorso, importa GPX, aggiungi Moto)*, **Garage**
  - GRUPPO: Gruppo (home del gruppo attivo), **Pianifica** *(pianificazione uscita gruppo)*, Cordata *(live session)*, Storia *(post-ride)*, Diario *(archivio)*
  - MONDO: Feed *(ex Community)*, Eventi, **Classifica**, **Profilo**
- **differenze che questa riorganizzazione introduce:**
  - **REGISTRA** sparisce come tab a sé. Diventa subscreen di `io.crea` (azione "Nuova uscita"). Durante una registrazione attiva andrà in fullscreen.
  - **COMMUNITY** diventa `mondo.feed` (il pillar è il contenitore, "Feed" è la pagina dentro).
  - **GRUPPI & EVENTI** si scinde: "Gruppi" diventa un intero pillar con 5 tab; "Eventi" vive dentro MONDO come calendario pubblico.
  - **PROFILO** vive dentro MONDO: è l'identità pubblica, non un tab delle impostazioni personali. Impostazioni / privacy vivranno dentro Profilo.
  - "Pianifica" sotto GRUPPO vuol dire "pianifica un'uscita del gruppo"; la creazione di un percorso personale sta dentro `io.crea` come azione distinta.
- **decisione:** adottato pattern prototipo. Le 8 aree Excel restano il modello funzionale (cosa l'app deve saper fare), ma la navigazione segue il modello 3-pillar.

---

## [F-005] Cordata live: concetto UX solo prototipo

- **status:** open
- **area:** safety / community
- **fonti:**
  - Prototipo → `CordataScreen` dedicata: live session di gruppo con posizione condivisa, "avatar ring spin", "cordata thread" ecc.
  - Spec zip → concetto di `LiveSession` singola (leader + invitati), non modellato come "cordata" di gruppo.
  - Excel → da verificare.
- **impatto frontend:** il prototipo estende il concetto di LiveSession della spec in una UX "cordata di gruppo". Probabilmente è lo stesso costrutto back-end, con UI che lo presenta come attività di gruppo.
- **decisione:** pending.

---

## Come usare questo documento

- Appendere incongruenze in ordine di scoperta (ID incrementale).
- Quando una voce viene **decisa**, aggiornare `status: resolved` e aggiungere la riga *"risolta aggiornando X in data Y"*.
- Alla fine della fase prototipo, questo file diventa la lista di patch da portare nelle spec back-end prima di scrivere codice reale.
