# Moto-lollo

App per motociclisti: pianificazione, registrazione uscite, cordate live di gruppo, community percorsi. PWA Next.js + Supabase. Flutter come target finale a lungo termine.

---

## Stato

**Fase 0 (chiusura spec)** — Frontend prototype completo, in-memory mock data, deployato su Vercel. Spec back-end scritta e pronta. Prossimo: Fase 1 — wirare Supabase, autenticazione, tracking GPS reale.

Vedi [`HANDOFF.md`](./HANDOFF.md) per il punto di apertura sessione e [`docs/ROADMAP.md`](./docs/ROADMAP.md) per le fasi.

---

## Stack

| Layer | Tech |
|-------|------|
| Front | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 |
| Mock data | In-memory PRNG deterministico (mulberry32) via React Context |
| Mappe (Fase 1+) | Mapbox GL JS + Directions + Geocoding |
| Backend (Fase 1+) | Supabase (Postgres + RLS + Auth + Storage + Realtime) |
| Deploy | Vercel · PWA installabile |

---

## Setup locale

```bash
nvm use                # legge .nvmrc (Node 22)
npm install
cp .env.local.example .env.local   # poi compila i valori (vedi sotto)
npm run dev            # http://localhost:3000
npm run build          # production build
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
```

L'app è pensata per viewport mobile (max-width 768). Apri dev tools in modalità mobile per esperienza realistica.

### Environment variables

| Variabile | Quando serve | Note |
|-----------|--------------|------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | quando vuoi mappe reali (NavigationOverlay, mini-mappe) | Public token da [account.mapbox.com](https://account.mapbox.com/access-tokens/). URL restrict: `localhost:*` + `*.vercel.app` + eventuale domain. Se vuoto: l'app fa fallback ai mock SVG (esperienza identica all'attuale). |

Su Vercel: Settings → Environment Variables → aggiungi `NEXT_PUBLIC_MAPBOX_TOKEN` per Production + Preview + Development.

---

## Struttura repo

```
.
├── src/
│   ├── app/                    # Next.js App Router (layout, page, globals)
│   ├── components/
│   │   ├── AppShell.tsx        # root client component: state pillar+screen+gruppo
│   │   ├── nav/                # Header, BottomNav, HamburgerDrawer, NavigationOverlay
│   │   └── ui/                 # Card, Chip, SectionLabel, Stat
│   ├── features/
│   │   ├── io/                 # IO pillar (Home, Mappa, Registra, Garage)
│   │   ├── gruppo/             # GRUPPO pillar (Home, Pianifica, Cordata, Storia, Diario)
│   │   ├── mondo/              # MONDO pillar (Feed, Eventi, Classifica)
│   │   └── profilo/            # Profilo (drawer destination)
│   ├── mocks/                  # In-memory DB
│   │   ├── rng.ts              # PRNG mulberry32
│   │   ├── seed/               # Seed per area
│   │   ├── db.ts               # Composizione tabelle → Db tipato + singleton
│   │   ├── queries.ts          # Accessor functions (le SELECT)
│   │   └── DbProvider.tsx      # Context React + useQuery + mutations
│   ├── types/
│   │   └── domain.ts           # Single source of truth dei tipi
│   └── lib/                    # Utilities
│
├── docs/
│   ├── PLAN.md                 # Refactor history (Step 1-15 chiusi)
│   ├── ROADMAP.md              # 6 fasi strategiche (Fase 0 corrente → Fase 6)
│   ├── INCONSISTENCIES.md      # [archived] divergenze risolte
│   ├── spec/                   # Spec v2 — fonte di verità per Fase 1+
│   │   ├── README.md
│   │   ├── 00_overview.md
│   │   ├── 10..50_*.md         # 15 per-screen specs
│   │   ├── 60_domain_model.md
│   │   ├── 70_flussi_e2e.md
│   │   └── 80_backend_design.md
│   └── sources/                # Fonti storiche (binari + bundle markdown legacy)
│
├── public/                     # Asset PWA (icone, manifest in Fase 1)
├── AGENTS.md                   # Istruzioni operative per AI agents
├── CHANGELOG.md                # Cronologia milestone
├── HANDOFF.md                  # Single-page summary per apertura sessione
└── README.md                   # Questo file
```

---

## Documenti chiave

Letti **in quest'ordine** per orientarsi:

1. [`HANDOFF.md`](./HANDOFF.md) — dove siamo, prossimo step (30 secondi di lettura)
2. [`docs/ROADMAP.md`](./docs/ROADMAP.md) — le 6 fasi del progetto
3. [`docs/spec/README.md`](./docs/spec/README.md) — indice della spec v2
4. [`docs/spec/00_overview.md`](./docs/spec/00_overview.md) — modello 3 pillars
5. [`docs/spec/60_domain_model.md`](./docs/spec/60_domain_model.md) — entità
6. [`docs/spec/80_backend_design.md`](./docs/spec/80_backend_design.md) — schema Postgres + RLS + Mapbox setup
7. [`AGENTS.md`](./AGENTS.md) — convenzioni operative

---

## Architettura UI: 3 pillars

L'app è organizzata in 3 pillars mutuamente esclusivi nella bottom nav:

- **IO** (personale, accent `#ff6a1f`) — Home · Mappa · Registra · Garage
- **GRUPPO** (accent = colore del gruppo attivo) — Gruppo · Pianifica · Cordata · Storia · Diario
- **MONDO** (community, accent `#6bb0ff`) — Feed · Eventi · Classifica

Più zone fuori bottom nav:
- **Drawer hamburger** (top-left): Profilo, Impostazioni, Privacy
- **Fullscreen overlay** (on-demand): Navigation/Tracking/Cordata live

Dettagli completi in [`docs/spec/00_overview.md`](./docs/spec/00_overview.md).

---

## Convenzioni

### Commit

Conventional Commits. Tipi usati:

- `feat(area): ...` — nuova feature/screen
- `fix(area): ...` — bug fix
- `chore(area): ...` — cleanup, deps, config
- `docs(area): ...` — solo documentazione
- `refactor(area): ...` — refactor senza behavior change

`area` è uno di: `nav`, `io`, `gruppo`, `mondo`, `profilo`, `mocks`, `shell`, `docs`, `spec`, `ui`.

### Branch

`main` è la branch di lavoro. **Push diretti su `main`** sono ok in Fase 0 (siamo in 1 + Claude). Quando ci uniranno altri sviluppatori, valuteremo branch protection.

### Codice

- **Niente import diretti delle tabelle dal mock**: sempre via `queries.ts`.
- **Nuovo tipo** → prima in `src/types/domain.ts`, poi seed, poi queries.
- **Niente backwards-compatibility**: è un prototipo, si cambia tutto se serve.
- **Commenti solo per il "perché" non ovvio**: nomi chiari basta per il "cosa".

---

## Stato deploy

- Branch `main` → produzione Vercel automatica.
- URL prod: (settare quando il sottodominio sarà confermato)
- Preview deploy per ogni PR (quando ci saranno PR).

---

## License

MIT — vedi [`LICENSE`](./LICENSE).
