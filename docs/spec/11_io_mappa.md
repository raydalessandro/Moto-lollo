# 11 · io.mappa — Archivio percorsi personali

## Purpose

L'archivio dei **miei** percorsi: tutto quello con cui ho avuto a che fare. Nessun percorso di altri utenti random — quelli vivono nel Feed (`io.feed`). Quattro categorie:

- **Creati**: PlannedRoute disegnati a mano sulla mappa
- **Caricati**: PlannedRoute importati da GPX
- **Fatti**: Activity (uscite GPS registrate)
- **Salvati**: SavedRoute — percorsi di altri che ho **salvato** dal Feed/Gruppo (di altri ma "miei" come scorciatoia)

File implementazione: `src/features/io/MappaScreen.tsx`.

---

## Stati UI

| Stato | Trigger | Cosa cambia |
|-------|---------|-------------|
| `empty-all` | filter "Tutti" + 0 archivio | EmptyState "Archivio vuoto" + suggerimento |
| `empty-filter` | filter specifico + 0 match | EmptyState specifico per quel filter (es. "Nessun GPX caricato") |
| `loaded` | ≥1 item visibile | lista cards `ArchiveCard` |

---

## Display

### Header
- Eyebrow `▸ Mappa` + H1 "I tuoi percorsi"
- Subtitle: `{n} percorsi · {totalKm} km totali` (count totale del filter attivo)

### Filter chip strip
`Tutti · Creati · Caricati · Fatti · Salvati` — orizzontale scrollabile, attivo evidenziato.

### Lista cards (`ArchiveCard`)

Card uniforme per tutti i tipi:
- Mini-mappa procedurale 60px in alto (polyline ember su sfondo scuro)
- Badge tipo top-left con icona + label colorata (`creato` = ember, `caricato` = info, `fatto` = ember, `salvato` = magenta)
- Per "Salvati": chip top-right con `di {author.displayName}`
- Title (grassetto)
- Meta riga: `distance · duration · {relative date} · tags`
- Ordine: cronologico DESC (più recenti prima)

---

## Read queries

```ts
listMyPlannedRoutes(db, userId) → PlannedRoute[]
  // filter per source = "manual" → Creati
  // filter per source = "gpx" → Caricati

listMyActivities(db, userId) → Activity[]
  // tutti → Fatti

listSavedRoutes(db, userId) → SavedRoute[]
getPublishedRoute(db, savedRoute.publishedRouteId) → PublishedRoute
getProfile(db, publishedRoute.ownerId) → Profile  // per author display
```

### Domain change

Aggiunto campo `source: "manual" | "gpx"` a `PlannedRoute` per distinguere creazione manuale vs import GPX. Quando in Fase 1+ implementeremo l'editor mappa e il GPX parser, ognuno setterà il source corretto.

```ts
export type PlannedRouteSource = "manual" | "gpx";

export interface PlannedRoute {
  // ...campi esistenti
  source: PlannedRouteSource;
}
```

### Backend ottimizzato

```sql
CREATE FUNCTION my_archive(p_user_id uuid)
RETURNS json AS $$
SELECT json_build_object(
  'planned', (SELECT json_agg(pr ORDER BY pr.created_at DESC) FROM planned_routes pr
              WHERE pr.owner_id = p_user_id),
  'activities', (SELECT json_agg(a ORDER BY a.started_at DESC) FROM activities a
                 WHERE a.owner_id = p_user_id),
  'saved', (SELECT json_agg(json_build_object(
              'saved', sr,
              'route', pub_r,
              'author', a
            ) ORDER BY sr.saved_at DESC)
            FROM saved_routes sr
            JOIN published_routes pub_r ON pub_r.id = sr.published_route_id
            JOIN profiles a ON a.id = pub_r.owner_id
            WHERE sr.owner_id = p_user_id)
)
$$ LANGUAGE sql STABLE;
```

Frontend computa client-side l'union + sort.

---

## Mutations

```ts
// Creati/Caricati
createPlannedRoute({ ownerId, source: "manual", ... }) → PlannedRoute
importGpx(ownerId, gpxFile) → PlannedRoute (source: "gpx")
deletePlannedRoute(routeId)
updatePlannedRoute(routeId, fields)

// Fatti
deleteActivity(activityId)  // se serve
updateActivity(activityId, { title, notes, tags, visibility })

// Salvati
unsaveRoute(savedRouteId)  // rimuove dal mio archivio
  → side: PublishedRoute.savedCount--

// Pubblica (futuro)
publishActivity(activityId, fields) → PublishedRoute
publishPlannedRoute(routeId, fields) → PublishedRoute
```

---

## Validation rules

Già coperte in `13_io_garage.md` (Activity update) e `12_io_registra.md` (createPlannedRoute).

**unsaveRoute:** owner del saved = current user.

---

## Policies (auth/RLS)

Tutti i read filtrano per `ownerId = auth.uid()`. Niente sharing.

```sql
CREATE POLICY "users see own archive" ...  -- come 13_io_garage.md
```

---

## HUMAN-DEFERRED

- **Detail screen di un percorso/activity**: tap → fullscreen con replay polyline, foto, stats profonde, condivisione. Fase 3.
- **Bulk operations**: selezione multipla per delete/publish/exportGPX. Fase 5.
- **Mini-mappa reale Mapbox**: oggi è SVG procedurale. Sostituire con Mapbox Static Images API in Fase 1.
- **Filtri secondari**: per anno, tag, area, distanza. Aggiungere quando l'archivio cresce. Fase 5.
- **Categoria "Tracciati" vs "Fatti"**: oggi Activity = "fatto" generico. Quando aggiungeremo Activity manuali (senza GPS, "ho fatto questo giro lunedì"), potremmo splittare:
  - **Tracciati**: Activity con GPS reale (`trackPoints != null`)
  - **Fatti**: Activity manuali (campo + numerico ma niente polyline)
  Per ora tutto è "Fatti".
- **Edit di un percorso**: per ora niente. Fase 3 con editor mappa.
- **Search**: barra di ricerca nei nomi/note/tag. Fase 5.

---

## Note implementative

- File `MappaScreen.tsx` ~310 righe. `ArchiveItem` è un discriminated union:
  ```ts
  type ArchiveItem =
    | { kind: "manual"; route: PlannedRoute }
    | { kind: "gpx"; route: PlannedRoute }
    | { kind: "activity"; activity: Activity }
    | { kind: "saved"; saved: SavedRoute; route: PublishedRoute; author?: Profile };
  ```
- `MiniMap` helper procedurale riusato. In futuro estraibile in `src/components/ui/MiniMap.tsx`.
- Sort: cronologico DESC su `createdAt` / `startedAt` / `savedAt`.
- `hashSeed(routeId)` per dare polyline deterministica anche ai SavedRoute (PublishedRoute non ha sempre polylineSeed).

---

## E2E coverage

Flussi in `70_flussi_e2e.md`:
- **F-04**: creo percorso → finisce qua come "Creato"
- **F-06**: importo GPX → finisce qua come "Caricato"
- **F-05/F-07**: registro/navigo → finisce qua come "Fatto"
- **F-08**: salvo dal Feed → finisce qua come "Salvato"
- **F-09/F-10**: pubblico → da qua via "Pubblica"
