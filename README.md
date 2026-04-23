# Moto App — frontend prototype

Prototipo frontend dell'app moto, scritto in **Next.js 16 + React 19 + TypeScript + Tailwind 4**.

L'obiettivo di questa fase è **costruire l'esperienza utente** delle 8 aree dell'app usando dati mock in memoria. Niente backend reale, niente navigazione reale tra pagine — solo UI, interazione, e tutte le sensazioni dell'app funzionante.

Quando il frontend sarà consolidato:
1. Allineeremo le spec back-end alla realtà UX costruita qui.
2. Porteremo l'app su Flutter per il deployment mobile.

---

## Cosa c'è nel repo

```
.
├── src/                        # Next.js app (codice prodotto)
│   ├── app/
│   │   ├── layout.tsx          # Root layout + font (Archivo, JetBrains Mono)
│   │   ├── globals.css         # Design tokens + animazioni dal prototipo
│   │   └── page.tsx            # Monta <AppShell />
│   ├── components/
│   │   ├── AppShell.tsx        # Client component: state pillar+screen+gruppo attivo
│   │   ├── nav/                # Header, BottomNav (2 righe), pillars config, Icon
│   │   └── ui/                 # Card, Stat, Chip, SectionLabel, Placeholder
│   ├── features/               # Una cartella per pillar (io, gruppo, mondo)
│   │   ├── io/                 # IO · personale
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── MappaScreen.tsx
│   │   │   ├── CreaScreen.tsx
│   │   │   ├── GarageScreen.tsx
│   │   │   └── RegistraScreen.tsx   # non in bottom nav, raggiunto da Crea
│   │   ├── gruppo/             # GRUPPO — contenuto del gruppo attivo
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
│   ├── mocks/                  # Dati in-memory (user, bikes, activities, groups)
│   ├── types/                  # Tipi TypeScript del dominio
│   └── lib/                    # Utility (cn, formatters, ecc.)
│
├── docs/
│   ├── INCONSISTENCIES.md      # Divergenze tra Excel, specs zip, prototipo
│   └── sources/                # Fonti immutabili (input del progetto)
│       ├── spec.xlsx           # Excel: fonte più aggiornata per le funzioni
│       ├── prototype.html      # HTML-redesign: fonte visuale e di UX
│       └── spec_bundle.zip     # Spec tecniche back/data model (in Markdown)
│
├── _refs/                      # [gitignored] Estrazioni locali delle sources
│                               #   excel_dump.md, excel_by_sheet/, prototype/
│
├── public/
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## Le tre fonti di verità

Il progetto si basa su tre documenti. Ognuno ha uno scopo preciso:

| Fonte | File | Cosa rappresenta | Per cosa fa fede |
|---|---|---|---|
| **Excel** | `docs/sources/spec.xlsx` | Affinamento funzionale, ultimo in ordine cronologico. 29 fogli, una schermata per area (HOME, REGISTRA, PIANIFICA, COMMUNITY, GARAGE, GRUPPI & EVENTI, CLASSIFICA, PROFILO) + architettura, dati, offline, UI states, test. | **Funzioni** dell'app. |
| **Prototipo HTML** | `docs/sources/prototype.html` | Mock-up standalone (React + babel in browser) con 15 screen già disegnate, palette, animazioni, simulazione gruppi via localStorage. | **Design** (palette, tipografia, animazioni, layout, tono). |
| **Spec bundle** | `docs/sources/spec_bundle.zip` | Specifiche tecniche back-end e data model (17 file Markdown): tracking, sync, garage, community, navigation, safety, planning, UI components, data model, DB schema, open questions. | **Modello dati** e flussi tecnici back-end. Solo per segnalare **grosse incoerenze** durante lo sviluppo del front. |

**Regola:** se Excel e prototipo dicono cose diverse, seguiamo l'Excel (funzioni) + il prototipo (visual). Se le spec back-end dicono cose molto diverse, lo annotiamo in [`docs/INCONSISTENCIES.md`](./docs/INCONSISTENCIES.md) e ne riparliamo prima di scrivere il backend.

---

## Come lavorare

### Sviluppo locale

```bash
npm install
npm run dev
```

L'app parte su `http://localhost:3000`. È pensata per essere usata a **viewport mobile** (larghezza max 768 px). Apri gli strumenti dev del browser in modalità mobile per un'esperienza realistica.

### Deploy su Vercel

Il progetto è configurato per funzionare con "zero config":

1. Connetti il repo su Vercel.
2. Branch da pubblicare: `claude/build-frontend-prototype-5MVNF` (o il branch di turno).
3. Framework: Next.js (auto-detect).
4. Root directory: `.` (la root del repo).
5. Build command: `npm run build` (default).

---

## Principi di lavoro su questo prototipo

1. **Esperienza utente prima di tutto.** Ogni schermata deve *sembrare funzionante*, anche se i dati sono finti. Animazioni, feedback, stati vuoti, stati di caricamento: ci sono.

2. **Mock in-memory, non API.** Niente fetch, niente Supabase, niente backend. Le `mocks/` sono l'unica fonte di dati. Quando un'interazione deve "salvare" qualcosa, lo fa in `useState` o `localStorage`.

3. **Un'area = una feature folder.** Ogni area dell'app vive in `src/features/<area>/`. Stessa convenzione ci aiuterà anche nel port Flutter.

4. **Incongruenze sì, improvvisazioni no.** Se trovi che Excel, prototipo e spec back-end dicono cose diverse: annotalo in `docs/INCONSISTENCIES.md`, non inventare. Decidiamo insieme.

5. **Niente backwards-compatibility ora.** Stiamo prototipando. Se una scelta è sbagliata, la cambiamo e basta.

6. **Commenti solo quando il perché non è ovvio.** I nomi devono bastare.

### Flusso consigliato di costruzione di una schermata

1. Apri il foglio Excel corrispondente (es. `07_HOME`, `11_GARAGE`) — lista funzioni.
2. Apri l'estratto del prototipo (`_refs/prototype/app3.jsx`) e cerca lo screen corrispondente (es. `HomeScreen`, `GarageScreen`) — ispirazione visuale.
3. Costruisci il componente React in `src/features/<area>/<Nome>Screen.tsx`, riusando i componenti in `src/components/ui/`.
4. Usa mock da `src/mocks/`. Se ti serve un nuovo tipo di dato, aggiungilo prima in `src/types/domain.ts` e poi istanzialo nei mocks.
5. Se trovi una divergenza importante tra le fonti, aprila in `docs/INCONSISTENCIES.md`.

---

## Architettura di navigazione: i 3 pillars

Il prototipo ha un'architettura a **3 pillars** che diamo per definitiva (vedi [F-006 in INCONSISTENCIES.md](./docs/INCONSISTENCIES.md)):

- **IO · personale** (accent: ember `#ff6a1f`) — *il tuo cockpit: quando riguarda solo te*
  - Tabs: `Home · Mappa · Crea · Garage`
- **GRUPPO** (accent: colore del gruppo attivo) — *il tuo moto club: un mondo chiuso*
  - Tabs: `Gruppo · Pianifica · Cordata (live) · Storia · Diario`
  - Selettore gruppo: cambia gruppo, cambia il contenuto di tutte le tab del pillar
- **MONDO · community** (accent: blu `#6bb0ff`) — *tutti i motociclisti pubblici: esplorazione*
  - Tabs: `Feed · Eventi · Classifica · Profilo`

Il BottomNav è a **2 righe**: sopra il pillar switcher (segmented control), sotto la tab row che cambia in base al pillar attivo. Cambiare pillar riporta alla default tab del pillar (`io.home`, `gruppo.home`, `mondo.feed`).

## Stato delle schermate

### IO · personale
| Screen | Stato | Note |
|---|---|---|
| `io.home` | 🟡 Prima pass | Moto primaria, ultima uscita, prossime uscite |
| `io.mappa` | ⚪ Stub | Mappa interattiva + POI |
| `io.crea` | 🟡 Prima pass | Hub azioni: nuova uscita, nuovo percorso, import GPX, aggiungi moto |
| `io.garage` | 🟡 Prima pass | Lista moto con dati mock |

### GRUPPO
| Screen | Stato | Note |
|---|---|---|
| `gruppo.home` | 🟡 Prima pass | Dashboard del gruppo attivo: crest, prossima uscita, bacheca |
| `gruppo.pianifica` | ⚪ Stub | Pianifica uscita del gruppo |
| `gruppo.cordata` | ⚪ Stub | Live session gruppo |
| `gruppo.storia` | ⚪ Stub | Riepilogo narrativo post-uscita |
| `gruppo.diario` | ⚪ Stub | Archivio percorsi del gruppo |

### MONDO · community
| Screen | Stato | Note |
|---|---|---|
| `mondo.feed` | ⚪ Stub | Feed community pubblico |
| `mondo.eventi` | ⚪ Stub | Eventi pubblici (raduni, track day) |
| `mondo.classifica` | ⚪ Stub | Leaderboard, segmenti, sfide |
| `mondo.profilo` | 🟡 Prima pass | Identità pubblica, statistiche aggregate |

Legenda: ⚪ stub · 🟡 prima passata · 🟢 completa · 🔵 rifinita

---

## Roadmap prossimi step

1. Portare tutte le screen dallo "stub" alla "prima passata" con mock più ricchi.
2. Onboarding 3-step all'ingresso (mostra i 3 pillars, già scritto nel prototipo).
3. RegistraScreen fullscreen raggiunta da `io.crea > Nuova uscita`.
4. PostRide fullscreen al termine di una registrazione, poi entra in Storia del gruppo.
5. Rifinitura animazioni (`screenFadeIn`, `crestPulse`, `avatarRingSpin`, `cordataFlow`: già nel CSS, da agganciare).
6. Prima revisione con Ray + Lollo, fix basati sul feedback.
7. Consolidamento dei tipi domain → export in un pacchetto condiviso per il port Flutter.
8. Allineamento back/front con la spec zip prima di scrivere codice backend reale.

---

## Naming convention nelle fonti

L'utente principale del prototipo si chiama **Ray** (id `u0`). Sono predefiniti 4 gruppi: **Moto Garda**, **Dolomiti Riders**, **Sport Riders**, **Amici** — presi dal prototipo per continuità visiva.
