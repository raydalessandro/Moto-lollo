# HANDOFF — punto di apertura sessione

> **Leggi questo file come prima cosa** quando inizi una nuova chat su Moto-lollo. 30 secondi di lettura, e sai dove siamo.

---

## Stato (2026-05-14)

**Fase 0 chiusa + iterazione IA UI in corso.** Frontend prototype completo, spec v2 scritta, repo agent-ready. Recente iterazione UI: passaggio da 3 pillar a 2 pillar (vedi CHANGELOG).

- Build verde su `main`
- Deploy Vercel attivo
- Tutta la documentazione strategica + spec per-screen + backend design **già scritte**
- Backend NON ancora implementato — è il prossimo passo

**Architettura UI corrente:**
- **2 pillar**: IO (Home · Mappa · Feed · Garage) + GRUPPO (Gruppo · Pianifica · Cordata · Storia · Diario)
- **Toggle IO↔GRUPPO** nell'Header (pillola compatta, no più striscia in bottom nav)
- **Drawer hamburger**: Profilo · Eventi · Classifica · Impostazioni · Privacy

---

## Prossimo passo: **completare la navigazione** + ottenere chiave OpenRouteService

Stack mappe ora attiva:
- **Tile**: MapLibre GL JS + OpenFreeMap (zero signup, funziona già)
- **Geocoding + Directions**: OpenRouteService (richiede API key gratuita)
- File: `src/lib/maps.ts`, `src/lib/wake-lock.ts`, `src/lib/geolocation.ts`
- Componenti: `src/components/map/MapView.tsx` + `StaticMap.tsx`
- Wiring già fatto in `NavigationOverlay.tsx`

**In attesa:** Ray fornisce l'API key ORS. Setup:
1. Signup gratuito su [openrouteservice.org/dev/#/signup](https://openrouteservice.org/dev/#/signup)
2. Dashboard → "Tokens" → "Create new token" → copia
3. Su Vercel: Settings → Environment Variables → aggiungi `NEXT_PUBLIC_ORS_TOKEN`
4. Redeploy → modalità "Naviga" attiva con search destinazione + turn-by-turn

**Senza ORS key:** tile e GPS funzionano comunque (utile per la modalità "Registra mentre guidi").

### Storia: perché non Mapbox

Inizialmente avevamo integrato Mapbox GL JS. L'account Mapbox di Ray ha presentato anomalie inspiegabili (tutte le richieste ai default style ufficiali rispondevano "Style not found") nonostante token valido, email verificata, account in ordine. Dopo ~2 ore di debug abbiamo deciso di switchare allo stack alternativo open-source. Riferimenti API praticamente identiche: se l'account Mapbox in futuro si sblocca, possiamo tornare a Mapbox in 30 minuti (MapLibre legge anche le tile Mapbox).

### Step successivi (dopo Mapbox)

1. **Mapbox tile + geocoding** (in corso): vedi mappe reali in NavigationOverlay
2. **GPS reale + Wake Lock + Directions**: tracking foreground + turn-by-turn
3. **Supabase auth-only**: login vero, sessione propria
4. **Activity persistence**: le uscite si salvano
5. **Resto Fase 1**: garage, manutenzione, notifiche, storage media

Vedi `docs/ROADMAP.md` per il dettaglio.

## Fase 1 strict (post Mapbox): MVP "IO solo"

Obiettivo: app installabile come PWA, con login Supabase, in cui Ray + 4-5 amici motociclisti possono:
1. Registrare uscite GPS (tracking foreground con Wake Lock)
2. Navigare verso una destinazione (Mapbox turn-by-turn)
3. Vedere archivio percorsi personali
4. Gestire moto + manutenzione + documenti

Pillar GRUPPO e MONDO **disabilitati/nascosti** in Fase 1.

Step 1 di Fase 1 = **Schema migration 001 (auth + profile + preferences)** + setup Supabase project.

Dettagli completi: [`docs/spec/80_backend_design.md`](./docs/spec/80_backend_design.md) §12 "Ordine implementazione Fase 1".

---

## Cosa leggere prima di muoversi

In ordine, ~10 minuti:

1. **Questo file** ✓ già letto
2. [`docs/ROADMAP.md`](./docs/ROADMAP.md) — le 6 fasi
3. [`CHANGELOG.md`](./CHANGELOG.md) — cosa è cambiato di recente
4. [`docs/spec/80_backend_design.md`](./docs/spec/80_backend_design.md) — schema, RLS, Mapbox setup
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

## Decisioni di prodotto già prese (non rinegoziare senza Ray)

- **Stack back**: Supabase (Postgres + RLS + Auth + Storage + Realtime)
- **Target deploy ora**: PWA via Vercel. **Flutter** è target finale ma a 1-2 anni.
- **Tracking GPS**: foreground only via Wake Lock. Accettabile per testers iniziali (Ray + 4-5 amici).
- **No Capacitor**: troppi passaggi per testare (Apple Dev account, TestFlight, sideload APK). PWA è abbastanza.
- **Niente push notifications native** in MVP (iOS PWA limitato). Solo in-app bell.

---

## Domande aperte (HUMAN-DEFERRED) da chiudere prima di codare Fase 1

Vedi `docs/spec/80_backend_design.md` §15 "Domande aperte critiche":

1. Username modificabile entro 7g? (proposed in vecchia spec F-003)
2. Background sync su PWA: flow di queue verso Supabase quando torna online.
3. GDPR export format: JSON dump completo o ZIP con CSV multipli + foto?
4. Email transactional provider: Supabase SMTP default vs Resend.

---

## Promemoria operativi

- `main` push diretti ok (Fase 0, siamo in 1+Claude). Quando ci uniranno altri, valutare branch protection.
- Commit conventional: `tipo(area): messaggio`. Vedi `AGENTS.md`.
- Build verde è **non-negoziabile** prima di push: `npm run typecheck` + `npm run build`.
- Spec out-of-date = debito tecnico. Aggiorna `docs/spec/*` quando aggiungi codice.

---

## Quando aggiornare questo file

Aggiornare `HANDOFF.md` ogni volta che:
- Cambia lo stato corrente (es. chiudi una fase, apri un task lungo)
- Cambia il "prossimo passo"
- Si chiude un milestone (allinea anche `CHANGELOG.md`)

Si chiude una sessione di lavoro:
- Se hai chiuso milestone → aggiorna `HANDOFF.md` + `CHANGELOG.md`
- Se sei a metà task lungo → aggiorna `HANDOFF.md` con "in corso: X, ho lasciato a Y"
