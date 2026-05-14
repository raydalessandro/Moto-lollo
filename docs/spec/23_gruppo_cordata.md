# 23 · gruppo.cordata — Pre-partenza + live session

## Purpose

La cordata è la modalità **live** di un GroupRide: tutti i partecipanti vedono posizione reciproca in tempo reale, con un **navigatore designato** che apre il turn-by-turn fullscreen (NavigationOverlay kind=cordata) e gli altri restano sulla CordataScreen.

3 fasi:
1. **Empty**: nessuna cordata attiva, banner informativo
2. **Pre-partenza**: c'è un ride confermato vicino, mostra chi parte, l'admin designa il navigatore
3. **Live (in-corso)**: cordata attiva, vista mappa con avatar + chat + stats

File implementazione: `src/features/gruppo/CordataScreen.tsx` (con sub-component per ogni fase).

---

## Stati UI

| Stato | Trigger | Cosa cambia |
|-------|---------|-------------|
| `empty` | nessuna ride `confermata` né `in-corso` | EmptyState + 5 bullet "come funziona" |
| `pre` | ride `confermata` con startAt < +24h | PreDeparture: chi parte, navigator picker (admin), countdown |
| `live` | ride `in-corso` (transition auto al startAt) | LiveCordata: 3 view (mappa/piloti/chat) |
| `live-end-pending` | l'utente tap "Stop & salva" | conferma → endCordataSession |

---

## Display

### EmptyState

- Eyebrow "▸ Cordata · {gruppo.name}" (in `crestColor`)
- H1 "Nessuna cordata attiva"
- Subtitle "La cordata si attiva poco prima dell'inizio di un'uscita confermata"
- Card centrale: cerchio grande con `crestColor` + tag (es. "GRD") + label "stand by"
- Sezione "Come funziona" (5 bullet):
  - Mappa live con ciascun membro (aggiornamento 5s)
  - Filo cordata: polyline tra i rider in ordine
  - Alert automatico: rider indietro, rider fermo, segnale perso
  - Chat cordata + comandi rapidi
  - L'admin designa un navigatore: solo lui ha la turn-by-turn

### PreDeparture

- Eyebrow "▸ Cordata · pre-partenza" + countdown ("tra Nh")
- Hero: ride.title + meetupText
- Stat grid: distance / duration / confirmedCount
- **Sezione 01 — Navigatore designato**:
  - Se `ride.navigatorUserId` settato: card con avatar + nome + "sei tu" badge se è current user
  - Solo se `iAmNavigator`: bottone "Apri turn-by-turn (alla partenza)" disabled fino a startAt
  - Solo se `amAdmin`: chip strip di chi ha confermato → tap per designare
- **Sezione 02 — Chi parte**:
  - Chip per ogni utente con RSVP="going", marker "· guida" sul navigatore

### LiveCordata

- **Live header**: dot ember pulsing + "CORDATA LIVE" + "iniziato Nh Nm fa"
- **Navigator-only banner**: card grande ember "Sei il navigatore · apri turn-by-turn" → tap apre NavigationOverlay kind=cordata
- **View switcher**: 3 tabs: Mappa / Piloti / Chat
- **Stats strip**: km percorsi (accent group color) / durata / N rider

**View "Mappa"** (default):
- `CordataMap`: SVG procedurale con polyline "filo" + avatar dei rider lungo il percorso. Il navigatore ha avatar ring spin animato.
- HUMAN-DEFERRED: sostituire con vera Mapbox view con marker reali in Fase 4.

**View "Piloti"**:
- Lista cards numerate dei membri confermati
- Per ogni: avatar + nome + ruolo (navigatore/leader/in cordata) + chip status (guida / online)
- Tap → posizione su mappa (futuro)

**View "Chat"**:
- Banner "Chat cordata · solo testo durante la guida"
- Messaggi: who + text
- Composer "Scrivi…"
- **Quick commands per admin** (grid 2×2): "Si parte" · "Pausa" · "Benzina" · "Foto stop"

---

## Read queries

```ts
// Pre + live
listGroupRides(db, groupId) → GroupRide[]
  // filtro client: in-corso o confermata
isAdminOfGroup(db, userId, groupId) → boolean
listRideRSVPs(db, ride.id) → GroupRideRSVP[]
  .filter(v=going) per goingProfiles
listGroupMembers(db, groupId) → per member info
getProfile(db, ride.navigatorUserId) → Profile  // se exists

// Live realtime (Fase 4)
subscribeCordataChannel(rideId) → emits:
  - { kind: "position", userId, lat, lon, speed, headingDeg, t }
  - { kind: "chat", userId, text, t }
  - { kind: "ride_status", status: "completata" }
```

---

## Mutations

### Pre-partenza

```ts
setRideNavigator(rideId, navigatorUserId, adminUserId)
  → update GroupRide.navigatorUserId
  → policy: adminUserId è admin del gruppo
  → validation: navigatorUserId ha RSVP="going" per questo ride
  → side: Notification al navigator designato (kind: "ride_reminder")
```

### Live

```ts
startCordataSession(rideId, userId) → {
  liveSessionId, rideStatus: "in-corso"
}
  → insert LiveSession per il participant
  → se è il primo a entrare: update GroupRide.status = "in-corso"
  → side: subscribe channel realtime

broadcastPosition(liveSessionId, { lat, lon, speed, headingDeg, t })
  → realtime broadcast (Supabase Realtime channel)
  → NON persiste come TrackPoint (lo fanno le Activity individuali)

sendChatMessage(rideId, userId, text)
  → insert RideBoardComment OR entità separata `cordata_chat_messages` (consigliato per non mischiare con bacheca persistente)
  → side: broadcast realtime ai partecipanti

sendQuickCommand(rideId, adminUserId, command: "go" | "pause" | "fuel" | "photo")
  → broadcast realtime con kind: "system_command"
  → NO persist

endCordataSession(liveSessionId, action: "save" | "discard")
  → update LiveSession.state = "ended_normal"
  → se action="save": per ogni participant con LiveSession in questa ride: crea Activity con groupRideId
  → quando ULTIMO participant ends: GroupRide.status = "completata"
  → side: Storia entry per la ride si attiva (vedi 24_gruppo_storia.md)
```

---

## Validation rules

**setRideNavigator:**
- Admin only
- navigatorUserId è member del gruppo
- navigatorUserId ha RSVP="going"
- Ride status="confermata" o "in-corso"

**startCordataSession:**
- User authenticated
- Member del ride.groupId
- Ride status in ["confermata", "in-corso"]
- No existing active LiveSession per (userId, rideId)

**broadcastPosition:**
- Owner = current user (auth.uid())
- Rate limit naturale (5s tick lato client, server può throttlare ≥10/sec)
- Coordinate validate (lat/lon ranges)

**sendChatMessage:**
- Member del gruppo
- text 1-500
- Rate limit 30/min per user (cordata può essere chatty)

**endCordataSession:**
- Owner = current user

---

## Policies (auth/RLS)

```sql
-- live_sessions
CREATE POLICY "members can see live sessions of group rides"
  ON live_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_rides r
      JOIN group_memberships gm ON gm.group_id = r.group_id
      WHERE r.id = live_sessions.... -- via activity_id o group_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "users create own live sessions"
  ON live_sessions FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "users update own live sessions"
  ON live_sessions FOR UPDATE
  USING (owner_id = auth.uid());

-- cordata_chat_messages (se separato da RideBoardComment)
-- analogo a RouteComment ma scoped al ride
```

**Realtime channel**: il channel `cordata:{rideId}` deve essere autorizzato solo per i membri del gruppo. Supabase Realtime ha row-level autorizzazione via funzione (`authorize_user_channel`) o policies sui broadcast.

---

## HUMAN-DEFERRED

- **Navigatore disconnesso a metà**: failover automatico al successivo admin? Voto? In Fase 4 si decide.
- **Posizioni persistite vs realtime-only**:
  - **Persistite**: pro: replay accurato della cordata in Diario. Contro: privacy, costo storage. Decisione probabile: persistere solo TrackPoint individuali (parte dell'Activity), MAI le posizioni broadcast.
  - **Realtime-only**: snapshot temporaneo. Quello che vedi dura il tempo del session.
- **Alert "rider indietro"**: il filo cordata diventa rosso? Notifica al leader? Decidere regole: "rider X è ≥ 500m dal precedente" = alert.
- **Alert "rider fermo"**: nessun update posizione > 3 min = warning + suggerimento "verifica il segnale".
- **Quick commands** "Foto stop" / "Pausa": quando partono, fermano il tracking di tutti o solo segnalano? Decisione UX.
- **Privacy "ho perso il gruppo"**: rider che resta indietro vede solo il leader o tutti? Decidere.
- **Background tracking iOS**: come gestire? Banner persistente "tienimi acceso" + Wake Lock. PWA limit accettato (vedi ROADMAP).
- **End ride auto-detection**: timeout (es. nessun update 30 min) → auto-end. Cron job server-side.

---

## Note implementative

- `EmptyState`, `PreDeparture`, `LiveCordata`, `CordataMap`, `sampleCurve` tutti in `CordataScreen.tsx` (688 righe).
- Realtime stack: **Supabase Realtime** broadcast channels. Schema:
  - Channel name: `cordata:{rideId}`
  - Server-side authorize via Postgres function
  - Throttling: 5s tick lato client, server ≤10/s hard limit
- Legacy spec utile:
  - `docs/sources/spec_bundle.zip/spec/09_safety/*` per SOS embedded
  - `docs/sources/spec_bundle.zip/spec/07_community/L0_architecture.md` per cordata pattern

---

## E2E coverage

Flussi in `70_flussi_e2e.md`:
- **F-16**: admin designa navigatore
- **F-17**: cordata live (navigatore + altri)

Test E2E per Fase 4:
1. Pre: admin tap su un member → diventa navigator, notification inviata
2. Live: ride.startAt arriva → status → in-corso, cordata UI cambia a live view
3. Navigatore tap "Apri turn-by-turn" → NavigationOverlay kind=cordata
4. Altri member vedono mappa con avatar che si muovono (mock realtime)
5. Tap stop → activity creata per ognuno, ride status → completata, Storia attiva
