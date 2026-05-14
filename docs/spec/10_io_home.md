# 10 · io.home — Dashboard personale

## Purpose

La pagina di apertura dell'app. Un colpo d'occhio su:
- chi sei + le tue stats (uscite totali, km, ore in sella)
- la tua moto primaria
- l'ultima uscita registrata (con mini-mappa)
- promemoria attivi (documenti in scadenza, manutenzione consigliata)
- notifiche non lette
- prossima uscita di gruppo (se hai gruppi)

File implementazione: `src/features/io/HomeScreen.tsx`.

---

## Stati UI

| Stato | Trigger | Cosa cambia |
|-------|---------|-------------|
| `first-time` | utente appena registrato, no dati | onboarding card "Aggiungi la tua prima moto" |
| `loaded` (default) | tutti i blocchi popolati | layout standard |
| `no-rides-yet` | profile esistente, 0 activities | sezione "Ultima uscita" → CTA "Registra la prima" |
| `no-bike-yet` | 0 motorcycles | sezione moto → CTA "Aggiungi una moto" |

---

## Display

Layout single-column scrollable. Sezioni in ordine:

1. **Greeting**: "Ciao, {firstName} 👋" + città + ora del giorno
2. **Stats overview card**: 3 numeri (uscite totali, km totali, ore in sella) derivati da activities
3. **Moto primaria card**: brand + model + km totali + ultima manutenzione (se ≤90g)
4. **Ultima uscita card**: title + data + distance + duration + mini-mappa SVG (polyline da `polylineSeed`)
5. **Promemoria card** (solo se ≥1 entry):
   - Documenti scaduti / ≤30g (rosso/giallo)
   - Manutenzione consigliata (es. tagliando ogni 6000 km)
6. **Prossima uscita gruppo card** (solo se member di ≥1 gruppo con ride confermata <30g):
   - Group crest + title + countdown
   - Tap → vai a `gruppo.pianifica` del gruppo
7. **Notifiche unread**: bell icon con badge nel header globale (non in main content), tap → drawer notifiche

---

## Read queries

```ts
getProfile(db, userId) → Profile
getPrimaryMotorcycle(db, userId) → Motorcycle | undefined
listMyActivities(db, userId) → Activity[]  // per stats + last
getLastActivity(db, userId) → Activity | undefined
listMyDocuments(db, userId) → Document[]  // filtrato lato UI per ≤30g
listMaintenanceForBike(db, primaryMoto.id) → MaintenanceRecord[]  // ultima
countUnreadNotifications(db, userId) → number
listUpcomingRidesFor(db, userId, nowIso, 1) → next ride
```

Aggregations (compute lato UI per ora, lato back via view materializzata in scala):

```ts
const totalKm = activities.reduce((s, a) => s + a.distanceKm, 0)
const totalHours = activities.reduce((s, a) => s + a.durationSeconds / 3600, 0)
const ridesCount = activities.length
```

### Query backend (Postgres) ottimizzata

Una RPC singola `home_dashboard(user_id uuid)` che ritorna tutto in un colpo:

```sql
CREATE FUNCTION home_dashboard(p_user_id uuid)
RETURNS json AS $$
SELECT json_build_object(
  'profile', (SELECT row_to_json(p) FROM profiles p WHERE p.id = p_user_id),
  'primary_moto', (SELECT row_to_json(m) FROM motorcycles m
                   WHERE m.owner_id = p_user_id AND m.is_primary LIMIT 1),
  'last_activity', (SELECT row_to_json(a) FROM activities a
                    WHERE a.owner_id = p_user_id
                    ORDER BY a.started_at DESC LIMIT 1),
  'totals', (SELECT json_build_object(
              'rides_count', count(*),
              'total_km', sum(distance_km),
              'total_hours', sum(duration_seconds) / 3600
            ) FROM activities WHERE owner_id = p_user_id),
  'documents_expiring', (SELECT json_agg(d) FROM documents d
                         WHERE d.owner_id = p_user_id
                           AND d.expires_at < now() + interval '30 days'),
  'unread_notifications', (SELECT count(*) FROM notifications
                           WHERE user_id = p_user_id AND read_at IS NULL),
  'next_group_ride', (SELECT row_to_json(r) FROM group_rides r
                      JOIN group_memberships gm ON gm.group_id = r.group_id
                      WHERE gm.user_id = p_user_id
                        AND r.status = 'confermata'
                        AND r.start_at > now()
                      ORDER BY r.start_at LIMIT 1)
)
$$ LANGUAGE sql STABLE;
```

Da chiamare con un singolo round-trip a Supabase.

---

## Mutations

Nessuna mutation diretta da Home. La schermata è puramente di lettura. Le azioni (tap su card) navigano altrove.

Eventuale eccezione:
- Tap notifica unread → mark single notification read (`markNotificationRead`)
- Tap "Mark all read" nel drawer notifiche → `markAllNotificationsRead`

---

## Validation rules

N/A (read-only).

---

## Policies (auth/RLS)

- Tutti i read sono per `auth.uid() = ownerId/userId`. Niente sharing su Home.
- RPC `home_dashboard` deve filtrare lato funzione (SECURITY INVOKER + RLS sulle tabelle).

---

## HUMAN-DEFERRED

- **Meteo**: la card meteo del prototipo HTML è statica. Per averla vera serve provider (OpenWeather, weatherapi.com). Decisione: **fuori scope Fase 1**, lo aggiungiamo Fase 5 o 6 quando i dati ci sono.
- **"Suggested for you"**: feed personalizzato. Non in MVP.
- **First-time onboarding card**: bouncing arrows verso "+ Moto" / "Registra"? Decidere se serve onboarding strutturato.
- **Manutenzione consigliata logic**: "tagliando ogni 6000 km" è uno standard moto? Ducati / Yamaha / BMW hanno schede diverse. Hardcodare regole base in MVP, magari personalizzabili in futuro.

---

## Note implementative

- File già esistente, popolato con seed reali nel prototipo. Da wirare a Supabase in Fase 1.
- Mini-mappa SVG procedurale (da `polylineSeed`). Quando avremo Mapbox vero, sostituire con Mapbox Static Images API (singola img per low cost).
- Sezione "Promemoria" non è ancora densa nel prototipo, va espansa.

---

## E2E coverage

Touch points: F-01 (onboarding → arriva qua), F-05 (registra GPS → torna qua, vede l'uscita nuova).
