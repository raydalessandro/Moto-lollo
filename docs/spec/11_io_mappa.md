# 11 · io.mappa — Archivio percorsi personali

## Purpose

**Non** è una mappa interattiva di esplorazione (quella è la fullscreen Navigation overlay). È l'**archivio dei tuoi percorsi**: quelli che hai creato tu (PlannedRoute) + quelli che hai salvato dal feed Mondo/Gruppo (SavedRoute → PublishedRoute).

Da qui:
- Vedi tutti i percorsi
- Tap → detail (replay, statistiche)
- "Naviga" → apre NavigationOverlay con waypoint precomputed
- "Pubblica" → un tuo PlannedRoute diventa PublishedRoute (Mondo o group-scoped)
- "Salva" rovesciato: rimuovi dal Saved (sezione Salvati)

File implementazione: `src/features/io/MappaScreen.tsx`.

---

## Stati UI

| Stato | Trigger | Cosa cambia |
|-------|---------|-------------|
| `empty-mine` | filter "mine"/all, 0 created | EmptyState "Crea un percorso da Registra…" |
| `empty-saved` | filter "saved", 0 saved | EmptyState "Quando salvi un percorso…" |
| `loaded` | ≥1 percorso | lista cards (RouteCard) |
| `detail` (out of scope qui) | tap card → naviga al detail screen | non implementato in MVP, segnaposto |

---

## Display

Layout:
1. **Header**: `▸ Mappa` + H1 "I tuoi percorsi" + subtitle "N percorsi · X km totali"
2. **Filter chip strip**: Tutti / Creati da me / Salvati
3. **Lista cards** (`RouteCard`):
   - title + (opzionale) notes
   - visibility badge (privato / follower / pubblico)
   - meta: distanceKm, durata, n. waypoints, tag (max 3)
   - bottoni: `Naviga` (apre overlay kind=navigation), `Pubblica` (modale)

Per percorsi `saved` (provenienti da PublishedRoute via SavedRoute join):
- Mostra anche autore originale (avatar + nome)
- Bottoni: `Naviga` + `Pubblica nel mio mondo` (re-pubblica come mio remix? **HUMAN-DEFERRED**, probabilmente solo `Rimuovi dal salvato`)

---

## Read queries

```ts
listMyPlannedRoutes(db, userId) → PlannedRoute[]
listSavedRoutes(db, userId) → SavedRoute[]
listSavedPublishedRoutes(db, userId) → PublishedRoute[]
  // join SavedRoute → PublishedRoute per il render
```

In Postgres una RPC `my_routes(user_id)` che ritorna union:

```sql
CREATE FUNCTION my_routes(p_user_id uuid)
RETURNS json AS $$
SELECT json_build_object(
  'created', (SELECT json_agg(pr ORDER BY pr.created_at DESC) FROM planned_routes pr
              WHERE pr.owner_id = p_user_id),
  'saved', (SELECT json_agg(json_build_object(
              'saved', sr,
              'route', pub_r,
              'author', a
            )) FROM saved_routes sr
            JOIN published_routes pub_r ON pub_r.id = sr.published_route_id
            JOIN profiles a ON a.id = pub_r.owner_id
            WHERE sr.owner_id = p_user_id
            ORDER BY sr.saved_at DESC)
)
$$ LANGUAGE sql STABLE;
```

---

## Mutations

```ts
deletePlannedRoute(routeId)
  → check ownership
  → soft-delete (set deletedAt) OR hard-delete
  → cascade: rimuovere riferimenti in RouteProposal pending (se ce ne sono)

duplicatePlannedRoute(routeId)
  → insert new PlannedRoute con title "{old.title} (copia)", same waypoints

publishPlannedRoute(routeId, {
  title, coverText?, tags, alsoForCars, scope, publishedToGroupId?
}) → PublishedRoute
  → policy: ownerId === auth.uid()
  → policy se scope=="group": member del groupId
  → side: PlannedRoute resta privato, è il PublishedRoute che è pubblico

unsaveRoute(savedRouteId)
  → check ownership
  → delete SavedRoute
  → side: PublishedRoute.savedCount--

updatePlannedRoute(routeId, fields)
  → check ownership
  → updatable: title, notes, tags, waypoints
  → if waypoints change → ricomputa distanceKm + estimatedDurationMin (Mapbox Directions)
```

---

## Validation rules

**deletePlannedRoute:**
- ownerId === auth.uid()
- Se ha RouteProposal "approved" già diventata GroupRide → bloccare delete (cascade troppo invasivo)

**publishPlannedRoute:**
- title 3-100 chars
- coverText opzionale, 0-200
- tags max 5, ognuno 1-20 chars
- alsoForCars è bool
- se scope=="group": publishedToGroupId required + user è member

**duplicatePlannedRoute:**
- Niente vincoli particolari, ma rate limit 10/min per evitare spam.

---

## Policies (auth/RLS)

```sql
-- planned_routes
CREATE POLICY "users see own planned routes"
  ON planned_routes FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "users CRUD own planned routes"
  ON planned_routes FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- saved_routes
CREATE POLICY "users see own saves"
  ON saved_routes FOR SELECT
  USING (owner_id = auth.uid());

-- (insert/delete already covered by ownership)
```

---

## HUMAN-DEFERRED

- **Re-pubblicazione di un SavedRoute come mio**: ha senso? Per il prototipo no. Forse in futuro come "remix" con credito all'autore.
- **Detail screen di un percorso**: replay con polyline animata, foto annotate, statistiche profonde. Out of scope Fase 1, in Fase 3.
- **Editor map per modificare waypoints**: per ora "Modifica" è solo del title/notes/tags. Edit del tracciato = riapre Crea editor con tutti i punti precaricati. Decidere quando si fa l'editor vero.
- **Filtri avanzati** (tag, area, distanza, durata): per ora solo i 3 chip. Se ne aggiungono in Fase 3 quando i numeri scalano.
- **Mini-mappa anteprima nelle card**: ora le card non hanno mappa. Stilisticamente sarebbero molto più ricche. Mapbox Static Image API (€) o SVG procedurale. Decidere in Fase 1.

---

## Note implementative

- Sezione "Salvati" attualmente è array vuoto (`saved: PlannedRoute[] = []`). Da wirare a `listSavedPublishedRoutes` in Fase 1.
- File ha un bullet "Da costruire" coerente con la spec.
- Legacy spec utile: `docs/sources/spec_bundle.zip/spec/10_planning/*` per pattern Edit di waypoints.

---

## E2E coverage

Flussi in `70_flussi_e2e.md`:
- **F-04**: creo percorso → finisce qua
- **F-06**: importo GPX → finisce qua
- **F-08**: salvo dal Feed → finisce qua sezione Salvati
- **F-09**: pubblico una mia attività → da qua via "Pubblica"
- **F-10**: pubblico solo per il gruppo → da qua via "Pubblica" + scope group
