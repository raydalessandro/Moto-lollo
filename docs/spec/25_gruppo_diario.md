# 25 · gruppo.diario — Archivio cristallizzato

## Purpose

L'archivio **immutabile** di tutte le uscite passate di un gruppo. È dove va a finire una Storia quando si chiude (vedi `24_gruppo_storia.md`). Read-only: nessuno può commentare/aggiungere foto qui, è la "history" del gruppo.

File implementazione: `src/features/gruppo/DiarioScreen.tsx`.

---

## Stati UI

| Stato | Trigger | Cosa cambia |
|-------|---------|-------------|
| `empty` | gruppo 0 ride completate | EmptyState "Nessuna uscita nel diario ancora" |
| `loaded` | ≥1 ride completata | lista cronologica DESC |
| `entry-detail` (futuro) | tap su entry | sub-screen replay + foto + commenti cristallizzati |

---

## Display

Layout:
1. **Header**: `▸ Diario` + H1 "Storico del gruppo" + counter "{n} uscite · {totalKm} km"
2. **Filter chip** (futuro): per anno, per ride length, ecc.
3. **Lista entries**: per ogni ride completata, una `DiarioEntry` card:
   - Date pill (giorno/mese/anno)
   - Title
   - Snapshot: mini-mappa + 3 stat (distance, duration, partecipanti)
   - Foto thumbnails (max 4 in preview)
   - Tap → detail (Fase 5)

---

## Read queries

```ts
listPastGroupRides(db, groupId, nowIso) → GroupRide[]
  // tutte status="completata", ordinate per startAt DESC

// Per ogni entry:
listActivityMedia(db, activityId)  // dalle activities collegate al ride
  .slice(0, 4)  // preview
```

Aggregazioni (lato UI per ora):

```ts
const totalKm = pastRides.reduce((s, r) => s + r.distanceKm, 0)
const totalRides = pastRides.length
```

### RPC

```sql
CREATE FUNCTION group_diario(p_group_id uuid)
RETURNS json AS $$
SELECT json_build_object(
  'rides', (SELECT json_agg(json_build_object(
              'ride', r,
              'media_preview', (SELECT json_agg(am) FROM activity_media am
                                JOIN activities a ON a.id = am.activity_id
                                WHERE a.group_ride_id = r.id
                                LIMIT 4),
              'participants_count', r.confirmed_count
            ) ORDER BY r.start_at DESC)
            FROM group_rides r
            WHERE r.group_id = p_group_id AND r.status = 'completata'),
  'totals', (SELECT json_build_object(
              'count', count(*),
              'total_km', coalesce(sum(distance_km), 0)
            ) FROM group_rides WHERE group_id = p_group_id AND status = 'completata')
);
$$ LANGUAGE sql STABLE;
```

### Pagination

Per ora in-memory. Quando un gruppo accumula 100+ ride completate, paginare cursor su `startAt DESC`.

---

## Mutations

Diario è **read-only**. Nessuna mutation diretta.

Eccezione: admin può "eliminare entry" se serve (errori, contenuti inappropriati):

```ts
deleteRideFromDiario(rideId, adminUserId)
  → policy: admin del gruppo
  → side: soft-delete (set deletedAt), non rimuove activity reali dei partecipanti
  → HUMAN-DEFERRED: nasconde solo da diario o anche da activity dei singoli?
```

---

## Validation rules

N/A (read-only).

---

## Policies (auth/RLS)

```sql
-- group_rides (completata)
-- Membri del gruppo possono vedere tutto lo storico
CREATE POLICY "members see group history"
  ON group_rides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_rides.group_id
        AND gm.user_id = auth.uid()
    )
  );
```

Non-membri vedono ride completate? **No** in MVP (solo le confermate prossime, per discovery). Decidere se aprire diario "vetrina" per discovery in Fase 5.

---

## HUMAN-DEFERRED

- **Detail screen** di una entry: replay polyline + galleria foto + commenti cristallizzati (read-only). Fase 5.
- **Statistiche aggregate gruppo** ("nel 2026 abbiamo fatto X km in Y uscite"): nice-to-have, Fase 6.
- **Filtri**: per anno, per leader, per area. Aggiunti in Fase 5.
- **Export**: PDF / GPX bundle di tutte le ride. Out of MVP.
- **Edit di una entry** post-chiusura: titolo, note. Decidere se ammesso. Probabilmente no — è cristallizzato per definizione.
- **Reazioni "like" su entry diario**: cuori, applausi. Soft engagement. Fase 6.
- **Non-member preview**: una sezione "Cosa fanno" per i gruppi pubblici nelle pagine di scoperta. Decisione UX da prendere.

---

## Note implementative

- File esistente, popolato con seed (ride `rc1`-`rc12` sono completate nel mock).
- L'helper di filtro è già in queries: `listPastGroupRides`.
- Quando ride passa a `completata` (fine cordata), entra automaticamente in Diario al refresh successivo. Nessuna mutation esplicita necessaria.

---

## E2E coverage

Flussi correlati:
- **F-18** (Storia → Diario): la transition è automatica via lifecycle window.

Test E2E per Fase 4-5:
1. Vado a Diario → vedo lista cronologica delle ride completate
2. Conto = matches seed (12 in g1)
3. Quando una nuova ride si completa → appare in cima al Diario
4. Quando una Storia si chiude → idem (era già lì, ma la perdita dell'attivazione Storia conferma)
