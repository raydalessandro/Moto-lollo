# 70 · Flussi E2E

Tutti i flussi end-to-end che la UI supporta o ha bisogno di supportare. Ogni flusso elenca: passi utente, mutations attivate, side effects, edge cases. Usali per:

1. Scrivere test E2E (Playwright/Detox).
2. Disegnare gli endpoint backend (ogni mutation = un endpoint).
3. Verificare di non aver dimenticato side effects (counter, notifiche, RLS).

Convenzione: i nomi delle mutations sono "logici", il back è libero di mapparli a RPC/REST. Vedi singole pagine per-schermata per firme dettagliate.

---

## Lista flussi

| # | Flusso | Pillar | Difficoltà back |
|---|--------|--------|-----------------|
| F-01 | Onboarding nuovo rider | drawer | M |
| F-02 | Aggiungo una moto al garage | IO | S |
| F-03 | Registro promemoria scadenza assicurazione | IO | S |
| F-04 | Creo un percorso a mano sulla mappa | IO | M |
| F-05 | Registro un'uscita GPS | IO | L |
| F-06 | Importo un GPX | IO | M |
| F-07 | Navigo verso una destinazione | IO | M |
| F-08 | Salvo un percorso dal Feed Mondo | MONDO → IO | S |
| F-09 | Pubblico una mia uscita nel Mondo | IO → MONDO | S |
| F-10 | Pubblico un percorso solo per il gruppo | IO → GRUPPO | S |
| F-11 | Esploro e richiedo iscrizione a un gruppo | GRUPPO | S |
| F-12 | Admin approva richiesta iscrizione | GRUPPO | S |
| F-13 | Member propone percorso al gruppo | GRUPPO | S |
| F-14 | Admin valida proposta percorso → crea GroupRide | GRUPPO | M |
| F-15 | Member conferma RSVP a un GroupRide | GRUPPO | S |
| F-16 | Admin designa navigatore | GRUPPO | S |
| F-17 | Cordata live (navigatore + altri) | GRUPPO | XL |
| F-18 | Storia post-uscita → Diario | GRUPPO | M |
| F-19 | Apro classifica percorsi | MONDO | S |
| F-20 | Apro inbox notifiche | drawer/header | S |
| F-21 | Logout / cancello account | drawer | M |
| F-22 | Pubblico un post (testo + foto, opzionale link percorso) | IO → MONDO | S |

---

## F-01 · Onboarding nuovo rider

**Prerequisito:** account creato (signup auth).

**Passi UI:**
1. Welcome screen (placeholder MVP) → drawer Impostazioni
2. Compilo Profile (`displayName`, `username`, optionally `bio`, `city`)
3. Compilo Preferenze (theme, language, units)
4. (Opzionale) aggiungo prima moto al garage

**Mutations:**
- `updateProfile(userId, fields)` → upsert Profile
- `updatePreferences(userId, fields)` → upsert UserPreferences
- (opzionale) `createMotorcycle(ownerId, fields)` → Motorcycle

**Side effects:**
- Crea `Profile` di default se non esiste
- Crea `UserPreferences` di default
- Emette welcome `Notification` kind: `"badge_earned"` (badge "Benvenuto")

**Validation:**
- `username` unique, regex `^[a-z0-9._]{3,24}$`
- `displayName` 2-40 caratteri

**Edge cases:**
- Username già preso → errore inline
- Sessione scaduta a metà → re-login + resume form

---

## F-02 · Aggiungo una moto al garage

**Passi UI:** `io.garage` → "+ aggiungi moto" → form (brand, model, year, engineCc, color, name custom, foto)

**Mutations:**
- `createMotorcycle(ownerId, fields)` → Motorcycle
- Se è la prima: `setPrimaryMotorcycle(motoId)` (`isPrimary: true`) automatico

**Side effects:** nessuno.

**Validation:** brand/model required, year 1900–2100.

---

## F-03 · Registro promemoria scadenza assicurazione

**Passi UI:** `io.garage` → moto X → tab Documenti → "+ aggiungi documento" → kind, expiresAt, notes.

**Mutations:** `createDocument(ownerId, motorcycleId?, kind, expiresAt, notes?)` → Document.

**Side effects:**
- Schedule notification `kind: "ride_reminder"` (riusiamo kind generico) a 30/7/1 giorni prima della scadenza.
  - HUMAN-DEFERRED: nel back conviene un job che genera notifiche, non scheduling individuale.

---

## F-04 · Creo un percorso a mano sulla mappa

**Passi UI:** `io.registra` → "Crea un percorso" → editor mappa (placeholder MVP) → tap waypoints → save.

**Mutations:**
- `createPlannedRoute(ownerId, title, waypoints, notes?, tags)` → PlannedRoute
- Distanza/durata stimati lato server (directions API esterna)

**Side effects:** finisce in `io.mappa` (archivio).

**Validation:**
- ≥ 2 waypoints
- `distanceKm > 0`

---

## F-05 · Registro un'uscita GPS

**Passi UI:** `io.registra` → "Registra un'uscita" → "Avvia ora" → fullscreen tracking.

**Stati overlay:** running → paused → ended.

**Mutations:**
- `startActivityTracking(ownerId, motorcycleId?)` → ritorna `sessionId`
- Stream `TrackPoint` (idealmente batch ogni 5-10s o on backgrounding)
- `pauseActivityTracking(sessionId)`
- `resumeActivityTracking(sessionId)`
- `endActivityTracking(sessionId, title, notes?, tags, visibility)` → Activity

**Side effects on end:**
- Crea `Activity` con campi derivati (distance, avg speed, max speed, duration)
- Aggiorna `Motorcycle.totalKm` (+ distanceKm)
- Se `visibility != "private"`: crea `Notification` kind `"ride_reminder"` ai follower (opt-in lato Preferences)

**Validation:**
- `distanceKm > 0`
- `endedAt > startedAt`
- Trackpoints sanitized lato back (vedi legacy `04_tracking/gps_filters.md`)

**Edge cases:**
- App killed durante tracking → resume da local cache (vedi legacy `05_sync/edge_cases.md`)
- GPS signal lost → marker UI, ma il tracking continua salvando solo timestamp

---

## F-06 · Importo un GPX

**Passi UI:** `io.registra` → "Importa un GPX" → file picker → parse → crea PlannedRoute.

**Mutations:**
- `importGpx(ownerId, file)` → PlannedRoute

**Validation:**
- File ≤ 10 MB
- Format GPX 1.0/1.1 valido
- Min 2 trackpoints
- HUMAN-DEFERRED: KML/ITN? Decidere se aprire a più formati.

**Side effects:** finisce in `io.mappa`.

---

## F-07 · Navigo verso una destinazione

**Passi UI:** `io.registra` → "Naviga" → "Avvia ora" → fullscreen navigation con turn-by-turn + tracking sotto.

**Mutations:**
- `startNavigation(ownerId, destination, motorcycleId?)` → ritorna `sessionId` + route computed
- Stream `TrackPoint` come F-05
- `endNavigation(sessionId, action: "save" | "discard", title?)`

**Side effects on save:**
- Crea `Activity` (con i punti effettivamente percorsi)
- Opzionale: crea `PlannedRoute` dal route computato

**Modalità libera:** senza destinazione → equivale a F-05.

---

## F-08 · Salvo un percorso dal Feed Mondo

**Passi UI:** `mondo.feed` → tap su card → "salva" → finisce in `io.mappa`.

**Mutations:**
- `saveRoute(ownerId, publishedRouteId, note?)` → SavedRoute

**Side effects:**
- Incrementa `PublishedRoute.savedCount`
- Notification all'owner del route kind `"like"` (riusiamo) — body "X ha salvato il tuo percorso"

**Edge cases:**
- Già salvato (unique constraint) → no-op silenzioso o toast "già nel tuo archivio"

---

## F-09 · Pubblico una mia uscita nel Mondo

**Passi UI:** `io.mappa` (sezione Activities) o detail di un'Activity → "pubblica" → form (title, coverText, tags, `alsoForCars`) → conferma.

**Mutations:**
- `publishActivity(activityId, fields, scope: "public")` → PublishedRoute (con `sourceType: "activity"`)
- Aggiorna `Activity.publishedRouteId = newPublishedRoute.id`

**Side effects:**
- Notification a tutti i follower kind `"like"` (riusiamo) — body "X ha pubblicato un percorso"
- Routing del back: il record appare in Feed seguenti.

**Validation:**
- Owner = current user
- Activity non già pubblicata (1 published route per activity)

---

## F-10 · Pubblico un percorso solo per il gruppo

**Passi UI:** stessa form di F-09, ma scope = "group" + scelta gruppo.

**Mutations:**
- `publishActivity(activityId, fields, scope: "group", groupId)` → PublishedRoute
- (o `publishPlannedRoute(plannedRouteId, fields, scope: "group", groupId)`)

**Validation:**
- Current user è member del gruppo

**Side effects:**
- Incrementa `Group.publicRoutesCount` se promosso a public successivamente

---

## F-11 · Esploro e richiedo iscrizione a un gruppo

**Passi UI:** chip strip → "+ esplora" → ExploreGroupsOverlay → tap su gruppo "altro" → entro nel pillar GRUPPO con currentGroup = quel gruppo, ma `isMember: false` → vedo profilo gruppo → "richiedi iscrizione".

**Mutations:**
- `requestGroupMembership(groupId, userId)` → GroupMembershipRequest (status: pending)

**Side effects:**
- Notification a tutti gli admin del gruppo kind `"follow"` (riusiamo) — body "X ha chiesto di entrare"

**Validation:**
- Non già membro
- Non richiesta già pending

---

## F-12 · Admin approva richiesta iscrizione

**Passi UI:** `gruppo.pianifica` → tab "Iscrizioni" (AdminQueues) → tap "approva" o "rifiuta" su una richiesta.

**Mutations:**
- `approveMembershipRequest(requestId, adminUserId)` → updates GroupMembershipRequest, crea GroupMembership
- `rejectMembershipRequest(requestId, adminUserId, reason?)`

**Side effects (approve):**
- Crea GroupMembership con role "member"
- Incrementa Group.membersCount
- Notification al user che la richiesta è approvata

**Validation:**
- Current user = admin del gruppo

---

## F-13 · Member propone percorso al gruppo

**Passi UI:** `gruppo.pianifica` (member view) → "Proponi un percorso" → pick PlannedRoute mio → note opzionale → submit.

**Mutations:**
- `submitRouteProposal(groupId, proposedBy, plannedRouteId, note?)` → RouteProposal (status: pending)

**Side effects:**
- Notification a tutti gli admin del gruppo

**Validation:**
- proposedBy è member
- plannedRouteId.ownerId == proposedBy

---

## F-14 · Admin valida proposta percorso → crea GroupRide

**Passi UI:** `gruppo.pianifica` (admin view) → tab "Proposte percorsi" → tap "approva" → form (title, meetupText, startAt) → conferma.

**Mutations:**
- `approveRouteProposal(proposalId, adminUserId, rideFields)` → updates RouteProposal + crea GroupRide
- `rejectRouteProposal(proposalId, adminUserId, reason?)`

**Side effects (approve):**
- Crea GroupRide con `status: "confermata"`, `plannedRouteId` = proposta.plannedRouteId
- Notification al proponente + a tutti i member del gruppo (kind: `"ride_confirmed"`)

**Validation:**
- Current user = admin

---

## F-15 · Member conferma RSVP a un GroupRide

**Passi UI:** `gruppo.pianifica` → card del ride → tap "going" / "maybe" / "no".

**Mutations:**
- `setRideRSVP(rideId, userId, value)` → upsert GroupRideRSVP

**Side effects:**
- Aggiorna `GroupRide.confirmedCount` (se value transition coinvolge "going")
- Notification all'organizer (proposedBy) se transition "no"→"going" e ride è < 24h

---

## F-16 · Admin designa navigatore

**Passi UI:** `gruppo.cordata` (pre-departure phase) → admin vede chip strip dei confermati → tap su un member → diventa `navigatorUserId`.

**Mutations:**
- `setRideNavigator(rideId, navigatorUserId)` → updates GroupRide

**Validation:**
- Current user = admin
- navigatorUserId ha RSVP "going" per quel ride

**Side effects:**
- Notification al navigatore kind `"ride_reminder"` — body "Sei il navigatore di X, ti aspettiamo"

---

## F-17 · Cordata live (navigatore + altri)

**Pre-condizione:** `GroupRide.status` transitato da "confermata" → "in-corso" al `startAt`.

**Passi UI navigatore:**
1. Apre `gruppo.cordata` → vede prompt "Sei il navigatore · apri turn-by-turn"
2. Tap → fullscreen NavigationOverlay (kind: cordata) con turn-by-turn
3. Stream posizione + manovre
4. End → activity creata, ride passa a "completata"

**Passi UI altri member:**
1. Apre `gruppo.cordata` → vede stat strip, mappa cordata (avatar lungo il filo), view "mappa | piloti | chat"
2. Stream posizione propria + ricezione posizioni altri
3. Chat: testo + comandi rapidi (admin: "Si parte", "Pausa", "Benzina")
4. End cordata → activity creata individualmente per chi era live, ride → completata

**Mutations realtime:**
- `startCordataSession(rideId, userId)` → LiveSession + GroupRide.status = "in-corso" (se non già)
- `broadcastPosition(sessionId, lat, lon, speed, heading, t)` → in-memory, 5s tick
- `sendBoardChatMessage(rideId, userId, text)` → RideBoardComment (o entità separata `CordataChatMessage`)
- `endCordataSession(sessionId, action: "save" | "discard")` → Activity per ogni partecipante

**Side effects on end:**
- Per ogni partecipante con LiveSession attiva: crea Activity con `groupRideId` settato
- GroupRide.status = "completata"
- GroupRide.activityIds aggiornato
- Pulisce LiveSession con state appropriato
- Storia gruppo si attiva su questa ride

**Backend complexity (XL):**
- Realtime broadcast: 5s tick di posizioni (Supabase Realtime, Pusher, custom WS)
- Reliability: partecipanti possono perdere segnale e rientrare
- Alert "rider indietro" → soglia distanza dal filo (server-side decision)
- "Rider fermo" → no position update da X minuti
- Chat throttling, banword filter, etc.

**HUMAN-DEFERRED:**
- Cosa succede se admin/navigatore disconnette? Failover automatico? Vote?
- Buffer posizioni offline → catchup quando si rientra in rete?
- Privacy: una posizione live vale solo durante la cordata, va eliminata a fine ride?

---

## F-18 · Storia post-uscita → Diario

**Pre-condizione:** GroupRide completata. Si crea automatically una "Storia" per quel ride.

**Lifecycle:**
- Storia attiva: dal `endedAt` del ride fino a `min(next confirmed ride.startAt - 24h, endedAt + 30 days)`
- Oltre: la Storia diventa "Diario entry" (read-only archive).

**Passi UI utente:**
1. `gruppo.storia` → vede Storia attiva con: title, foto, distanza/durata, partecipanti, commenti, countdown "chiude tra X ore" o "chiude tra X giorni"
2. Aggiunge foto / commento
3. Quando scade → screen "Storia chiusa" + link a Diario entry corrispondente

**Mutations:**
- `addStoryMedia(rideId, file, caption?)` → ActivityMedia o entità separata
- `addStoryComment(rideId, text)` → RideBoardComment (riuso)

**Side effects:**
- Quando passa il window, la UI mostra StoryClosed; nessuna mutation server-side necessaria perché il computed `isStoryStillActive(group, now)` è puro front. Lato back: la Storia è un *view* del GroupRide, non una tabella.

**HUMAN-DEFERRED:** archive policy delle foto Storia → restano accessibili in Diario o si "comprimono" (es. solo le top 3)?

---

## F-19 · Apro classifica percorsi

**Passi UI:** `mondo.classifica` → sort {navigated | saved | likes | recent} + filtro area opzionale → lista RankRow.

**Read query:**
- `listPublishedRoutesRanked(sortBy, areaFilter?, alsoForCarsFilter?, limit=50)`

**Note backend:**
- Indici necessari (vedi `60_domain_model.md` §"Indici consigliati")
- Filtro area può essere ENUM controlled (lista chiusa di area) o full-text (suggerito starts-with)

---

## F-20 · Apro inbox notifiche

**Passi UI:** Header bell icon → drawer notifiche → lista, tap su un item → naviga a `linkScreen` + `linkEntityId`.

**Read query:**
- `listNotifications(userId)` (ordinata per `readAt NULLS FIRST, createdAt DESC`)

**Mutations:**
- `markNotificationRead(notificationId, userId)`
- `markAllNotificationsRead(userId)`

---

## F-22 · Pubblico un post (testo + foto, opzionale link percorso)

**Passi UI:** `io.feed` → "+ Nuovo post" → editor (title opzionale, body, upload foto, optional "Allega percorso" → picker tra miei PublishedRoute "route" / Activity / PlannedRoute) → submit.

**Mutations:**

```ts
publishPost({
  ownerId,
  title?,
  body,
  mediaFiles: File[],  // upload to storage prima
  tags,
  scope: "public" | "group",
  publishedToGroupId?,
  linkedSourceType?: "activity" | "planned_route",
  linkedSourceId?: UUID,
}) → PublishedRoute (kind="post")
```

**Side effects:**
- Upload foto in Supabase Storage `activity-media/{userId}/{postId}/{filename}`
- Notification ai follower (kind: `"comment"` riusato — body "X ha pubblicato")
- Se linkedSourceId → fetch distanceKm/durationMin/area dal source per copiarli nel record post (così la card può mostrare il chip "percorso linked" senza altra query)

**Validation:**
- body 1-2000 chars
- mediaFiles max 6, ognuna ≤ 10MB, image/jpeg|png|webp
- linkedSourceId.ownerId = current user (puoi linkare solo i tuoi)

**HUMAN-DEFERRED:**
- Edit di un post pubblicato (entro X minuti)?
- Re-share di un post altrui?
- Mentions con @username?

---

## F-21 · Logout / cancello account

**Logout:**
- `signOut(sessionId)` → invalidate session/refresh token

**Cancellazione:**
- Drawer Privacy → "Cancella account" → conferma → mutation `deleteAccount(userId)`

**Side effects (delete):**
- Soft-delete `Profile` (mantieni record con `deletedAt` per integrity di commenti/like passati)
- Cascade hard-delete: `UserPreferences`, `SafetyContact`, `Notification`, `LiveSession` correnti
- Soft-delete (o anonymize): `Activity`, `PlannedRoute`, `PublishedRoute` (decisione GDPR)
- Hard-delete: `GroupMembership` correnti → trigger decremento `Group.membersCount`
- Cancellazione richiede grace period 30g lato back (revocable).

**HUMAN-DEFERRED:**
- Cosa fare delle `Activity` pubbliche all'eliminazione? Anonimizzare (ownerId → "deleted_user") o cancellare?
- Cosa fare se l'utente era admin di un gruppo? Promuovere il leader, oppure prompt durante delete.

---

## Cross-flow side effects — riepilogo

| Trigger | Side effect |
|---------|-------------|
| Like inserito | Notification kind `"like"` all'owner |
| Comment inserito | Notification kind `"comment"` all'owner |
| Follow inserito | Notification kind `"follow"` al followed |
| `SavedRoute` inserito | Notification al route owner + `PublishedRoute.savedCount++` |
| `RouteLike` inserito | Notification al route owner |
| `GroupMembershipRequest.status` → approved | Notification al user + `Group.membersCount++` |
| `GroupRide.status` → confermata | Notification kind `"ride_confirmed"` ai member |
| `GroupRide.startAt - 24h` (cron) | Notification kind `"ride_reminder"` ai confermati |
| `GroupRide.status` → in-corso | Cordata si attiva, Storia precedente si chiude |
| `GroupRide.status` → completata | Storia per quel ride si attiva |
| `Activity` inserita con `visibility != "private"` | Notification ai follower (opt-in via UserPreferences.notificationsEnabled) |
| `UserBadge` inserito | Notification kind `"badge_earned"` |
| `Document.expiresAt - 30d / -7d / -1d` (cron) | Notification kind `"ride_reminder"` |

---

## Authorization matrix — riepilogo

| Operazione | Self | Follower | Member gruppo | Admin gruppo | Public |
|------------|------|----------|---------------|--------------|--------|
| Read `Profile` (`isPublic: true`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read `Profile` (`isPublic: false`) | ✅ | ✅ | depends | depends | ❌ |
| Update `Profile` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Read `Activity` (`visibility: "public"`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read `Activity` (`"followers"`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Read `Activity` (`"private"`) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Read `PublishedRoute` (`scope: "public"`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read `PublishedRoute` (`scope: "group"`) | owner ✅ | ❌ | ✅ se member di publishedToGroupId | ✅ se admin | ❌ |
| Update `PublishedRoute` | owner ✅ | ❌ | ❌ | promote-to-public se admin del gruppo source | ❌ |
| Read `GroupRide` (`gruppo.pianifica`) | ❌ | ❌ | ✅ | ✅ | ❌ |
| Create `GroupRide` | ❌ | ❌ | ❌ | ✅ | ❌ |
| Update `GroupRide` | ❌ | ❌ | ❌ | ✅ | ❌ |
| Submit `RouteProposal` | ❌ | ❌ | ✅ | ✅ | ❌ |
| Approve `RouteProposal` | ❌ | ❌ | ❌ | ✅ | ❌ |
| Approve `GroupMembershipRequest` | ❌ | ❌ | ❌ | ✅ | ❌ |
| Set `GroupRide.navigatorUserId` | ❌ | ❌ | ❌ | ✅ | ❌ |
| Comment on `PublishedRoute` | ❌ | depends visibility | depends scope | depends scope | ❌ se group |
| Comment on `GroupRide` board | ❌ | ❌ | ✅ | ✅ | ❌ |

**Nota:** in Postgres + Supabase si traduce in policies RLS per ogni tabella. Vedi `docs/sources/spec/02_database_schema.md` per template.
