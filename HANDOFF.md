# HANDOFF — punto di apertura sessione

> **Leggi questo file come prima cosa** quando inizi una nuova chat su Moto-lollo. 30 secondi di lettura, e sai dove siamo.

---

## Stato (2026-05-16)

**Checkpoint: turn-by-turn navigation completa, in attesa di road test.**

- Build verde su `main` (Fase A turn-by-turn già mergiata)
- **PR #6 aperta (draft)** con Fasi B+C+D della navigation + test suite Vitest
- 29/29 test unitari verdi (motore di navigazione 99% cov, voice 95% cov)
- Deploy Vercel attivo, Preview deploy automatico per la PR
- Stack mappe in produzione: MapLibre + OpenFreeMap (tile) + OpenRouteService (geocoding + directions). Token ORS già configurato su Vercel.

**Architettura UI corrente:**
- **2 pillar**: IO (Home · Mappa · Feed · Garage) + GRUPPO (Gruppo · Pianifica · Cordata · Storia · Diario)
- **Toggle IO↔GRUPPO** nell'Header (pillola compatta, no più striscia in bottom nav)
- **Drawer hamburger**: Profilo · Eventi · Classifica · Impostazioni · Privacy

---

## Cosa c'è nella PR #6 (turn-by-turn)

State machine `search → preview → navigating → arrived` dentro `NavigationOverlay`.

| Fase | Cosa | File principali |
|------|------|-----------------|
| **A** (merged) | Search destinazione + geocoding debounced + preview card con km/durata + Avvia/Cambia | `NavigationOverlay.tsx` |
| **B** | Step progression engine (proximity matching), banner dinamico con icona maneuver corretta, HUD navigazione (fatti / rimanenti / arrivo HH:MM) | `lib/navigation.ts`, `lib/maps.ts` |
| **C** | Voce italiana via Web Speech API (200m + 50m anti-doppione), toggle voce, reroute automatico (off-route > 50m per > 5s) | `lib/voice.ts` |
| **D** | Arrival detection (< 30m per 3s) + ArrivalSummary card, rimozione debug HUD da MapView | `NavigationOverlay.tsx`, `MapView.tsx` |

**Test suite** (`src/lib/__tests__/`):
- `navigation.test.ts` — 22 test su `computeNavProgress`, formattatori, icone maneuver
- `voice.test.ts` — 7 test su `speak/cancel/availability` con mock di `window.speechSynthesis`
- Comandi: `npm test`, `npm run test:watch`, `npm run test:coverage`

**Issue noto tracciato in CHANGELOG:** ORS Pelias non trova alcuni indirizzi italiani (es. "Via XXV Aprile, Cesano Boscone"). Da gestire post-road-test con fallback Nominatim/Photon o normalizzazione numeri romani client-side.

---

## Prossimo passo: **road test → merge PR #6 → Fase 1 (Supabase)**

1. **Ray fa road test in macchina** (30-40 min, destinazione conosciuta). Valida B+C+D in scenario reale: GPS noise, velocità autostradale, devianze involontarie, perdita segnale.
2. **Bug eventuali** → branch `feat/turn-by-turn-fix-X`, regression test in `navigation.test.ts` prima di fixare, commit + push.
3. **PR #6 merge** quando test reale è ok.
4. **Fase 1 — MVP "IO solo"**: Supabase setup, auth screens, schema migration 001 (auth + profiles + preferences), persistence delle uscite, PWA manifest. Vedi [`docs/spec/80_backend_design.md`](./docs/spec/80_backend_design.md) §12 "Ordine implementazione Fase 1".

---

## Stack mappe — promemoria

| Componente | Provider | Token |
|------------|----------|-------|
| Tile rendering | MapLibre GL JS + OpenFreeMap | nessuno |
| Geocoding | OpenRouteService Pelias | `NEXT_PUBLIC_ORS_TOKEN` (Vercel + .env.local) |
| Directions | OpenRouteService | come sopra |
| GPS | `navigator.geolocation.watchPosition` | nessuno |
| Wake Lock | Wake Lock API | nessuno |

**Senza ORS key:** tile e GPS funzionano comunque (utile per modalità "Registra mentre guidi"). Solo "Naviga" è disabilitato.

### Storia: perché non Mapbox

Inizialmente avevamo integrato Mapbox GL JS. L'account Mapbox di Ray ha presentato anomalie inspiegabili (tutte le richieste ai default style ufficiali rispondevano "Style not found") nonostante token valido, email verificata, account in ordine. Dopo ~2 ore di debug abbiamo deciso di switchare a stack open-source. Riferimenti API praticamente identiche: se l'account Mapbox in futuro si sblocca, possiamo tornare a Mapbox in 30 min.

---

## Workflow attivo — branch + PR

Dalla Fase A turn-by-turn in poi non si pusha più diretto su `main`:

```bash
git checkout -b feat/<name>
# ...lavoro...
npm run typecheck && npm run test && npm run build
git push -u origin feat/<name>
# Apri PR (draft se WIP), Ray valida su Preview Vercel
# Quando ok → squash merge → main → sync locale → cancella branch
```

Per agent, MCP GitHub disponibile:
- `mcp__github__create_pull_request`
- `mcp__github__merge_pull_request`
- `mcp__github__update_pull_request` (per togliere draft prima di merge)

---

## Fase 1 strict (dopo road test): MVP "IO solo"

Obiettivo: app installabile come PWA, con login Supabase, in cui Ray + 4-5 amici motociclisti possono:
1. Registrare uscite GPS (tracking foreground con Wake Lock) ✅ logica già fatta in NavigationOverlay
2. Navigare verso una destinazione (turn-by-turn ORS) ✅ già fatto (PR #6)
3. Vedere archivio percorsi personali ← serve Supabase persistence
4. Gestire moto + manutenzione + documenti ← serve Supabase

Pillar GRUPPO e MONDO **disabilitati/nascosti** in Fase 1.

Step 1 di Fase 1 = **Schema migration 001 (auth + profile + preferences)** + setup Supabase project.

Dettagli completi: [`docs/spec/80_backend_design.md`](./docs/spec/80_backend_design.md) §12 "Ordine implementazione Fase 1".

---

## Cosa leggere prima di muoversi

In ordine, ~10 minuti:

1. **Questo file** ✓ già letto
2. [`CHANGELOG.md`](./CHANGELOG.md) — cosa è cambiato di recente, decisioni
3. [`docs/ROADMAP.md`](./docs/ROADMAP.md) — le 6 fasi
4. [`docs/spec/80_backend_design.md`](./docs/spec/80_backend_design.md) — schema Postgres, RLS, ordine implementazione
5. [`AGENTS.md`](./AGENTS.md) — convenzioni operative

Per task specifici a una schermata, leggi anche `docs/spec/<num>_*.md`.

---

## Comandi per riallinearsi

```bash
git status                         # working tree pulito?
git log --oneline -10              # contesto recente
git fetch origin && git pull       # sync con main
npm install                        # dependencies a posto
npm run typecheck                  # build verde?
npm test                           # 29/29 test verdi?
npm run build                      # production build ok?
```

---

## Decisioni di prodotto già prese (non rinegoziare senza Ray)

- **Stack back**: Supabase (Postgres + RLS + Auth + Storage + Realtime)
- **Target deploy ora**: PWA via Vercel. **Flutter** è target finale ma a 1-2 anni.
- **Map stack**: MapLibre + OpenFreeMap + ORS (no Mapbox, vedi storia sopra).
- **Tracking GPS**: foreground only via Wake Lock. Accettabile per testers iniziali (Ray + 4-5 amici).
- **No Capacitor**: troppi passaggi per testare. PWA è abbastanza.
- **Niente push notifications native** in MVP (iOS PWA limitato). Solo in-app bell.
- **Voce navigazione**: ora Web Speech API (it-IT). **Personalizzata (clip mp3 registrate da Ray)** post-MVP — l'interfaccia di `lib/voice.ts::speak(text, cueKey?)` è già pronta per il swap.

---

## Domande aperte (HUMAN-DEFERRED) da chiudere prima di codare Fase 1

Vedi `docs/spec/80_backend_design.md` §15 "Domande aperte critiche":

1. Username modificabile entro 7g? (proposed in vecchia spec F-003)
2. Background sync su PWA: flow di queue verso Supabase quando torna online.
3. GDPR export format: JSON dump completo o ZIP con CSV multipli + foto?
4. Email transactional provider: Supabase SMTP default vs Resend.

---

## Promemoria operativi

- Branch + PR è il workflow attivo. Niente più push diretti su `main`.
- Commit conventional: `tipo(area): messaggio`. Vedi `AGENTS.md`.
- Verde è **non-negoziabile** prima di push: `npm run typecheck` + `npm run test` + `npm run build`.
- Spec out-of-date = debito tecnico. Aggiorna `docs/spec/*` quando aggiungi codice.
- Per ogni bug emerso da road test → regression test in `src/lib/__tests__/*.test.ts` prima di fixare.

---

## Quando aggiornare questo file

Aggiornare `HANDOFF.md` ogni volta che:
- Cambia lo stato corrente (es. chiudi una fase, apri un task lungo)
- Cambia il "prossimo passo"
- Si chiude un milestone (allinea anche `CHANGELOG.md`)

Si chiude una sessione di lavoro:
- Se hai chiuso milestone → aggiorna `HANDOFF.md` + `CHANGELOG.md`
- Se sei a metà task lungo → aggiorna `HANDOFF.md` con "in corso: X, ho lasciato a Y"
