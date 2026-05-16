# Moto-lollo · ROADMAP

Piano di costruzione dell'app reale, organizzato per fasi. Auto-sufficiente: se una chat si chiude, basta rileggere questo file + `docs/PLAN.md` + `docs/spec/` per ripartire.

**Ultimo aggiornamento:** 2026-05-16.

---

## 0. Decisioni strategiche

### Target di deployment

| Quando | Cosa | Perché |
|--------|------|--------|
| **Ora → indefinito (1+ anno)** | **PWA via Vercel** | Codebase Next.js esistente, deploy istantaneo, gli amici aprono il link sul telefono e fanno "Add to Home Screen" in 30 secondi. Zero developer accounts, zero store review, zero sideload. |
| **Futuro (orizzonte 1-2 anni)** | **Flutter nativo** | L'app finale "vera" sarà nativa. Decisione presa: Flutter, non Capacitor wrap. Mantenuto come marker, non c'è una scadenza. |

### Vincoli accettati per fase PWA

- **Tracking GPS funziona solo a schermo acceso** (Wake Lock API). L'utente lo sa: tiene il telefono al manubrio acceso. Per le sessioni di test in 4-5 persone amiche è ok.
- **No background sync veri.** Quando torni online, replay degli eventi locali via service worker queue.
- **No push notifications nativi su iOS PWA** prima di iOS 17.4. Sostituibile con in-app notification bell + email transattive se serve.

### Vincoli per evitare lock-in Flutter

Tutto va scritto pensando che un domani Flutter chiamerà gli stessi endpoint:
- **Auth**: Supabase Auth (JWT) — Flutter ha SDK ufficiale.
- **API**: Supabase REST + RPC functions — Flutter ha SDK identico.
- **Tipi domain**: già unificati in `src/types/domain.ts` (mirror PostgreSQL → TypeScript). Flutter avrà file equivalenti generati dallo schema.
- **NIENTE** Next.js Server Actions, NIENTE getServerSideProps logic-heavy. Il front è una SPA stateless che chiama API.
- **Mappe**: MapLibre + OpenRouteService — Flutter ha plugin equivalenti (`maplibre_gl`), API REST ORS identica.

### Stack scelto

| Layer | Tech | Note |
|-------|------|------|
| Front | Next.js 16 App Router + React 19 + Tailwind 4 | Già in produzione |
| PWA | next-pwa o vanilla service worker | Manifest + offline cache app shell |
| Auth | Supabase Auth | email/password + magic link, Google OAuth più avanti |
| DB | Supabase (Postgres + RLS) | RLS per ogni tabella, niente API custom prima di averne bisogno |
| Storage | Supabase Storage | foto attività, avatar |
| Realtime | Supabase Realtime | per cordata (fase 4) |
| Mappe | MapLibre GL JS + OpenFreeMap + OpenRouteService | tile gratis illimitate + directions/geocoding 2k/1k al giorno. Switch da Mapbox dopo problemi account. |
| Deploy | Vercel | main → prod |
| Monitoring | (vedere fase 6) | Sentry per errori, posthog/plausible per analytics |

---

## 1. Logica delle fasi

Costruiamo per pillar dell'app. Ogni fase è autocontenuta e rilasciabile. Tu testi la fase prima di passare alla successiva.

```
Fase 0 (current)     SPEC + DECISIONI
Fase 1               MVP "IO solo"  ← prima volta provabile in strada
Fase 2               GRUPPO base
Fase 3               MONDO base (feed)
Fase 4               Cordata live
Fase 5               Classifica + Storia + Diario + extras
Fase 6               Polish + monitoring + (eventuale) Flutter port
```

Stima totale a sentimento: **4-6 mesi** se ci si lavora con costanza ma non a tempo pieno. Ogni fase è indipendente: si può fermare il lavoro fra una fase e l'altra senza che l'app si rompa.

---

## Fase 0 — Spec + decisioni *(chiusa, in iterazione UI verso Fase 1)*

**Obiettivo:** chiudere tutta la spec scritta prima di toccare il backend, così non si "improvvisa" durante l'implementazione.

**Deliverable:**
- [x] `docs/PLAN.md` aggiornato (15 step front chiusi)
- [x] `docs/spec/` foundation: README + overview + domain model + E2E flows
- [x] Cleanup repo (dead code, INCONSISTENCIES.md archiviato, docs/sources/README.md)
- [x] `docs/ROADMAP.md` (questo file)
- [x] `docs/spec/` per-screen: 15 file (IO×4, GRUPPO×6, MONDO×3, drawer, navigation)
- [x] `docs/spec/80_backend_design.md` — schema Postgres + RLS policies + setup
- [x] Mappare file canonici da `docs/sources/spec_bundle.zip` per il back

**Iterazione UI / pre-Fase 1 (in corso):**
- [x] IA passa da 3 pillar a 2 pillar (MONDO sciolto, Feed in IO, Eventi/Classifica nel drawer)
- [x] Stack mappe MapLibre + OpenFreeMap + ORS attiva e funzionante
- [x] Navigazione Fasi A+B: search destinazione, route preview, step progression con banner dinamico
- [x] Garage redesign a dashboard 2×2 + vehicle switcher (moto+auto) via swipe/picker
- [x] Mappa redesign a grid quadrato di card con mini-mappa + filtri stratificati
- [ ] Navigazione Fasi C+D: voce TTS + arrivo (in PR #6, da testare in macchina)

**Effort residuo prima di Fase 1:** validare voce/arrivo + 1-2 uscite reali tracciate.

---

## Fase 1 — MVP "IO solo": prima volta in strada

**Obiettivo:** un'app installabile, con login, in cui tu puoi:
1. Registrare un'uscita GPS (tracking foreground)
2. Navigare verso una destinazione
3. Vedere la tua mappa (archivio percorsi creati / activity)
4. Gestire le tue moto + manutenzione + documenti
5. Vedere il tuo profilo + impostazioni base

Tutto il resto (pillar GRUPPO, pillar MONDO, cordata, classifica) **disabilitato/nascosto** in questa fase.

### Backend (Fase 1)

Tabelle Supabase + RLS:
- `profiles` (1:1 con auth.users)
- `user_preferences`
- `motorcycles` + `maintenance_records` + `documents`
- `activities` + `activity_media` + `activity_track_points` (separato per perf, vedi legacy `04_tracking/`)
- `planned_routes` (per Crea/Importa GPX)

RLS policy semplice: **owner = current user only**. Niente sharing in fase 1.

Storage buckets: `avatars/`, `motorcycle-photos/`, `activity-media/`.

### Front (Fase 1)

- **Auth screens** (signup, login, password reset, magic link). 4 schermate, nuove.
- **PWA wrapper**: `manifest.webmanifest`, service worker per app shell cache, icone, splash.
- **Stack mappe — già attiva**, da estendere:
  - Editor mappa per "Crea un percorso" (tap = waypoint) — TODO
  - Tracking GPS reale via `geolocation.watchPosition` + Wake Lock — **fatto**
  - Navigation turn-by-turn (ORS Directions + step progression + voce + arrivo) — **Fasi A+B fatte, C+D in PR**
  - GPX import parser — TODO
- **Schermate da wirare a Supabase**: HomeScreen, MappaScreen (archivio), RegistraScreen (4 modi tutti veri), GarageScreen + sub-screens (manutenzione, documenti), ProfiloScreen + Impostazioni + Privacy.
- **Drawer Notifiche** funzionante (Supabase Realtime su `notifications` table).
- **Hide gruppi e mondo**: BottomNav mostra solo IO. Hamburger drawer funziona.

### Cosa NON in fase 1
- Cordata, gruppi, mondo, classifica, feed, eventi: tutto invisibile.
- Push notifications (resta solo bell in-app).
- Background sync (acceptabile, ne parliamo se diventa problema).

### Definizione di "fatto"

- Tu, sul tuo telefono, fai login.
- Fai un'uscita di 30 km, la registri, la salvi.
- La rivedi in Mappa con polyline reale (non più SVG procedurale).
- Aggiungi una moto, registri un tagliando, metti la scadenza assicurazione.
- 4-5 amici fanno la stessa cosa indipendentemente.

**Effort:** 4-6 settimane.

---

## Fase 2 — GRUPPO base

**Obiettivo:** i 5 amici testers possono creare un gruppo, invitarsi, vedere i membri, pianificare un'uscita semplice.

### Backend (Fase 2)
- `groups` (con `isPrivate: true` sempre)
- `group_memberships` (con role: leader/admin/member)
- `group_membership_requests` (workflow di iscrizione)
- `group_rides` (con `navigatorUserId`)
- `group_ride_rsvps`
- `route_proposals`
- `ride_board_comments`

RLS più articolato (vedi `docs/spec/70_flussi_e2e.md` §"Authorization matrix").

### Front (Fase 2)
- **Abilita** il pillar GRUPPO nella BottomNav.
- GruppoListScreen (esplora) + GruppoHomeScreen + PianificaScreen (admin vs member).
- "Crea un gruppo" mutation (l'utente diventa leader+admin).
- "Invita via link condivisibile": URL `/join/<token>` → flow di richiesta iscrizione.
- Admin tools: approvare iscrizioni, approvare/rifiutare proposte, creare GroupRide da una proposta.
- StoriaScreen + DiarioScreen attivati ma con dati semplici (no foto-uploading complete in questa fase, magari).
- CordataScreen rimane disabilitata fino a fase 4.

### Cosa NON in fase 2
- Cordata live.
- Pubblicazione percorsi a `scope: "public"` (solo `scope: "group"` resa visibile ai member).
- MONDO ancora nascosto.

**Effort:** 2-3 settimane.

---

## Fase 3 — MONDO base (feed)

**Obiettivo:** un utente può pubblicare un suo percorso/attività al mondo intero. Altri lo vedono nel Feed.

### Backend (Fase 3)
- `published_routes` (con `scope: "public"` o `"group"`, denormalized counters `savedCount`, `navigatedCount`)
- `route_likes`
- `route_comments`
- `saved_routes`
- `follow_relationships`
- `public_events` (curati da admin app — fase 3 con seed manuale)
- `event_rsvps`

### Front (Fase 3)
- Abilita pillar MONDO: FeedScreen (con filtro `alsoForCars`), EventiScreen.
- Like, comment, save, follow mutations.
- "Pubblica" CTA in detail Activity + detail PlannedRoute.
- Saved bucket in MappaScreen funzionante (wiring TODO già marcato).
- Admin app per inserire `public_events`: per ora script SQL, niente UI admin.

### Cosa NON in fase 3
- Classifica (la inseriamo in fase 5 quando i numeri hanno senso).
- Promote-to-public da gruppo (lo aggiungiamo in fase 5).

**Effort:** 2 settimane.

---

## Fase 4 — Cordata live

**Obiettivo:** i 5 amici fanno una vera uscita di gruppo, con cordata realtime e navigatore designato.

### Backend (Fase 4)
- Supabase Realtime channel per ogni `group_ride` in stato `"in-corso"`.
- `live_sessions` table per tracking + cleanup.
- Cron job per chiudere rides "in-corso" stale (timeout 6h).
- Push notification on `GroupRide.status` → in-corso (web push API, opt-in).

### Front (Fase 4)
- CordataScreen live wired ad Realtime.
- NavigationOverlay con kind "cordata" stream le mosse del navigatore agli altri.
- Chat cordata realtime.
- Stop & save crea Activity per ogni partecipante (cascade).

### Cosa NON in fase 4
- Alert "rider indietro" / "rider fermo": logica fancy. Lo lascio per fase 5 se ha senso.

**Effort:** 3-4 settimane (la più complicata).

---

## Fase 5 — Classifica + Storia avanzata + extras

**Obiettivo:** finire il pillar MONDO con la classifica percorsi, finire la Storia con foto, aggiungere badge e safety contacts.

### Backend (Fase 5)
- Triggers per mantenere `savedCount` / `navigatedCount` / `commentsCount`.
- Background job per Storia: helper che computa quali GroupRide finiscono nel finestramento 24h+30g.
- `badges` + `user_badges` con regole base (first ride, 100 km in giorno, weekend warrior, ecc.).
- `safety_contacts` + endpoint SOS (sostituto MVP: invia email/SMS via Twilio o Resend a contatti registrati).

### Front (Fase 5)
- ClassificaScreen wired.
- StoriaScreen + DiarioScreen completi (foto upload).
- ProfiloScreen badge funzionanti.
- Drawer > Impostazioni > Sicurezza: aggiunta contatti SOS.

### Eventuali "promote group → public"
- Admin di gruppo può promuovere un `PublishedRoute` da `scope: "group"` a `scope: "public"`.

**Effort:** 2-3 settimane.

---

## Fase 6 — Polish + monitoring + (decisione) Flutter port

**Obiettivo:** stabilizzare quel che c'è prima di considerare cose nuove o riscritture.

- Sentry per errori frontend + log strutturati lato Supabase Functions
- PostHog o Plausible per analytics base (DAU, retention, principali eventi)
- A/B test sulla onboarding (eventualmente)
- Performance audit (Lighthouse, bundle size, MapLibre tile cache)
- **Decisione Flutter rewrite:** valutare costi/benefici dopo 6-12 mesi di PWA in uso reale. Se la base utenti cresce e i limiti background diventano insostenibili (cordata seria, navigation con telefono in tasca), si comincia il porting. Altrimenti si tiene PWA.

**Effort:** 2 settimane di stabilizzazione + decisione separata sul porting.

---

## 2. Roadmap "non tecnica" — community & sviluppo

Visto che parli di 4-5 motociclisti amici che possono testare:

- **Iniziare a coinvolgerli adesso**: spiega cosa stai facendo, fai vedere il front attuale, raccogli feedback PRIMA di fare il back. Sono i tuoi early adopters.
- **Quando esce Fase 1**: dropoff prima settimana = ok. Fai 1 uscita di gruppo con loro in PWA: a 2-3 amici dai compito di "trovare il modo di farla rompere". Tu vedi cosa rompono.
- **Fra Fase 1 e Fase 2**: 2 settimane di "uso reale" prima di passare a costruire altro. Ogni bug serio scoperto = priorità su Fase 2.
- **Fra ogni fase successiva**: 1 settimana di review prima di andare avanti.

---

## 3. Cosa **non** è in roadmap

Per non confonderci dopo:
- ❌ Pagamenti / subscription / premium tier
- ❌ Admin panel web per moderazione del Mondo
- ❌ Marketplace (vendere moto, accessori) — non è il prodotto
- ❌ Sponsor / advertising
- ❌ Integrazioni Strava/Komoot (export OK in futuro, import dopo)
- ❌ Track day timing professionale (segments cronometrati) — l'avevamo, l'abbiamo levato
- ❌ Versione desktop nativa

Se uno di questi diventa importante in futuro, va nella sua propria roadmap.

---

## 4. Test strategy (placeholder)

Da definire **dopo aver costruito** Fase 1. Pensieri iniziali:
- Unit test su funzioni pure (`evaluateStory`, `isAdminOfGroup`, helpers di calcolo distance/duration).
- E2E con Playwright su 3-4 flussi critici (signup, registra uscita, pubblica): vedere `docs/spec/70_flussi_e2e.md` per la lista.
- Niente test di componenti React (over-engineering per il prototipo). Si valuta in Fase 6.

---

## 5. Apertura per chat future

Quando una chat si chiude e ne aprite una nuova, basta dire:

> "Continuiamo Moto-lollo. Sono Ray. Leggi `docs/ROADMAP.md`, `docs/PLAN.md`, e `docs/spec/`. Siamo in fase X."

E si riparte da qui. Lo stato "siamo in fase X" lo aggiorniamo in cima a questo file.

**Stato attuale: Fase 0 chiusa. Iterazione UI + navigazione in corso, in transizione verso Fase 1 (Supabase + auth + persistence).** Vedi `HANDOFF.md` per i dettagli operativi.
