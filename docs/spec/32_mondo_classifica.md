# 32 · Classifica — drawer (ex mondo.classifica)

> **Nota IA (2026-05-14):** dopo lo scioglimento del pillar MONDO, questa schermata è una **destinazione del drawer hamburger** (`drawer.classifica`), non più una tab bottom nav. Aperta come overlay fullscreen tipo Profilo/Impostazioni.

## Purpose

Classifica dei **percorsi** della community (non degli utenti, non dei segmenti, **non dei post**). La classifica considera solo `PublishedRoute` con `kind="route"` — i post social (con o senza percorso allegato) sono esclusi perché non hanno metriche di saves/navigated significative.

Ranking computato da counters denormalizzati su `PublishedRoute`:
- `navigatedCount` (quante volte è stato avviato come Naviga)
- `savedCount` (quante volte è stato salvato)
- `likesCount` (derivato da `RouteLike`)
- `publishedAt` (per sort "recenti")

File implementazione: `src/features/mondo/ClassificaScreen.tsx`.

---

## Stati UI

| Stato | Trigger | Cosa cambia |
|-------|---------|-------------|
| `loaded` | default | lista RankRow ordinata |
| `empty-area` | filtro area attivo + 0 risultati | "Nessun percorso in questa area" |

---

## Display

1. **Header**: `▸ Classifica` (color info) + H1 "I percorsi top" + subtitle
2. **Sort chips**: Più navigati / Più salvati / Più amati / Recenti
3. **Area chips** (dinamiche, derive da `routes.map(r => r.area)`):
   - "Tutta Italia" (default) + 1 chip per area distinta
4. **Lista `RankRow`** (per ogni route):
   - Rank number (1, 2, 3...) con medaglia color (oro/argento/bronzo per top 3)
   - Title + area badge
   - coverText quote
   - Meta: distance, duration, chip "anche auto" se `alsoForCars`, tag (max 2)
   - **Counter grid (4 celle)**:
     - Primary metric (cambia per sort): navigato da / salvato da / like / pubblicato
     - Sempre: navigati, salvati, like
   - Author: avatar + display name

---

## Read queries

```ts
listPublishedRoutes(db) → PublishedRoute[]
  // tutti con scope="public"
  // ordinati per criterio sort lato UI

// Per ogni route in RankRow:
getProfile(db, route.ownerId) → Profile
countLikes(db, route.id) → number
```

### Backend query ottimizzata

```sql
CREATE FUNCTION classifica(p_sort text, p_area text, p_also_for_cars boolean, p_limit int)
RETURNS json AS $$
SELECT json_agg(json_build_object(
  'route', pr,
  'author', a,
  'likes_count', (SELECT count(*) FROM route_likes WHERE published_route_id = pr.id)
))
FROM published_routes pr
JOIN profiles a ON a.id = pr.owner_id
WHERE pr.scope = 'public'
  AND (p_area IS NULL OR pr.area = p_area)
  AND (NOT p_also_for_cars OR pr.also_for_cars = true)
ORDER BY
  CASE WHEN p_sort = 'navigated' THEN pr.navigated_count END DESC NULLS LAST,
  CASE WHEN p_sort = 'saved' THEN pr.saved_count END DESC NULLS LAST,
  CASE WHEN p_sort = 'likes' THEN (SELECT count(*) FROM route_likes WHERE published_route_id = pr.id) END DESC NULLS LAST,
  CASE WHEN p_sort = 'recent' THEN pr.published_at END DESC NULLS LAST
LIMIT p_limit;
$$ LANGUAGE sql STABLE;
```

Per scaling: in Fase 6 valutare materialized view `classifica_cache` rinfrescata ogni ora.

---

## Mutations

Nessuna mutation diretta. Tap su RankRow → detail PublishedRoute (Fase 3).

---

## Validation rules

N/A (read-only).

---

## Policies (auth/RLS)

```sql
-- published_routes scope="public" leggibile da tutti gli auth user (vedi 30_mondo_feed.md)
```

---

## HUMAN-DEFERRED

- **Window-based ranking** ("Top della settimana / del mese"): aggiunge dimensione temporale al rank. Decidere se aggiungerlo in Fase 5.
- **Anti-gaming**: utente che si auto-naviga 1000 volte per scalare la classifica? Soglia rate limit lato `incrementNavigatedCount`: max 1 per (userId, routeId, day). Implementare in Fase 5.
- **Geographical scoping**: "Classifica Lombardia" vs "Classifica Italia". Per ora area filter. In futuro raggruppamenti regionali.
- **Hidden mode**: route author può "rimuovere" il suo route dalla classifica? Decidere se feature da privacy settings.
- **Personal best segmentation**: era prevista negli old spec con Segments. Rimossa per ora. Eventuale return come "tratti notevoli intra-percorso" decidibile dopo.
- **Discoverability boost**: route "freschi" dovrebbero avere bonus iniziale per emergere? Decidere se introdurre score temporal decay.

---

## Note implementative

- File esistente. `Segment` / `SegmentAttempt` rimossi dal codice nel cleanup recente.
- Sort + area filter sono client-side per il prototipo. Spostare a server query in Fase 3 quando ci sono ≥50 percorsi.
- `navigatedCount` incrementato lato back quando l'utente avvia un Naviga su un PublishedRoute (mutation `incrementNavigatedCount(routeId)` invocata da NavigationOverlay).

---

## E2E coverage

Flussi in `70_flussi_e2e.md`:
- **F-19**: apro classifica percorsi

Test E2E per Fase 3:
1. Visualizzo classifica default sort "navigated" → vedo i 10 più navigati
2. Switch sort "saved" → riordino
3. Filter area "Dolomiti" → vedo solo percorsi area="Dolomiti"
4. Avvio Naviga su una route → torno → counter incrementato (eventually consistent ok)
