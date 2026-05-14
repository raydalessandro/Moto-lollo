# 30 · io.feed — Feed percorsi pubblici

> **Nota IA (2026-05-14):** dopo lo scioglimento del pillar MONDO, questa schermata è la **3ª tab del pillar IO** (key `io.feed`). Il file source resta `src/features/mondo/FeedScreen.tsx` per pulizia di import path; verrà rinominato in un cleanup futuro.

## Purpose

Feed principale della community: percorsi pubblici. Due viste filtro (chi segui · tutti) + un toggle "solo percorsi anche per auto". L'utente scopre, legge la copertina, like/save/comment, eventualmente tap → detail.

File implementazione: `src/features/mondo/FeedScreen.tsx`.

---

## Stati UI

| Stato | Cosa renderizza |
|-------|-----------------|
| `loaded` (default) | header (count totale + filtro counter) + chip Segui/Tutti + toggle alsoForCars + lista cards |
| `empty-following` | toggle `Segui` attivo ma nessun contenuto: "Nessun contenuto. Segui qualcuno o passa a Tutti." |
| `empty-cars` | toggle `onlyCars` attivo ma nessun match: "Nessun percorso adatto anche alle auto in questo feed." |
| `loading` | (futuro: skeleton cards) |
| `error` | (futuro: retry banner) |

---

## Display

### Header
- Eyebrow `▸ Mondo · community` (color info `#6bb0ff`)
- H1 `Feed`
- Subtitle `N contenuti · guida tua o di chi segui`

### Filtri (sticky-like, sopra la lista)
- 2 chip mutuamente esclusive: **Segui** (default), **Tutti**
- 1 toggle button "Solo percorsi anche per auto" con sliding switch + icona macchina
- Quando entrambi i filtri sono attivi, intersezione: percorsi di chi segui CHE sono `alsoForCars: true`

### Card percorso (`FeedCard`)
Per ogni `PublishedRoute`:
- **Hero strip** (top, gradient su `heroColor`): avatar autore + nome + area + data pubblicazione + title
- **Cover text** (citazione coverText se presente)
- **Meta riga**: distanza km, durata h/m, chip "anche auto" se `alsoForCars`, tag (max 3)
- **Action bar**:
  - Like button (cuore, count likes, toggle via `toggleLike`)
  - Comments count
  - Share button (placeholder)
- **Commenti**: massimo 2 visibili, "+ N altri commenti" se di più

---

## Read queries

```ts
listFeedFor(
  db: Db,
  userId: UUID,
  filter: "following" | "all" = "following"
): PublishedRoute[]
// Se "all" → tutti i public routes
// Se "following" → solo dei profili che l'utente segue (+ se stesso)

// Sui singoli card:
getProfile(db, route.ownerId) → Profile
listLikesFor(db, route.id) → RouteLike[]
listCommentsFor(db, route.id) → RouteComment[]
hasLiked(db, route.id, userId) → boolean
```

**Filtro alsoForCars** è applicato client-side dopo la fetch:
```ts
const visible = onlyCars ? feed.filter(p => p.alsoForCars) : feed;
```
Lato back: nella query API esporre `?alsoForCars=true` per non scaricare tutto se l'utente è permanentemente in modalità auto.

### Pagination / scaling
Per ora il prototipo carica tutto. Nel back:
- Endpoint `GET /api/feed?filter={following|all}&onlyCars=bool&cursor=...&limit=20`
- Cursor su `publishedAt DESC + id` (stable sort).
- Limit 20 per fetch, infinite scroll lato front.

### Indici Postgres
- `published_routes (scope, published_at DESC)` per "all" feed
- `published_routes (scope, alsoForCars, published_at DESC)` per filtro auto
- Per "following" feed serve join `follow_relationships`:
  ```sql
  SELECT pr.*
  FROM published_routes pr
  WHERE pr.scope = 'public'
    AND (pr.owner_id = $userId
         OR pr.owner_id IN (
           SELECT followed_id FROM follow_relationships
           WHERE follower_id = $userId
         ))
  ORDER BY pr.published_at DESC
  LIMIT 20;
  ```
  Considerare materialized view o tabella `user_feed_cache` se le query rallentano.

---

## Mutations

```ts
toggleLike(routeId, userId)
  → upsert/delete RouteLike (toggle behavior)
  → side: incrementa/decrementa likes count (derivable, no denormalized field)
  → side: insert Notification al route owner (kind: "like") solo se NEW like

addComment(routeId, authorId, text)
  → insert RouteComment
  → side: Notification al route owner (kind: "comment")

deleteComment(commentId)
  → policy: author OR route owner only
  → soft delete o hard delete? decidere

saveRoute(routeId, userId, note?)
  → upsert SavedRoute (unique on ownerId+publishedRouteId)
  → side: PublishedRoute.savedCount++
  → side: Notification al route owner (kind: "like" riusato, body "X ha salvato...")
  → idempotent: se già esistente, no-op (no double notification)

unsaveRoute(savedRouteId)
  → delete SavedRoute
  → side: PublishedRoute.savedCount--

followUser(followerId, followedId)
  → upsert FollowRelationship
  → side: Notification kind: "follow"

unfollowUser(relationshipId)
  → delete FollowRelationship
```

### Da decidere (HUMAN-DEFERRED)

- **Share button**: copia link al detail? Open native share sheet (Web Share API)? Decidere quando si fa il detail screen.
- **Tap su card → detail screen**: detail di `PublishedRoute` non esiste ancora. Va costruito in Fase 3.

---

## Validation rules

**toggleLike:**
- Cannot like own route? Decisione: **sì può**, è anche un modo di "promuoverlo" nel feed di chi lo segue. Niente vincolo.
- Cannot like deleted route: 404 se route soft-deleted.

**addComment:**
- `text` length 1–500
- Banword filter? Decidere se serve dal giorno 1.
- Rate limit: max 10 commenti / minuto per user.

**saveRoute:**
- Cannot save own route? Decisione: **no**, salvi solo roba di altri (riduce confusione "perché salverei una cosa mia?"). Lato UI il bottone non appare se `route.ownerId === userId`.

**followUser:**
- Cannot follow self (constraint).
- Cannot follow already-followed (unique).
- HUMAN-DEFERRED: profili non-public richiedono follow request approval? In MVP no, tutti pubblici di default (`Profile.isPublic = true`).

---

## Policies (auth/RLS)

| Operazione | Chi può |
|-----------|---------|
| read PublishedRoute scope="public" | tutti (anche anonimo: per ora no, post-MVP) |
| read PublishedRoute scope="group" | member del `publishedToGroupId` only |
| read RouteComment | chi può leggere il route |
| insert RouteLike | authenticated user |
| insert RouteComment | authenticated user |
| insert SavedRoute | authenticated user (proprio salvataggio) |
| delete own RouteLike/Comment/SavedRoute | self |
| delete RouteComment altrui | route owner o admin app |
| insert FollowRelationship | self only |
| delete FollowRelationship | self only |

Supabase RLS template (per route_likes):
```sql
CREATE POLICY "users can read all likes"
  ON route_likes FOR SELECT
  USING (true);

CREATE POLICY "users can like as themselves"
  ON route_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can delete own likes"
  ON route_likes FOR DELETE
  USING (auth.uid() = user_id);
```

---

## HUMAN-DEFERRED

- **Filtro per area / tag**: oltre `alsoForCars`, vorremmo filtri area (dropdown) e tag (chip multi-select)? Spec originale del front lo dichiarava nella checklist "Da costruire". Decisione: **sì, ma in Fase 3**. Schema già supporta (PublishedRoute.area, .tags).
- **Algoritmo del feed "Tutti"**: ordine puramente cronologico (`publishedAt DESC`) ok in MVP. Eventualmente in Fase 5 o 6 si introduce score (recency + likesCount + ownerActivityScore). Fuori scope per ora.
- **Anti-spam**: post fatti da bot, account creati per like-farming. Affronterai quando avrai ≥ 1000 utenti, non ora.
- **Visibilità chi salva**: il route owner vede _chi_ ha salvato? Pattern Instagram: notifica generica "X ha salvato il tuo percorso" ma NON una lista pubblica. Decidere in privacy spec.

---

## Note implementative

- Filter `onlyCars` è client-side React state (`useState`). Quando si va a backend con paginazione, si passa al server.
- `useDb()` espone `toggleLike(routeId)` mutation. Sostituirà con Supabase RPC `toggle_like(route_id uuid)`.
- Date formatting: `toLocaleDateString("it-IT", { day: "2-digit", month: "short" })`. Centralizzare in una utility quando si pulisce il front.

---

## E2E coverage

Flussi correlati in `70_flussi_e2e.md`:
- **F-08**: Salvo un percorso dal Feed Mondo
- **F-09**: Pubblico una mia uscita nel Mondo (questa è la sorgente: dopo apparirà nel Feed)

Test E2E suggeriti per Fase 3:
1. Visualizzo Feed → vedo cards ordinate per data DESC
2. Toggle "Segui" → vedo solo route di profili seguiti + miei
3. Toggle "Solo auto" → vedo solo `alsoForCars: true`
4. Like su una card → counter incrementa, owner riceve notifica
5. Save su una card → finisce in `io.mappa` sezione Saved
