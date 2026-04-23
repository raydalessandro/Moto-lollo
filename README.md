# Moto App — frontend prototype

Prototipo frontend dell'app moto, scritto in **Next.js 16 + React 19 + TypeScript + Tailwind 4**.

Fase attuale: **costruire l'esperienza utente** delle 8 aree dell'app usando un DB mock in memoria con dati realistici. Niente backend reale, niente navigazione reale tra URL — solo UI, interazione, e tutte le sensazioni dell'app funzionante.

Quando il frontend sarà consolidato:
1. Allineeremo le spec back-end alla realtà UX costruita qui.
2. Porteremo l'app su Flutter per il deployment mobile.

---

## Cosa c'è nel repo

```
.
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout + font (Archivo, JetBrains Mono)
│   │   ├── globals.css         # Design tokens + animazioni dal prototipo
│   │   └── page.tsx            # <DbProvider><AppShell /></DbProvider>
│   ├── components/
│   │   ├── AppShell.tsx        # state pillar+screen+gruppo attivo, group selector
│   │   ├── nav/                # Header, BottomNav (2 righe), pillars config, Icon
│   │   └── ui/                 # Card, Stat, Chip, SectionLabel, Placeholder
│   ├── features/
│   │   ├── io/                 # IO · personale
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── MappaScreen.tsx
│   │   │   ├── CreaScreen.tsx
│   │   │   ├── GarageScreen.tsx
│   │   │   └── RegistraScreen.tsx   # non in bottom nav, futura fullscreen
│   │   ├── gruppo/             # GRUPPO — contesto del gruppo attivo
│   │   │   ├── GruppoHomeScreen.tsx
│   │   │   ├── PianificaScreen.tsx
│   │   │   ├── CordataScreen.tsx
│   │   │   ├── StoriaScreen.tsx
│   │   │   └── DiarioScreen.tsx
│   │   └── mondo/              # MONDO · community
│   │       ├── FeedScreen.tsx
│   │       ├── EventiScreen.tsx
│   │       ├── ClassificaScreen.tsx
│   │       └── ProfiloScreen.tsx
│   ├── mocks/                  # In-memory DB (vedi sezione Data layer)
│   │   ├── rng.ts              # PRNG deterministico (mulberry32)
│   │   ├── seed/               # Seed per area (people, garage, rides, gruppi, mondo)
│   │   ├── db.ts               # Composizione tabelle → Db tipato + singleton
│   │   ├── queries.ts          # Accessor functions (SELECT)
│   │   └── DbProvider.tsx      # Context React + useQuery + mutations
│   ├── types/
│   │   └── domain.ts           # Tipi TS del dominio (single source of truth)
│   └── lib/cn.ts               # Utility classnames
│
├── docs/
│   ├── INCONSISTENCIES.md      # Divergenze tra Excel / spec zip / prototipo
│   └── sources/                # Fonti immutabili (input del progetto)
│       ├── spec.xlsx           # Excel: funzioni — ultimo in ordine cronologico
│       ├── prototype.html      # HTML-redesign: design, palette, animazioni, tono
│       └── spec_bundle.zip     # Spec tecniche back/data model (markdown)
│
├── _refs/                      # [gitignored] Estrazioni locali delle sources
│                               # excel_dump.md, excel_by_sheet/, prototype/*.jsx
│
├── public/
├── package.json · tsconfig.json · next.config.ts · postcss.config.mjs · eslint.config.mjs
```

---

## Le tre fonti di verità

| Fonte | File | Cosa rappresenta | Per cosa fa fede |
|---|---|---|---|
| **Excel** | `docs/sources/spec.xlsx` | Affinamento funzionale, ultimo in ordine cronologico. 29 fogli (HOME, REGISTRA, PIANIFICA, COMMUNITY, GARAGE, GRUPPI & EVENTI, CLASSIFICA, PROFILO + architettura, dati, offline, UI states, test). | **Funzioni** dell'app. |
| **Prototipo HTML** | `docs/sources/prototype.html` | Standalone React+Babel con 15 screen disegnate, palette, animazioni, simulazione gruppi via localStorage. | **Design** (palette, tipografia, animazioni, layout, tono). |
| **Spec bundle** | `docs/sources/spec_bundle.zip` | Spec tecniche back-end e data model (17 markdown): tracking, sync, garage, community, navigation, safety, planning, UI, DB schema, open questions. | **Modello dati** e flussi back. Solo per flaggare incoerenze grosse in [`docs/INCONSISTENCIES.md`](./docs/INCONSISTENCIES.md). |

**Regola:** Excel + prototipo per il frontend. Le spec back sono riferimento per il dominio, ma non bloccano il prototipo. Divergenze → annotate in `INCONSISTENCIES.md`.

---

## Sviluppo locale

```bash
npm install
npm run dev       # → http://localhost:3000
npm run build     # production build
npm run typecheck # tsc --noEmit
```

L'app è pensata per viewport **mobile** (larghezza max 768 px). Apri gli strumenti dev del browser in modalità mobile per un'esperienza realistica.

## Deploy su Vercel

Zero config.

1. Connetti il repo su Vercel.
2. Branch di produzione: **`main`**.
3. Framework: Next.js (auto-detect).
4. Root directory: lascia vuota / `./`.
5. Build command: `npm run build` (default).

---

## Architettura di navigazione: i 3 pillars

Il prototipo ha un'architettura a **3 pillars** definitiva (vedi [F-006](./docs/INCONSISTENCIES.md)):

- **IO · personale** — accent `#ff6a1f` — *il tuo cockpit: quando riguarda solo te*
  - Tabs: `Home · Mappa · Crea · Garage`
- **GRUPPO** — accent: colore del gruppo attivo — *il tuo moto club: un mondo chiuso*
  - Tabs: `Gruppo · Pianifica · Cordata (live) · Storia · Diario`
  - Selettore gruppo sopra le tab: switcha il gruppo, cambia il contesto di tutte le tab.
- **MONDO · community** — accent `#6bb0ff` — *tutti i motociclisti pubblici: esplorazione*
  - Tabs: `Feed · Eventi · Classifica · Profilo`

Il BottomNav è a **2 righe**: sopra il pillar switcher (segmented control con sliding indicator), sotto la tab row che cambia col pillar. Cambiare pillar riporta alla default tab del pillar (`io.home`, `gruppo.home`, `mondo.feed`).

`Registra` **non** è una tab a sé: è un'azione dentro `io.crea`. Durante una registrazione attiva andrà in fullscreen.

---

## Data layer

Il frontend gira su un **DB in-memory deterministico** che assomiglia il più possibile a uno schema SQL reale. Questo serve a due cose: (1) rendere ogni schermata navigabile con dati realistici, (2) cristallizzare lo schema che il back-end dovrà esporre quando allineeremo.

### Tabelle (tutte sotto `src/mocks/db.ts`, tipate in `src/types/domain.ts`)

```
profiles                      userPreferences
motorcycles                   maintenanceRecords        documents
activities                    activityMedia
plannedRoutes
groups                        groupMemberships          groupRides          groupRideRSVPs
publishedRoutes               routeComments             routeLikes          followRelationships
events                        eventRSVPs
segments                      segmentAttempts           badges              userBadges          challenges
safetyContacts                liveSessions
notifications
```

### Numerosità seed (deterministico, `makeRng(42)` in `src/mocks/rng.ts`)

| Tabella | Rows |
|---|---|
| profiles | 17 (Ray + 16 rider italiani) |
| motorcycles | 19 (2-3 di Ray + 1 primaria ciascuno per gli altri) |
| maintenanceRecords | 6 (sulla Panigale di Ray) |
| documents | 4 (ass. / bollo / rev. / patente) |
| activities | 43 (21 di Ray, 22 degli altri per il feed) |
| activityMedia | ~30 |
| plannedRoutes | 6 |
| groups | 4 (Garda, Dolomiti, Sport, Amici) |
| groupMemberships | 22 (Ray in tutti e 4) |
| groupRides | 21 (7 futuri, 1 in-corso, 1 annullato, 12 completati) |
| groupRideRSVPs | ~150 (uno per rider/ride) |
| publishedRoutes | 10 |
| routeComments | 10 |
| routeLikes | ~80 |
| followRelationships | 14 |
| events | 7 (raduni, track day, viaggi, corso, fiera) |
| eventRSVPs | 10 |
| segments | 6 (Italia del nord) |
| segmentAttempts | ~45 |
| badges | 8 |
| userBadges | 18 |
| challenges | 1 (attiva) |
| safetyContacts | 3 |
| liveSessions | 1 (ended_normal) |
| notifications | 8 (2 non lette) |

### Come usare il DB nelle screens

```tsx
import { useQuery, useDb } from "@/mocks/DbProvider";
import { listMyMotorcycles, getLastActivity } from "@/mocks/queries";

export function MyScreen() {
  const bikes = useQuery((db, userId) => listMyMotorcycles(db, userId));
  const last  = useQuery((db, userId) => getLastActivity(db, userId));
  const { toggleLike, setMyRSVP } = useDb();
  // ...
}
```

Regola: **le screen non importano mai direttamente le tabelle**. Sempre via `queries.ts`. Questo è quello che un domani sostituiremo con chiamate Supabase.

### Mutazioni disponibili

- `toggleLike(publishedRouteId)`
- `setMyRSVP(groupRideId, value)` — aggiorna anche `confirmedCount` denormalizzato sul ride
- `setPrimaryMotorcycle(motorcycleId)`
- `markAllNotificationsRead()`

---

## Stato delle schermate

Tutte e 13 le screen leggono dati dal DB. La colonna "interazioni" segna cosa è già cliccabile.

### IO · personale
| Screen | Stato | Contenuto | Interazioni |
|---|---|---|---|
| `io.home` | 🟡 | Moto primaria, ultima uscita con stats, prossime uscite gruppo | — |
| `io.mappa` | 🟡 | Placeholder mappa, stato moto + prossima scadenza, ultima uscita, POI mock | — |
| `io.crea` | 🟡 | Hub azioni (Nuova uscita, Nuovo percorso, Import GPX, Aggiungi moto) | — |
| `io.garage` | 🟡 | Parco moto, scadenze con urgenza colorata, ultime manutenzioni | ✓ set primaria |

### GRUPPO (contesto = gruppo corrente dal selettore)
| Screen | Stato | Contenuto | Interazioni |
|---|---|---|---|
| `gruppo.home` | 🟡 | Crest, descrizione, prossima confermata, membri reali, bacheca uscite | — |
| `gruppo.pianifica` | 🟡 | Lista planned routes personali (da rivedere: concetto "piano gruppo") | — |
| `gruppo.cordata` | 🟡 | Empty state se niente live; se ride `in-corso` → mappa placeholder + rider + comandi | — |
| `gruppo.storia` | 🟡 | Ultima ride completata: stats, replay placeholder, partecipanti | — |
| `gruppo.diario` | 🟡 | Archivio uscite concluse del gruppo con aggregati | — |

### MONDO · community
| Screen | Stato | Contenuto | Interazioni |
|---|---|---|---|
| `mondo.feed` | 🟢 | Feed con filter Segui/Tutti, card con hero colorato, author, tags, primi 2 commenti | ✓ like toggle |
| `mondo.eventi` | 🟢 | Upcoming + past, filtri per kind, RSVP chips, organizer | — |
| `mondo.classifica` | 🟢 | Challenge attiva, segment switcher + leaderboard (medal colors, evidenza "me"), badge grid earned/locked | — |
| `mondo.profilo` | 🟢 | Avatar, bio, followers/following, stats aggregate, badge, moto, link impostazioni | — |

Legenda: ⚪ stub · 🟡 prima passata · 🟢 densa · 🔵 rifinita

---

## Principi di lavoro

1. **Esperienza utente prima di tutto.** Ogni schermata deve *sembrare funzionante*. Animazioni, feedback, empty state: ci sono.
2. **Mock in-memory, non API.** Le screen passano sempre per `queries.ts` + `useQuery`. Zero import diretti delle tabelle.
3. **Un tipo nuovo** → va prima in `src/types/domain.ts`, poi nel seed, poi nelle queries.
4. **Incongruenze sì, improvvisazioni no.** Divergenze tra fonti → `docs/INCONSISTENCIES.md`.
5. **Niente backwards-compatibility.** Prototipo. Se una scelta è sbagliata, si cambia.
6. **Commenti solo se il perché non è ovvio.**

### Flusso consigliato per una nuova schermata / feature

1. Apri il foglio Excel corrispondente (es. `11_GARAGE`, `14_PROFILO`) → lista funzioni.
2. Apri `_refs/prototype/app3.jsx` e cerca lo screen corrispondente → reference visuale.
3. Se servono campi/entità nuove: aggiorna `src/types/domain.ts` → poi `src/mocks/seed/` → poi `src/mocks/queries.ts`.
4. Scrivi la screen in `src/features/<pillar>/<Nome>Screen.tsx`, importando solo da `@/mocks/DbProvider` e `@/mocks/queries`.
5. Divergenza importante tra fonti → nuova entry in `docs/INCONSISTENCIES.md`.

---

## Roadmap prossimi step

1. **Gap analysis vs Excel** — passare le 283 funzioni dell'Excel contro quello che c'è nel front, in un `docs/GAP_ANALYSIS.md` (pending dalla sessione precedente).
2. **Onboarding 3-step** all'ingresso (già scritto nel prototipo — solo da portare).
3. **RegistraScreen** fullscreen raggiungibile da `io.crea > Nuova uscita`; simula tracking live.
4. **PostRide** fullscreen al termine di Registra, poi entra in `gruppo.storia`.
5. **Animazioni** del prototipo (`screenFadeIn`, `crestPulse`, `avatarRingSpin`, `cordataFlow`) già nel CSS: agganciarle dove mancano.
6. **Commenti / RSVP** come mutazioni reali sulle rispettive screen.
7. **Safety SOS / LiveSession start** dal profilo o dal cordata.
8. Detail screens (dettaglio activity, dettaglio published route, dettaglio event, dettaglio ride).
9. Revisione con Ray + Lollo → fix.
10. Allineamento back/front con `spec_bundle` prima di scrivere codice backend.

---

## Naming convention

- Utente principale: **Ray** (`id: u0`).
- Gruppi predefiniti: **Moto Garda** (g1, ember), **Dolomiti Riders** (g2, info blu), **Sport Riders** (g3, rosso), **Amici** (g4, verde). Presi dal prototipo per continuità visiva.
- Oggi del prototipo: **23 aprile 2026** (`NOW_ISO` in `DbProvider.tsx`). Tutte le date sono relative a questo.
- IDs preservati tra sessioni: `u0`, `m1`, `m2`, `a1`-`a3`, `g1`-`g4`, `r1`-`r7`.
