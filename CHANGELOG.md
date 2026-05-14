# Changelog

Tutte le modifiche significative al progetto vengono tracciate qui.

Format: [Keep a Changelog](https://keepachangelog.com/it/1.1.0/). Versioning [SemVer](https://semver.org/lang/it/).

---

## [Unreleased]

### In arrivo
- **Fase 1 — MVP "IO solo"**: Supabase setup, auth screens, schema migration 001-004, Mapbox integration, tracking GPS reale, PWA manifest. Vedi [`docs/ROADMAP.md`](./docs/ROADMAP.md) §"Fase 1".

---

## [0.1.0] — 2026-05-14

### Aggiunto
- **Repo agent-ready**: `AGENTS.md` (istruzioni operative AI), `HANDOFF.md` (single-page summary), `CHANGELOG.md` (questo file), `.editorconfig`, `.nvmrc`.
- **README aggiornato**: stato Fase 0, link ai documenti critici, struttura repo coerente.

### Spec v2 completa
- `docs/spec/README.md` + `00_overview.md` (3 pillars + drawer + fullscreen).
- `docs/spec/60_domain_model.md` (32 entità, denormalized counters, indici Postgres).
- `docs/spec/70_flussi_e2e.md` (21 flussi user E2E, cross-side effects, authorization matrix).
- 15 spec per-screen (IO×4, GRUPPO×6, MONDO×3, drawer, navigation).
- `docs/spec/80_backend_design.md` (schema Postgres, RLS policies, RPC, cron, Realtime, Mapbox setup, Auth setup, mapping spec legacy, ordine implementazione Fase 1).

### Documenti strategici
- `docs/PLAN.md` — refactor history (15 step front chiusi).
- `docs/ROADMAP.md` — 6 fasi (Fase 0 spec → Fase 1 MVP IO → ... → Fase 6 polish/Flutter decision).
- `docs/sources/README.md` — mapping vecchi binari + bundle legacy → nuova spec.

### Decisioni chiuse (vedi `docs/spec/00_overview.md` §"Decisioni chiave")
- 3 pillars (IO/GRUPPO/MONDO), no più 8 aree flat.
- `alsoForCars` flag boolean su PublishedRoute (no enum VehicleKind).
- Naviga è 4ª opzione di `io.registra`, non in Home.
- Storia lifecycle: vive fino a `min(next-ride.startAt - 24h, endedAt + 30g)`.
- Gruppi sempre privati + admin-moderated in MVP.
- Ray (`u0`) seedato come admin di Moto Garda con marker HUMAN-DEFERRED.
- Profilo nel drawer, non in MONDO.
- Cordata: 1 navigatore designato apre turn-by-turn, altri vedono mappa cordata.
- Mapbox token: secret via Edge Function proxy, public con URL restriction.
- Target deploy: **PWA via Vercel** ora, **Flutter** come marker finale a 1-2 anni.

### Cleanup
- Rimossi `Segment`, `SegmentAttempt`, `Challenge` (tipi + seed + queries + UI sezione "Sfide" in ClassificaScreen) — non usati in MVP.
- Rimosso componente orfano `src/components/ui/Placeholder.tsx`.
- Aggiornati commenti stale "Step XX" nei seed + screens.
- `docs/INCONSISTENCIES.md` → ARCHIVED (tutte le 6 voci risolte).
- `_refs/` dichiarato gitignored: il repo traccia solo i binari canonici in `docs/sources/`, non le estrazioni locali.

### Front refactor (Step 1-15, vedi `docs/PLAN.md` §4)
- Header + hamburger drawer.
- MONDO 4→3 tabs (Profilo spostato nel drawer).
- `io.crea` → `io.registra` (hub 4 vie: manuale/GPS/GPX/Naviga).
- `io.mappa` → archivio percorsi personali (creati + saved).
- `io.home` ricostruita dal prototipo HTML.
- Domain model esteso: `RouteProposal`, `GroupMembershipRequest`, `RideBoardComment`, `SavedRoute` + campi nuovi (`alsoForCars`, `scope`, `navigatorUserId`, `isPrivate`, `area`, `publicRoutesCount`, counters denormalizzati).
- Ray admin di Garda + commenti HUMAN-DEFERRED.
- `GruppoListScreen` discovery + non-member profile gruppo.
- `gruppo.pianifica` split admin/member, bacheca commenti, route proposals.
- `gruppo.cordata` fedele al prototipo HTML + navigator designation.
- `gruppo.storia` con lifecycle 24h+30g → Diario pointer.
- `mondo.classifica` da utenti a percorsi (sort by navigated/saved/likes/recent).
- `mondo.feed` filtro "anche per auto".
- `NavigationOverlay` fullscreen (kind: tracking/navigation/cordata).
- `Profilo` accessibile dal drawer.

---

## [0.0.1] — 2026-04-23 (pre-refactor)

### Aggiunto
- Setup iniziale Next.js 16 + React 19 + Tailwind 4.
- 13 screen prototipo con seed in-memory deterministico (PRNG mulberry32, seed 42).
- 26 entity types in `src/types/domain.ts`.
- Mock DB con ~410 seed rows.
- Deploy iniziale Vercel.
- Spec sources caricate in `docs/sources/` (prototype.html, spec.xlsx, spec_bundle.zip).

### Note storiche
- Modello iniziale: 8 aree (HOME, REGISTRA, PIANIFICA, COMMUNITY, GARAGE, GRUPPI & EVENTI, CLASSIFICA, PROFILO). Superseded da 3 pillars in 0.1.0.
- `Segment`/`SegmentAttempt` per classifica per-segmento. Rimossi in 0.1.0.
- ProfiloScreen come MONDO tab. Spostato nel drawer in 0.1.0.

---

## Convention

Quando si chiude un milestone:
1. Sposta le voci da `[Unreleased]` a una nuova versione `[x.y.z] — YYYY-MM-DD`.
2. Bump version in `package.json`.
3. Commit `chore: release vX.Y.Z`.

Quando si introduce una breaking change:
- Bump **MAJOR** in 0.x (prima del 1.0) significa "non backward-compatible" rispetto ai testers — usare con cautela.
- Documentare la migration nella sezione "Cambiato" della version corrente.
