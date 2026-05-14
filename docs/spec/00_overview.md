# 00 · Overview

## Modello mentale

L'app è organizzata in **2 pillars** (IO e GRUPPO) — switchabili tramite **toggle compatto nell'Header**. Più 2 zone "fuori bottom":

```
┌─ HEADER ──────────────────────────────────────────────┐
│  [☰]    [ IO  |  MG GRUPPO ]               [Avatar]   │
└───────────────────────────────────────────────────────┘
         ↑       ↑                                 ↑
         drawer  pillar toggle                   fullscreen
                                                  overlay
                                                  ↓
                                          Navigation
                                          Tracking GPS
                                          Cordata live

┌─ MAIN  ───────────────────────────────────────────────┐
│  contenuto del pillar/screen corrente                 │
└───────────────────────────────────────────────────────┘

┌─ BOTTOM NAV ──────────────────────────────────────────┐
│   tab 1  ·  tab 2  ·  tab 3  ·  ...                   │  (tab del pillar attivo, niente switcher)
└───────────────────────────────────────────────────────┘
```

### Pillar IO (personale + community feed)

| Tab | Scopo |
|-----|-------|
| Home | Launcher hub: km totali + 4 azioni rapide (Registra/Crea/Naviga/Carica GPX) che aprono direttamente l'overlay fullscreen |
| Mappa | **Archivio percorsi personali** (creati + salvati da Mondo/Gruppo) |
| Feed | Percorsi pubblici della community (filtri: chi segui · tutti · alsoForCars) |
| Garage | Moto + manutenzione + documenti + scadenze |

Note:
- La vecchia tab `io.registra` è stata eliminata (vedi `12_io_registra.md` ARCHIVED). Le 4 modalità di guida sono azioni della Home.
- Il vecchio pillar MONDO è stato sciolto: **Feed** è diventato la 3ª tab di IO; **Eventi** e **Classifica** vivono nel drawer hamburger.

### Pillar GRUPPO (contesto = gruppo corrente)

Sopra il pillar c'è il **GroupSelector** (chip strip): i miei gruppi + bottone "+ esplora". Tap "esplora" → schermo lista gruppi pubblici. Tap gruppo → switch contesto.

| Tab | Scopo |
|-----|-------|
| Gruppo | Home gruppo: membri, next ride, percorsi proposti |
| Pianifica | Bacheca eventi · admin edita, member legge+propone |
| Cordata | Pre-partenza + live (con navigatore designato) |
| Storia | Ultima uscita finestrata (vive fino a 24h prima del next event, max 30 giorni) |
| Diario | Archivio cristallizzato di tutte le uscite passate |

Per **non-membri** che entrano in un gruppo tramite Esplora, lo screen `gruppo.home` mostra il **profilo del gruppo** (membri pubblici, prossima uscita, percorsi pubblici) + tasto "richiedi iscrizione".

### Drawer (fuori pillar)

Apertura da hamburger top-left.

| Voce | Scopo |
|------|-------|
| Profilo | Identità, stats, badge, moto |
| Eventi | Eventi big curati da noi (raduni, EICMA, track day) |
| Classifica | Classifica di **percorsi** della community (likes / saves / navigated) |
| Impostazioni | Tema, lingua, unità, notifiche, visibilità default |
| Privacy & Policy | Visibilità account, consensi, esporta dati, cancella account |
| Esci | Logout |

### Fullscreen overlay (fuori bottom nav, sopra tutto)

Aperto **solo on-demand**, mai come tab. Tre kind:

- `tracking` — registrazione GPS uscita libera o da editor manuale
- `navigation` — turn-by-turn verso destinazione (con tracking sottostante)
- `cordata` — solo il navigatore designato di una cordata live lo apre; gli altri membri restano sullo screen Cordata.

Tutte e tre presentano: mappa, banner manovra (solo `navigation`), HUD (km, tempo, media, velocità), Pausa/Stop, Stop & salva.

---

## Decisioni chiave (riepilogo da PLAN.md §1)

1. **`alsoForCars`** è un boolean flag su `PublishedRoute`, non un enum. Filtro Feed.
2. **Naviga** è la 4ª opzione di `io.registra`, non sta in Home.
3. **Ray (`u0`) è admin del gruppo Moto Garda** in seed — marker `HUMAN-DEFERRED` perché in prod l'admin promotion passa per workflow.
4. **Storia lifecycle:** vive fino a 24h prima del next event di quel gruppo. Tetto 30 giorni. Oltre → Diario.
5. **Gruppi sono privati moderati** (`isPrivate: true` sempre in MVP). Admin accetta/rifiuta richieste, valida proposte percorso, decide cosa promuovere a pubblico Mondo.
6. **Membro vs admin** è il discriminante UI principale nei pillar GRUPPO.
7. **Mappa di navigazione = fullscreen overlay**, mai una tab.
8. **Profilo** vive nel drawer, non in Mondo.

---

## Cosa NON c'è nel prototipo (parking lot)

Punti deliberatamente fuori scope frontend, ma **da progettare backend-side**:

- **Auth reale**: la sessione è hardcoded su `u0` (Ray). Nel back: signup/login (email/social), session refresh, password recovery, account deletion.
- **Mapbox token reale**: tutte le mappe in app sono SVG procedurali. Nel back: token gestito server-side, geocoding, directions, tile billing.
- **GPX parser reale**: bottone esiste, parse simulato. Nel back: validate/sanitize GPX upload, store, derive `PlannedRoute`.
- **Notifiche push reali**: lista in-app esiste, niente FCM/APNs. Nel back: deliver service + token registry.
- **Tracking GPS reale**: simulato con setInterval. Nel back: ingest TrackPoint stream con dedup, smoothing (vecchio bundle `04_tracking/gps_filters.md` ancora valido), idempotency (vecchio bundle `05_sync/idempotency.md`).
- **Realtime cordata**: la cordata live nel front ha posizioni statiche. Nel back: server-side broadcast a 5s (WS o realtime DB).
- **Safety / SOS / live sharing**: non implementato in UI. Spec legacy in `docs/sources/spec/09_safety/*` resta valida come riferimento.
- **Meteo**: card statica. Nel back: integration provider esterno.
- **Mutations server-side**: nel front tutto è client-side mutation sul mock DB. Nel back: ogni "mutation" della spec diventa una RPC/REST endpoint con own auth/validation.

---

## Convenzioni

- IT primary, EN come label secondario in eventuali admin tools.
- Unità: metric default (km, km/h, m), imperial via `UserPreferences.units`.
- Visibilità asset utente:
  - `private` → solo l'owner
  - `followers` → owner + follower
  - `public` → mondo
- I gruppi sono separati: un asset pubblicato `scope: "group"` è visibile solo ai membri di quel gruppo. L'admin può poi promuoverlo a `scope: "public"`.
- I counter denormalizzati (`savedCount`, `navigatedCount`, `membersCount`, `confirmedCount`, `publicRoutesCount`) NON sono trustable client-side. Nel back: aggiornati via trigger o background job.

---

## Glossario rapido

| Termine | Significato |
|---------|-------------|
| Activity | Una uscita registrata (GPS reale o simulata in prototipo). Ha track points, durata, distanza. |
| PlannedRoute | Un percorso *progettato* dall'utente (waypoints), non guidato. |
| PublishedRoute | Un percorso *condiviso* (derivato da Activity o PlannedRoute) visibile a una scope (`public` o `group`). |
| SavedRoute | Il "salvataggio" che un utente fa di un PublishedRoute altrui → finisce nel suo archivio (`io.mappa`). |
| Group | Gruppo privato moderato. Ha admin/leader/member. |
| GroupRide | Un'uscita pianificata da un gruppo. Ha RSVP, navigatore designato, lifecycle (proposta→confermata→in-corso→completata). |
| RouteProposal | Un member propone un suo PlannedRoute al gruppo. L'admin approva o rifiuta. |
| Cordata | Modalità live di un GroupRide: tutti i partecipanti condividono posizione in tempo reale. |
| Navigatore | Il singolo rider designato dall'admin che riceve turn-by-turn vero. Gli altri vedono la cordata. |
