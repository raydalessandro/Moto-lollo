# HANDOFF — punto di apertura sessione

> **Leggi questo file come prima cosa** quando inizi una nuova chat su Moto-lollo. 30 secondi di lettura, e sai dove siamo.

---

## Stato (2026-05-16)

**Fase 0 chiusa. Iterazione UI + navigation in corso, in transizione verso Fase 1.**

- Build verde su `main`
- Deploy Vercel attivo + Preview su PR
- Stack mappe **attiva e funzionante** (MapLibre + OpenFreeMap + OpenRouteService)
- Navigazione **Fasi A+B mergiate**: geocoding destinazione + route preview + step progression con banner turn-by-turn dinamico
- UI sweep mergiata (PR #7): Garage dashboard, vehicle switcher (moto+auto), Mappa redesign

**Architettura UI corrente:**
- **2 pillar**: IO (Home · Mappa · Feed · Garage) + GRUPPO (Gruppo · Pianifica · Cordata · Storia · Diario)
- **Toggle IO↔GRUPPO** nell'Header (pillola compatta)
- **Drawer hamburger**: Profilo · Eventi · Classifica · Impostazioni · Privacy

---

## In corso / aperto

### PR #6 — `feat/turn-by-turn-c` (da testare e mergiare)

Fasi C+D della navigazione:
- **Voce TTS** (`src/lib/voice.ts`) — Web Speech API, italiano, distanze quantizzate, anti-doppia annunci, mute/unmute
- **Arrivo** — overlay quando entri in raggio di 30m dalla destinazione, summary + CTA "Chiudi"
- **Viste preview/navigating** rifinite — banner step compatto in alto, hint "tra Xm" in cima alla mappa
- Tests (Vitest) + doc CHANGELOG/HANDOFF aggiornati sulla branch (non ancora su main)

**Da fare quando torna Ray:**
1. Aprire Preview Vercel della PR #6
2. Testare voce **in macchina** (richiede gesture utente per Speech API + audio jack/Bluetooth)
3. Verificare summary di arrivo a destinazione raggiunta
4. Se OK → squash merge su main

### Issue noti

- **Geocoding ORS — indirizzi italiani**: Pelias non trova certi indirizzi (es. "Via XXV Aprile, Cesano Boscone"). Workaround pendente: provider alternativo (Nominatim/Photon) o pre-processing numeri romani lato client.

---

## Prossimo passo dopo PR #6

**Checkpoint deciso con Ray:** il pillar GRUPPO aspetta percorsi tracciati veri. Senza attività registrate dalla navigazione, il Gruppo è pagina vuota.

Ordine:
1. **PR #6 mergiata** (voce + arrivo)
2. **1-2 uscite reali** registrate da Ray usando la navigazione completa
3. **Allora** UI del pillar GRUPPO, usando quei percorsi come content reale per Cordata/Pianifica/Storia

---

## Setup ORS (già fatto)

API key OpenRouteService configurata su Vercel (Production + Preview) come `NEXT_PUBLIC_ORS_TOKEN`. Tile MapLibre + GPS funzionano sempre indipendentemente dal token.

Se l'account Mapbox di Ray un giorno si sblocca (vedi "Storia" sotto), il porting MapLibre → Mapbox richiede ~30 min: API quasi identiche.

### Storia: perché non Mapbox

Inizialmente integrato Mapbox GL JS. L'account Mapbox di Ray ha presentato anomalie inspiegabili (tutte le richieste ai default style ufficiali rispondevano "Style not found") nonostante token valido. Dopo ~2 ore di debug, switch a stack open-source. MapLibre legge anche tile Mapbox: se l'account si sblocca, torno con poco lavoro.

---

## Fase 1 strict: MVP "IO solo"

Obiettivo: app installabile come PWA, con login Supabase, in cui Ray + 4-5 amici motociclisti possono:
1. Registrare uscite GPS (tracking foreground con Wake Lock) ← **infrastruttura già pronta**
2. Navigare verso una destinazione (turn-by-turn ORS) ← **Fasi A+B mergiate, C+D in PR #6**
3. Vedere archivio percorsi personali ← **UI pronta, da agganciare a Supabase**
4. Gestire moto + manutenzione + documenti ← **UI Garage pronta (PR #7), da agganciare a Supabase**

Pillar GRUPPO e drawer Eventi/Classifica **disabilitati/nascosti** in Fase 1.

Step 1 di Fase 1 = **Schema migration 001 (auth + profile + preferences)** + setup Supabase project.

Dettagli completi: [`docs/spec/80_backend_design.md`](./docs/spec/80_backend_design.md) §12 "Ordine implementazione Fase 1".

---

## Cosa leggere prima di muoversi

In ordine, ~10 minuti:

1. **Questo file** ✓ già letto
2. [`docs/ROADMAP.md`](./docs/ROADMAP.md) — le 6 fasi
3. [`CHANGELOG.md`](./CHANGELOG.md) — cosa è cambiato di recente
4. [`docs/spec/80_backend_design.md`](./docs/spec/80_backend_design.md) — schema, RLS, setup
5. [`AGENTS.md`](./AGENTS.md) — convenzioni operative

Per task specifici a una schermata, leggi anche `docs/spec/<num>_*.md`.

---

## Comandi per riallinearsi

```bash
git status                     # working tree pulito?
git log --oneline -10          # contesto recente
git fetch origin && git pull   # sync con remote
npm install                    # dependencies a posto
npm run typecheck              # build verde?
```

---

## Workflow git corrente

Da quando lavoriamo con review + Preview Vercel:
- Feature work su branch `feat/<area-cosa>` o `fix/<area-cosa>`
- PR via `mcp__github__create_pull_request` (draft → ready quando build verde)
- Squash merge su `main` quando Ray approva su Preview
- `main` deploy automatico su Vercel

Non più push diretti su `main`.

---

## Decisioni di prodotto già prese (non rinegoziare senza Ray)

- **Stack back**: Supabase (Postgres + RLS + Auth + Storage + Realtime)
- **Target deploy ora**: PWA via Vercel. **Flutter** è target finale ma a 1-2 anni.
- **Tracking GPS**: foreground only via Wake Lock. Accettabile per testers iniziali.
- **No Capacitor**: troppi passaggi per testare. PWA è abbastanza.
- **Niente push notifications native** in MVP (iOS PWA limitato). Solo in-app bell.
- **Veicoli polimorfici**: `Motorcycle` ora ha campo opzionale `kind: "moto" | "auto"`. Type name resta `Motorcycle` per non fare rename a tappeto.

---

## Domande aperte (HUMAN-DEFERRED) da chiudere prima di codare Fase 1

Vedi `docs/spec/80_backend_design.md` §15 "Domande aperte critiche":

1. Username modificabile entro 7g? (proposed in vecchia spec F-003)
2. Background sync su PWA: flow di queue verso Supabase quando torna online.
3. GDPR export format: JSON dump completo o ZIP con CSV multipli + foto?
4. Email transactional provider: Supabase SMTP default vs Resend.

---

## Promemoria operativi

- Commit conventional: `tipo(area): messaggio`. Vedi `AGENTS.md`.
- Build verde è **non-negoziabile** prima di push: `npm run typecheck` + `npm run build`.
- Lint: errori solo nei propri file vanno fixati. Errori pre-esistenti in altri file = non bloccanti.
- Spec out-of-date = debito tecnico. Aggiorna `docs/spec/*` quando aggiungi codice (post-Fase 1).

---

## Quando aggiornare questo file

Aggiornare `HANDOFF.md` ogni volta che:
- Cambia lo stato corrente (es. chiudi una fase, mergi una PR rilevante)
- Cambia il "prossimo passo"
- Si chiude un milestone (allinea anche `CHANGELOG.md`)

Si chiude una sessione di lavoro:
- Se hai chiuso milestone → aggiorna `HANDOFF.md` + `CHANGELOG.md`
- Se sei a metà task lungo → aggiorna `HANDOFF.md` con "in corso: X, ho lasciato a Y"
