# 40 · Navigation overlay (fullscreen)

## Purpose

Overlay fullscreen che gestisce **tutte e tre** le modalità di guida attiva:
- **tracking**: registrazione GPS pura (uscita libera, nessuna destinazione)
- **navigation**: turn-by-turn verso una destinazione + tracking sotto
- **cordata**: il navigatore designato di un GroupRide vede la sua turn-by-turn (gli altri member restano sulla CordataScreen)

Non è una tab, non è una pagina. Si apre da:
- `io.registra` → "Registra un'uscita" → Avvia (kind=tracking)
- `io.registra` → "Naviga" → Avvia (kind=navigation)
- `io.registra` → "Crea un percorso" → Apri editor (kind=tracking, modalità editor)
- `gruppo.cordata` → "Sei il navigatore · apri turn-by-turn" (kind=cordata)
- (futuro) `io.mappa` → tap su un percorso → "Naviga" (kind=navigation con route precomputed)

File implementazione: `src/components/nav/NavigationOverlay.tsx`.

---

## Stati UI

| Stato | Trigger | Cosa cambia |
|-------|---------|-------------|
| `idle/not-mounted` | overlay chiuso | nessun render |
| `running` | start premuto | tick 1s aggiorna km/tempo/speed |
| `paused` | tap "Pausa" | tick si ferma, badge "PAUSA" visibile |
| `ended` | tap "Stop & salva" | mostra modal "salva con titolo/note/visibility" → mutation → torna a IO |
| `discarded` | tap esci senza salvare | conferma → scarta sessione → torna |
| `gps-lost` | no fix per 30s | banner "Segnale perso" + last-known position |
| `wake-lock-failed` | browser nega Wake Lock | banner "Il telefono potrebbe spegnersi: tienilo acceso manualmente" |

---

## Display

Componenti visibili sempre:
- **Header live**: bottone esci, kind label (TRACKING / NAVIGATION / CORDATA), titolo, dot pulsante accent color
- **Mappa**: tile Mapbox con stile dark; polyline corrente del tracciato; flag destinazione (solo navigation/cordata)
- **HUD**: tre celle (distanza percorsa | tempo trascorso | media km/h)
- **SpeedBubble**: velocità istantanea in basso a destra
- **Bottoni**: Pausa/Riprendi · Stop & salva

Solo in `navigation`:
- **NextManeuverBanner** in alto: distanza alla manovra, descrizione (es. "Svolta a destra · SP668")

Solo in `cordata`:
- **Cordata thread overlay** sulla mappa: avatar lungo la polyline (vedi `23_gruppo_cordata.md`)
- L'accent color è il colore del gruppo (`crestColor`), non l'ember

---

## Read queries

Pre-overlay (per derivare i dati):

```ts
// Per kind=navigation
getMapboxDirections(originLatLng, destinationLatLng, profile: "driving-motorcycle")
  → { polyline, steps, distanceM, durationS }

// Per kind=cordata
getGroupRide(rideId) → GroupRide
getGroup(rideId.groupId) → Group (per crestColor)
```

Realtime (solo `cordata`):

```ts
subscribeCordataChannel(rideId)
  → emits position updates of other members:
    { userId, lat, lon, speed, headingDeg, t }
```

---

## Mutations

### kind = tracking

```ts
// Start
startActivityTracking(userId, motorcycleId?) → { sessionId, startedAt }

// Stream (batched, 5-10s o on backgrounding)
appendTrackPoints(sessionId, points: TrackPoint[])

// Lifecycle
pauseActivityTracking(sessionId) → updates paused flag
resumeActivityTracking(sessionId)

// End
endActivityTracking(sessionId, {
  title: string,
  notes?: string,
  tags: string[],
  visibility: Visibility,
}) → Activity
```

**Side effects on end:**
- Crea `Activity` con campi derivati (`distanceKm`, `avgSpeedKmh`, `maxSpeedKmh`, `durationSeconds`, `elevationGainM`) calcolati server-side dai track points.
- Aggiorna `Motorcycle.totalKm += activity.distanceKm`.
- Se `visibility != "private"`: crea notification ai follower (kind: `"ride_reminder"`, opt-in via `UserPreferences.notificationsEnabled`).

### kind = navigation

Come `tracking`, più:
```ts
startNavigation(userId, destination, motorcycleId?) → {
  sessionId, route: { polyline, steps, distanceM, durationS }
}
endNavigation(sessionId, action: "save" | "discard", title?)
```

**Side effects on save:**
- Stesso di tracking, ma `Activity.title` default = "Verso {destination}".
- Opzionale: crea `PlannedRoute` dal route computato (decisione UX in Fase 1).

### kind = cordata

```ts
startCordataSession(rideId, userId) → {
  sessionId,
  liveSessionId,  // LiveSession entity
  rideStatus: "in-corso"  // transitato server-side
}
broadcastPosition(sessionId, lat, lon, speed, headingDeg, t)
  → in-memory realtime, not persisted as TrackPoint
endCordataSession(sessionId, action: "save" | "discard") →
  per ogni partecipante con LiveSession attiva: crea Activity con groupRideId.
```

**Side effects on end:**
- `GroupRide.status` → `completata`
- `GroupRide.activityIds` populated with new Activity ids
- `LiveSession.state` → `ended_normal`
- Storia su questa ride diventa attiva (vedi `24_gruppo_storia.md`)

---

## Validation rules

**Tracking start:**
- User authenticated
- Permesso geolocation concesso (se denied → blocca + UI explainer)
- Wake Lock API disponibile (se assente → banner non-blocking)
- Se motorcycleId fornito: ownerId === userId

**Track points append:**
- `lat ∈ [-90, 90]`, `lon ∈ [-180, 180]`
- `t` monotono crescente per sessione
- `acc` se presente: se > 50m → punto droppato (filtro spike, vedi legacy `04_tracking/gps_filters.md`)
- Server dedup: punti con stesso `t` (idempotency: vedi legacy `05_sync/idempotency.md`)

**Tracking end:**
- `distanceKm > 0` (se no, modal "Sessione vuota, vuoi salvare comunque o scartare?")
- `endedAt > startedAt`
- ≥ 2 track points

**Navigation start:**
- `destination` non vuoto, geocodato lato server (validate coordinate o address risolvibile)

**Cordata start:**
- Current user è member del gruppo del ride
- Current user è `ride.navigatorUserId` (solo il navigatore apre l'overlay; gli altri restano su CordataScreen)
- Ride deve essere `confermata` (transition automatica → `in-corso`)

---

## Policies (auth/RLS)

- `Activity` (insert): `auth.uid() = ownerId`
- `Activity` (read): see authorization matrix in `70_flussi_e2e.md` (visibility public/followers/private)
- `LiveSession` (insert): user must be the designated navigator (per cordata) or owner (per personal tracking)
- `LiveSession` (read): solo i member del gruppo per cordata, solo owner altrimenti

Mapbox token:
- **Mai esposto raw nel client.** Deve essere proxied via `/api/mapbox-proxy` (Next.js route) o configurato con URL restriction lato Mapbox dashboard.
- HUMAN-DEFERRED: decidere se URL restriction è sufficiente o serve proxy con rate limit lato nostro.

---

## HUMAN-DEFERRED

- **App killed durante tracking**: come resume? Local storage queue + service worker che persiste track points su IndexedDB; al re-open, l'app rileva sessione interrotta e propone resume. Vedi legacy `05_sync/edge_cases.md`.
- **GPS denied permanente**: come degrade? Forse permettere "manual log" come fallback (insert distance/duration a mano). Decidere prima di Fase 1.
- **Wake Lock denied**: degrade gracefully, ma quanto è grave? Lato UX, banner + raccomandazione "tieni il telefono al manubrio acceso manualmente". Lato product: i 5 testers iniziali sono ok con questo, da rivalutare quando si scala.
- **Cordata: navigatore disconnesso a metà**: failover automatico al successivo member con role admin? Vote tra i partecipanti? In Fase 4 si decide.
- **Cordata: posizione live → privacy** : le posizioni in `broadcastPosition` finiscono persistite o solo in memory realtime? Decisione GDPR: solo in-memory durante la cordata, mai persistite (i TrackPoint individuali sì, perché parte dell'Activity dell'utente).
- **Mapbox tiles offline** : su PWA, il service worker può cacheare un'area pre-scaricata? Mapbox GL JS ha caching dei tile in memory ma non offline persistente nativo. Vedi se serve `mapbox-gl-offline` o approccio custom. Non in scope Fase 1.

---

## Note implementative

- Implementato in `src/components/nav/NavigationOverlay.tsx` (296 righe). Wired da `AppShell.tsx` via `navMode` state.
- Mock attuale: tick 1s simula movimento (speed wanders 28-95, km cresce di speed/3600 per secondo). Mappa è SVG procedurale. Da sostituire in Fase 1.
- Legacy spec utile:
  - `docs/sources/spec_bundle.zip/spec/04_tracking/gps_filters.md` per il filtraggio dei punti.
  - `docs/sources/spec_bundle.zip/spec/04_tracking/state_machine.md` per la state machine running/paused/ended.
  - `docs/sources/spec_bundle.zip/spec/08_navigation/L0_architecture.md` per l'architettura turn-by-turn.

---

## E2E coverage

I flussi che attraversano questo overlay: F-05 (registro GPS), F-07 (naviga), F-17 (cordata). Vedi `70_flussi_e2e.md`.
