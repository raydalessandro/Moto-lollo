# 13 · io.garage — Moto, manutenzione, documenti

## Purpose

Il "garage virtuale". Per ogni utente:
- Lista delle proprie moto (una marcata come `isPrimary`)
- Per ogni moto: log manutenzione + km totali + scadenze documenti collegati
- Documenti generali (patente, anche se non legati a una moto specifica)

File implementazione: `src/features/io/GarageScreen.tsx` (+ sub-screens per detail moto).

---

## Stati UI

| Stato | Trigger | Cosa cambia |
|-------|---------|-------------|
| `no-bikes` | 0 motorcycles | EmptyState con CTA "+ Aggiungi la tua moto" |
| `loaded` | ≥1 moto | lista cards |
| `bike-detail` | tap una moto | sub-screen con 3 tabs: Info / Manutenzione / Documenti |

---

## Display

### Lista (default)

Header: "Garage" + counter "{n} moto · {totalKm} km totali"

Per ogni moto, `MotoCard`:
- Photo (o gradient + initial della brand)
- Brand + model + year
- "PRIMARIA" badge se `isPrimary`
- Total km (counter denormalizzato)
- Quick info: ultima manutenzione (giorni fa)
- Tap → bike detail screen

Bottone "+ Aggiungi moto" in alto-destra.

Sezione separata sotto:
- **Documenti scadenza** (se ≤30g):
  - Lista chip rossa/gialla per ogni Document in scadenza
  - tap → detail (per estendere/aggiornare)

### Bike detail screen

Tabs:

**Info**
- Photo grande
- Specs (brand, model, year, engineCc, color, plate? — HUMAN-DEFERRED se aggiungere)
- Total km (con timeline ultimi 6 mesi opzionale)
- Stats by year (uscite, km, ore)
- Bottoni: `Modifica`, `Set come primaria` (se non lo è), `Elimina`

**Manutenzione**
- Lista MaintenanceRecord ordinati per date DESC
- Per ogni record: kind (icona) + date + kmAtService + notes + costEur
- Bottone "+ Aggiungi intervento"
- Predicting: "Prossimo tagliando suggerito tra {N} km" (regole semplici)

**Documenti**
- Lista Document filtrati per `motorcycleId === bike.id`
- Per ogni: kind + expiresAt + status badge (scaduto/scadenza ≤30g/ok)
- Bottone "+ Aggiungi documento"

---

## Read queries

```ts
listMyMotorcycles(db, userId) → Motorcycle[]
getMotorcycle(db, motoId) → Motorcycle
listMaintenanceForBike(db, motoId) → MaintenanceRecord[]
listMyDocuments(db, userId) → Document[]
  // filter per moto: docs.filter(d => d.motorcycleId === motoId)
listMyActivities(db, userId)
  .filter(a => a.motorcycleId === motoId)
  // per stats per-bike
```

Aggregations (per stats per-bike):

```ts
const bikeActivities = activities.filter(a => a.motorcycleId === motoId)
const totalKmThisYear = bikeActivities
  .filter(a => year(a.startedAt) === currentYear)
  .reduce((s, a) => s + a.distanceKm, 0)
```

### Postgres view utile

```sql
CREATE VIEW motorcycle_stats AS
SELECT
  m.id,
  m.owner_id,
  count(a.id) as rides_count,
  sum(a.distance_km) as total_distance,
  sum(a.duration_seconds) / 3600 as total_hours,
  max(a.started_at) as last_ride_at
FROM motorcycles m
LEFT JOIN activities a ON a.motorcycle_id = m.id
GROUP BY m.id, m.owner_id;
```

---

## Mutations

### Moto

```ts
createMotorcycle({
  ownerId, name, brand, model,
  year?, engineCc?, color?, photoUrl?, purchasedAt?
}) → Motorcycle
  → side: se è la prima moto, isPrimary=true automatico
  → side: notify "Hai aggiunto {brand} {model} al garage"

updateMotorcycle(motoId, fields)
  → check ownership
  → updatable: name, photoUrl, color, year (correzioni)
  → NON updatable: brand, model (è una nuova moto, crea record nuovo)
  → totalKm aggiornato solo da trigger su activities, mai da UI

setPrimaryMotorcycle(motoId)
  → check ownership
  → side: tutti gli altri motorcycle.isPrimary = false (transaction)

deleteMotorcycle(motoId)
  → check ownership
  → policy: solo se 0 activities collegate, oppure soft-delete
  → side: documenti collegati → cosa fare? Decisione: spostare a motorcycleId=NULL (associabili manualmente dopo)
  → side: maintenance records → cascade delete (sono per-moto)
  → side: se era primaria → promuovere first altra moto a primary
```

### Manutenzione

```ts
createMaintenanceRecord({
  motorcycleId, kind, date, kmAtService, notes?, costEur?
}) → MaintenanceRecord
  → check moto ownership
  → validation: kmAtService > 0
  → side: nessuno

updateMaintenanceRecord(recordId, fields)
deleteMaintenanceRecord(recordId)
```

### Documenti

```ts
createDocument({
  ownerId, motorcycleId?, kind, expiresAt, notes?
}) → Document
  → side: schedule notifications via cron (30d / 7d / 1d before)
  → HUMAN-DEFERRED: scheduling logic — table `scheduled_notifications` o computed at cron time

updateDocument(docId, fields)
deleteDocument(docId)
```

---

## Validation rules

**Motorcycle:**
- brand 1-50 chars
- model 1-50 chars
- year: if present, 1900-2100
- engineCc: if present, > 0 e < 5000
- only one isPrimary per owner

**MaintenanceRecord:**
- kmAtService > 0
- date <= today (no future)
- costEur >= 0

**Document:**
- expiresAt > today (al momento del create)
- HUMAN-DEFERRED: ammettere documenti già scaduti? Sì, utile per chi inserisce storico.

---

## Policies (auth/RLS)

```sql
-- motorcycles
CREATE POLICY "users CRUD own bikes"
  ON motorcycles FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- maintenance_records (via moto join)
CREATE POLICY "users CRUD own maintenance"
  ON maintenance_records FOR ALL
  USING (EXISTS (
    SELECT 1 FROM motorcycles m
    WHERE m.id = maintenance_records.motorcycle_id
      AND m.owner_id = auth.uid()
  ));

-- documents
CREATE POLICY "users CRUD own documents"
  ON documents FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
```

---

## HUMAN-DEFERRED

- **Plate (targa)**: aggiungere campo? Utile per ricerca rapida, info anti-furto. Privacy: targa sempre privata. Decidere se metterla in MVP.
- **VIN / numero telaio**: stesso discorso. Vai per quando l'app farà roba seria (export documenti per assicurazione).
- **Foto multiple per moto**: 1 primaria + galleria? In MVP solo 1, in Fase 5 aggiungere gallery.
- **Manutenzione consigliata predittiva**: "prossimo tagliando tra X km". Regole base hardcoded (es. ogni 6000 km per touring, 8000 per naked, etc.). Decidere in Fase 1.
- **Cost tracking aggregato**: "hai speso €X in manutenzione quest'anno". Nice-to-have, fuori MVP.
- **Import dati da altre app**: portare lo storico da Strava / Garmin / app delle case (Ducati Link). Out of scope finché non c'è una richiesta concreta.
- **Vendita moto**: cosa succede se "vendo" la moto? Status `sold`? Soft-delete? Decisione UX da prendere quando rilevante.

---

## Note implementative

- File esistente. Da wirare a Supabase in Fase 1.
- Photo upload va su Supabase Storage bucket `motorcycle-photos/<userId>/<motoId>.jpg`.
- Trigger automatico `update totalKm`: dopo INSERT su `activities` con motorcycle_id non null, aggiornare `motorcycles.total_km += distance_km`.
- Legacy spec utile: `docs/sources/spec_bundle.zip/spec/06_garage/*` per pattern manutenzione + scadenze.

---

## E2E coverage

Flussi in `70_flussi_e2e.md`:
- **F-02**: Aggiungo una moto al garage
- **F-03**: Registro promemoria scadenza assicurazione

Test E2E per Fase 1:
1. Add moto → appare nella lista, è primaria automaticamente
2. Add seconda moto → la prima resta primaria
3. Set seconda come primaria → switcheroo
4. Add maintenance record → appare nel log
5. Add document expires in 25 days → appare nei reminder Home + Garage section "Documenti scadenza"
