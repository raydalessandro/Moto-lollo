# 12 · io.registra — Hub 4 vie

## Purpose

Punto di partenza per **qualsiasi** attività motociclistica nuova. 4 modalità:

1. **Crea un percorso** — disegno manuale waypoint sulla mappa (no GPS, è planning)
2. **Registra un'uscita** — tracking GPS mentre guidi
3. **Importa un GPX** — file/link → diventa PlannedRoute
4. **Naviga** — turn-by-turn verso una destinazione (con tracking sotto)

Tutte e 4 (tranne import GPX) aprono il **NavigationOverlay fullscreen** quando si avvia. Vedi `40_navigation.md`.

File implementazione: `src/features/io/RegistraScreen.tsx`.

---

## Stati UI

| Stato | Trigger | Cosa cambia |
|-------|---------|-------------|
| `hub` (default) | apertura tab | mostra le 4 card mode picker |
| `mode-detail` | tap su una card | mostra description + hint + bottone "Avvia ora" / "Apri editor" |
| (overlay) | tap "Avvia" | NavigationOverlay si apre fullscreen (gestito da AppShell) |

---

## Display

### Hub view (4 cards)

Per ogni modalità:
- Icon (lucide path)
- Title + short ("A mano sulla mappa", "Mentre guidi", ...)
- Description
- Chevron (`>`) per indicare "tap to enter detail"

### Mode detail view

- Back button "← hub"
- Icon grande + short + title
- Description
- Placeholder card "schermata da costruire" con hint specifico
- Bottone primario:
  - **GPS / Naviga**: "Avvia ora" → apre NavigationOverlay
  - **Crea / GPX**: "Apri editor" → idealmente apre l'editor inline o screen separata

---

## Read queries

Niente read di entità — la schermata è statica salvo per:

```ts
// Per il picker destinazione in "Naviga" (futuro):
geocodeSearch(query, proximityLatLng?) → MapboxSearchResult[]

// Per il picker moto attiva (futuro):
listMyMotorcycles(db, userId) → Motorcycle[]
getPrimaryMotorcycle(db, userId) → Motorcycle | undefined
```

---

## Mutations

### Crea un percorso (modalità "manuale")

Editor mappa (placeholder MVP, da costruire):

```ts
createPlannedRoute({
  ownerId,
  title: string,
  notes?: string,
  waypoints: Waypoint[],  // ≥2
  tags: string[],
  visibility: "private"  // default
}) → PlannedRoute
```

Side: Mapbox Directions API per calcolare `polyline`, `distanceKm`, `estimatedDurationMin` server-side da waypoints.

### Registra un'uscita (modalità "gps")

Apre overlay. Mutations gestite in `40_navigation.md`.

### Importa un GPX

```ts
uploadGpx(file: File) → { uploadId, fileSize }
parseGpx(uploadId) → {
  detectedTitle: string,
  waypoints: Waypoint[],
  distanceKm: number,
  estimatedDurationMin: number,
  trackPoints: TrackPoint[]  // se contiene <trk>
}
importGpx(uploadId, {
  title: string,  // override
  tags: string[]
}) → PlannedRoute (+ optional Activity se trk presenti)
```

**Side effects:**
- File originale conservato in Supabase Storage `gpx-uploads/`
- Eventuale duplicato (same hash) → return existing PlannedRoute (idempotency)

### Naviga (modalità "naviga")

```ts
geocodeDestination(query: string, proximityLatLng?: LatLng)
  → { lat, lon, displayName }[]

startNavigation(...) → vedi 40_navigation.md
```

---

## Validation rules

**createPlannedRoute:**
- ownerId === auth.uid()
- ≥ 2 waypoints
- Each waypoint: `lat ∈ [-90, 90]`, `lon ∈ [-180, 180]`
- title 3-100 chars
- tags max 5
- distanceKm calculated server-side; if < 0.1 → reject

**importGpx:**
- file size ≤ 10 MB
- valid GPX 1.0/1.1 (header + namespace)
- ≥ 2 trackpoints O ≥ 2 waypoints
- HUMAN-DEFERRED: KML / ITN / TCX? Per ora solo GPX.

**geocodeDestination:**
- query length 3-100
- Rate limit 20/min per user (Mapbox API costa)

**startNavigation:**
- vedi `40_navigation.md`

---

## Policies (auth/RLS)

- planned_routes insert: `auth.uid() = owner_id`
- GPX upload: only authenticated users, bucket policies

Mapbox token nascosto (Next.js API route proxy):

```
POST /api/mapbox-proxy
  body: { endpoint: "directions" | "geocoding" | "static-images", params: {...} }
  → forwarda al Mapbox API con token da env var, ritorna risultato
```

In alternativa: token client-side con URL restriction sul dashboard Mapbox. Per Vercel preview deployments, URL restriction è più semplice; per prod servere proxy con rate limit.

---

## HUMAN-DEFERRED

- **Editor mappa interattivo** (modalità Crea): non ancora implementato. Quando lo facciamo:
  - Tap aggiunge waypoint
  - Drag muove waypoint
  - Long-press menu per "delete" / "insert before/after"
  - Bottoni: undo, redo, clear
  - Live polyline preview con distance/duration
  - Mapbox Draw library candidata
- **GPX import parser real**: per ora bottone simulato. Implementazione richiede:
  - Lib JS (`gpxparser` o `togeojson` di Mapbox)
  - Validazione XML
  - Geocode reverse per location label
- **Modalità libera** ("Naviga senza destinazione"): è solo tracking, già coperto da modalità GPS. Decisione: integrarlo come opzione "Naviga senza destinazione" che apre overlay kind=tracking, oppure rimuoverlo.
- **Picker moto attiva**: per ora le activity sono "anonime" rispetto alla moto. Vorremmo selezionare la moto a inizio sessione? In MVP default = primaria. In Fase 1 piccolo dropdown.
- **Voice prompt** durante navigation: Web Speech API. Localizzazione IT default. Decidere se attivarlo da subito.

---

## Note implementative

- Hub a 4 vie già implementato. Mode detail con bottone "Avvia ora" wirato a NavigationOverlay.
- GPX, modalità manuale: bottoni esistono ma le mutations sono no-op. Da implementare in Fase 1.
- Legacy spec utile:
  - `docs/sources/spec_bundle.zip/spec/04_tracking/state_machine.md` per il tracking lifecycle
  - `docs/sources/spec_bundle.zip/spec/08_navigation/L0_architecture.md` per turn-by-turn architecture
  - `docs/sources/spec_bundle.zip/spec/10_planning/L05_interfaces.md` per editor pattern

---

## E2E coverage

Flussi in `70_flussi_e2e.md`:
- **F-04**: Creo un percorso a mano
- **F-05**: Registro un'uscita GPS
- **F-06**: Importo un GPX
- **F-07**: Navigo verso destinazione

Test E2E per Fase 1:
1. Tap "Registra un'uscita" → "Avvia ora" → tracking session → end → Activity creata
2. Tap "Naviga" → typeahead destination → start → turn-by-turn → end → Activity creata
3. Tap "Importa GPX" → upload file → parse → diventa PlannedRoute in io.mappa
