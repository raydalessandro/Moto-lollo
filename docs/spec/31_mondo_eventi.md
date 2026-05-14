# 31 · mondo.eventi — Eventi big curati

## Purpose

Lista eventi big curati dalla redazione dell'app (raduni nazionali, EICMA, track day organizzati). **Non** sono i GroupRide (quelli sono privati per il gruppo). Sono eventi pubblici a partecipazione aperta.

File implementazione: `src/features/mondo/EventiScreen.tsx`.

---

## Stati UI

| Stato | Trigger | Cosa cambia |
|-------|---------|-------------|
| `loaded` | default | lista eventi ordinati per `startAt ASC` (prossimi prima) |
| `empty-upcoming` | filtro "Prossimi" + 0 risultati | "Nessun evento prossimo in calendario" |
| `loaded-past` | filtro "Passati" attivo | lista DESC, niente RSVP buttons |

---

## Display

1. **Header**: `▸ Eventi · curati da noi` + H1 "Calendario eventi"
2. **Filter chip strip**: Tutti / Prossimi / Passati + chip per `kind` (Raduno · Track day · Viaggio · Corso · Fiera)
3. **Lista cards** (per ogni `PublicEvent`):
   - Kind icon + hue background (`coverHue`)
   - Title + location + startAt formatted ("Sab 12 mag · 18:00")
   - Durata (se endAt presente)
   - attendeesCount
   - Description (max 2 lines, expand on tap)
   - Bottoni `[Mi interessa] [Vengo]` (RSVP)
   - Stato badge "GIÀ ISCRITTO" se ho fatto RSVP

---

## Read queries

```ts
listEvents(db, { nowIso, timeframe: "upcoming" | "past" | "all" }) → PublicEvent[]
getMyEventRSVP(db, eventId, userId) → EventRSVP | undefined
listEventRSVPs(db, eventId) → EventRSVP[]  // per attendeesCount accurato
```

### Indici Postgres

- `public_events (start_at)` — listing chronological
- `public_events (kind, start_at)` — filtri per kind

### Pagination

Per ora in-memory (7 eventi seed). Quando ≥ 50, paginare cursor su startAt.

---

## Mutations

```ts
setEventRSVP(eventId, userId, value: "interested" | "going")
  → upsert EventRSVP
  → side: PublicEvent.attendeesCount aggiornato (count value="going")
  → side: Notification all'organizer? Probabilmente no per attesa massa (1500 going = 1500 notifications). Solo sopra una soglia minore, o aggregata daily.

cancelEventRSVP(eventId, userId)
  → delete EventRSVP
  → side: counter decrementato
```

---

## Validation rules

**setEventRSVP:**
- Authenticated user
- Event exists e non in past (startAt > now())
- value ∈ ["interested", "going"]

---

## Policies (auth/RLS)

```sql
-- public_events: tutti gli auth user leggono
CREATE POLICY "auth see all events"
  ON public_events FOR SELECT
  TO authenticated
  USING (true);

-- Insert/update/delete: solo admin app
CREATE POLICY "admins manage events"
  ON public_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'  -- sysadmin app
    )
  );

-- event_rsvps: self CRUD
CREATE POLICY "users RSVP own"
  ON event_rsvps FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

## HUMAN-DEFERRED

- **Editorial workflow per inserire eventi**: in MVP via SQL diretto. Quando ci sarà admin web app, UI per inserire/editare eventi. Probabilmente Fase 6+.
- **Event detail screen**: tap su un evento → detail con mappa location, programma orario, partecipanti pubblici, link iscrizione esterno. Fase 3-4.
- **External booking link**: alcuni eventi (track day, corsi) hanno iscrizione su sito esterno. Aggiungere campo `bookingUrl?` su PublicEvent? Decidere.
- **Reminder push**: notifica push 1g prima dell'evento per chi ha "going". Out of MVP (web push limitato iOS).
- **Filtri area** ("vicino a me"): geolocation + distanza dal location. Fase 5.
- **Calendar export .ics**: aggiungi all'agenda nativo. Out of MVP.
- **Sponsorizzazione**: eventi sponsor? Etichette "PARTNER"? Out of MVP, decisione business futura.

---

## Note implementative

- File esistente con seed di 7 eventi (raduno Garda, track day Misano, EICMA, ecc.).
- `coverHue: 0-360` per gradient color procedurale (no immagini cover ancora).
- Quando si avrà admin app: route `/admin/events` con CRUD.

---

## E2E coverage

Nessun flusso E2E dedicato (i flussi big sono nelle altre sezioni). Test E2E per Fase 3:
1. Visualizzo eventi prossimi → ordinati per startAt ASC
2. Tap "Vengo" su un evento → counter attendees++
3. Filter "Track day" → vedo solo eventi kind="track_day"
