# 24 · gruppo.storia — Ultima uscita finestrata

## Purpose

La "Storia" è la rappresentazione **temporanea ed emotiva** dell'ultima uscita completata di un gruppo. Vive finché serve, poi diventa una Diario entry (vedi `25_gruppo_diario.md`).

**Lifecycle** (regola decisa):
- Inizia quando un GroupRide passa a `status: "completata"`
- Vive fino a: `min(next_confirmed_ride.startAt - 24h, endedAt + 30 days)`
- Oltre quel momento → mostra schermo "Storia chiusa" + pointer alla Diario entry

File implementazione: `src/features/gruppo/StoriaScreen.tsx`.

---

## Stati UI

| Stato | Trigger | Cosa cambia |
|-------|---------|-------------|
| `active` | within lifecycle window | replay + foto + commenti + countdown |
| `closed` | oltre il window | "Storia chiusa" + bottone "Vai a Diario" |
| `no-history` | gruppo nuovo, 0 ride completate | "Nessuna storia ancora" |

Il lifecycle è computato lato front via helper puro `evaluateStory(group, now)`:

```ts
function evaluateStory(group, now): {
  state: "active" | "closed" | "no-history",
  ride?: GroupRide,
  closesAt?: ISODate,  // se active
}
```

---

## Display

### Active state

Layout:
1. **Hero**: ride.title + "ultima uscita" eyebrow + chiusura countdown ("chiude tra 2g 4h")
2. **Replay card**:
   - Polyline grande (Mapbox tile, futuro) o SVG procedurale (MVP)
   - Stat overlay: distanza, durata, n. partecipanti, data
3. **Foto galleria** (carosello):
   - Tap foto → fullscreen lightbox
   - Bottone "+ aggiungi foto" (solo per chi era partecipante)
4. **Partecipanti strip**: avatars dei rider con role
5. **Commenti card**:
   - Lista RideBoardComment (riuso entità della bacheca pianifica)
   - Composer "Aggiungi un commento…"

### Closed state

- Banner "La Storia di '{ride.title}' si è chiusa il {date}"
- Hero ride (compatto)
- Bottone primario "Vai a Diario" → naviga a `25_gruppo_diario.md`

### No-history state

- EmptyState "Nessuna storia ancora. Quando completate la prima uscita, apparirà qui."

---

## Read queries

```ts
listPastGroupRides(db, groupId, nowIso) → GroupRide[]
  // tutte le completate, ordinate per endedAt DESC
listUpcomingGroupRides(db, groupId, nowIso) → GroupRide[]
  // per il calcolo del next_confirmed_ride

evaluateStory(group, now) → { state, ride, closesAt }

// Se active:
listActivityMedia(db, activityId)  // per ogni activity collegata al ride
  // unione di tutte le foto dei partecipanti
listBoardComments(db, ride.id) → RideBoardComment[]
listGroupMembers(db, groupId) → per renderizzare partecipanti
```

Per ottimizzazione, una RPC:

```sql
CREATE FUNCTION story_for_group(p_group_id uuid, p_user_id uuid)
RETURNS json AS $$
WITH last_ride AS (
  SELECT * FROM group_rides
  WHERE group_id = p_group_id AND status = 'completata'
  ORDER BY start_at DESC LIMIT 1
),
next_ride AS (
  SELECT * FROM group_rides
  WHERE group_id = p_group_id
    AND status = 'confermata'
    AND start_at > now()
  ORDER BY start_at LIMIT 1
),
story_window AS (
  SELECT
    lr.id,
    CASE
      WHEN nr.start_at IS NOT NULL THEN nr.start_at - interval '24 hours'
      WHEN lr.start_at + interval '30 days' < now() THEN lr.start_at + interval '30 days'
      ELSE NULL  -- still in 30d window
    END as closes_at
  FROM last_ride lr LEFT JOIN next_ride nr ON true
)
SELECT json_build_object(
  'state', CASE
    WHEN (SELECT id FROM last_ride) IS NULL THEN 'no-history'
    WHEN (SELECT closes_at FROM story_window) < now() THEN 'closed'
    ELSE 'active'
  END,
  'ride', (SELECT row_to_json(lr) FROM last_ride lr),
  'closes_at', (SELECT closes_at FROM story_window),
  'media', (SELECT json_agg(am) FROM activity_media am
            JOIN activities a ON a.id = am.activity_id
            WHERE a.group_ride_id = (SELECT id FROM last_ride)),
  'comments', (SELECT json_agg(rbc) FROM ride_board_comments rbc
               WHERE rbc.group_ride_id = (SELECT id FROM last_ride))
);
$$ LANGUAGE sql STABLE;
```

---

## Mutations

```ts
addStoryMedia(rideId, userId, file: File, caption?)
  → upload to Supabase Storage `activity-media/<userId>/<activityId>/<file>`
  → insert ActivityMedia con activityId (l'attività di userId per quella ride)
  → policy: user è partecipante (ha Activity collegata al ride)

addStoryComment(rideId, userId, text)
  → insert RideBoardComment (riuso entità bacheca)
  → side: Notification ai partecipanti del ride

deleteStoryMedia(mediaId)
  → policy: media.activity.ownerId === auth.uid()
  → cascade: rimuove file da Storage

deleteStoryComment(commentId)
  → policy: comment.authorId === auth.uid() OR admin del gruppo
```

Nessuna mutation explicit per "chiudere" la Storia: è puramente computed dal lifecycle.

---

## Validation rules

**addStoryMedia:**
- Storia in stato `active`
- User è partecipante (ha Activity con `groupRideId === ride.id`)
- File: image/jpeg, image/png, image/webp; size ≤ 10 MB
- Max foto per Storia per utente: 20 (anti-spam)

**addStoryComment:**
- Storia in stato `active`
- User è member del gruppo (anche se non era partecipante alla ride)
- text 1-500

---

## Policies (auth/RLS)

```sql
-- activity_media (foto delle attività)
-- Read: chi può vedere l'activity (visibility rules)
-- Insert: owner dell'activity
CREATE POLICY "owner uploads to own activity media"
  ON activity_media FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM activities WHERE id = activity_media.activity_id AND owner_id = auth.uid()
  ));

-- ride_board_comments
-- Già covered in 22_gruppo_pianifica.md
```

---

## HUMAN-DEFERRED

- **Foto top selection**: man mano che si accumulano, "best of"? In MVP no, mostriamo tutte. Considerare in Fase 5 (algorithm di highlight).
- **Closing behavior**: quando Storia si chiude, le foto rimangono accessibili in Diario o vengono "compresse" (es. mantieni solo top 5)? Decisione GDPR + UX: tutte le foto restano in Diario, indefinitamente (l'utente le può cancellare manualmente).
- **Comments dopo chiusura**: una volta closed, ulteriori commenti consentiti su Diario entry? Decisione: **no**, Diario è read-only.
- **Auto-extension del lifecycle se 0 next ride confermata**: il window default (30g) basta o vorremmo "extend by 7d ogni volta che qualcuno aggiunge foto/commento"? Probabilmente no, mantiene complessità bassa.
- **Storia per gruppo VS per ride**: una Storia per gruppo significa che se completi 2 ride lo stesso weekend, la seconda sovrascrive la prima visivamente. Decisione: **una sola Storia attiva per gruppo alla volta** (quella più recente). Le precedenti vanno in Diario subito.

---

## Note implementative

- Helper `evaluateStory(group, now)` esiste già in `StoriaScreen.tsx` come funzione pura. Verifica copertura con unit test.
- `ActiveStory`, `StoryClosed`, sub-component locali in `StoriaScreen.tsx`.
- Foto: nel prototipo placeholder. Da wirare a Supabase Storage in Fase 5.
- Countdown: tick ogni minuto per accuracy "chiude tra Xh Xm".

---

## E2E coverage

Flussi in `70_flussi_e2e.md`:
- **F-17**: cordata end → Storia attivata
- **F-18**: Storia → Diario lifecycle

Test E2E per Fase 4-5:
1. Ride completata → vado a Storia → vedo replay + 0 commenti
2. Aggiungo foto → appare in galleria
3. Aggiungo commento → appare in lista, notifica ai partecipanti
4. Confermo un nuovo ride a +25 ore → Storia "chiude tra 1h"
5. Skipping time a startAt - 23h → Storia → state "closed" + bottone Diario
