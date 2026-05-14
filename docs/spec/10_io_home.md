# 10 · io.home — Dashboard / launcher personale

## Purpose

Pagina di apertura dell'app. **Launcher hub** verso le azioni più frequenti + colpo d'occhio essenziale sui dati personali.

Concept: la Home è un *cockpit visivo* — hero con il dato singolo più importante (km totali), 4 azioni rapide quadrate per partire subito, e i percorsi salvati per riprendere quello che già hai. Stati profondi (manutenzione, scadenze documenti, ultima uscita dettagliata) **vivono altrove** (Garage, Mappa, Notifiche).

File implementazione: `src/features/io/HomeScreen.tsx`.

---

## Stati UI

| Stato | Trigger | Cosa cambia |
|-------|---------|-------------|
| `first-time` | utente appena registrato, no dati | hero con `totalKm = —` + saved routes vuoto |
| `loaded` (default) | tutti i blocchi popolati | layout standard |
| `with-advisory` | ≥1 documento ≤30g o scaduto | banner sottile 1-riga fra hero e azioni |
| `no-saved-routes` | 0 SavedRoute | sezione "I miei percorsi salvati" → empty state |

---

## Display

Layout `h-full overflow-hidden flex flex-col` — **non scrolla**, tutto in viewport.

### Hero (~32vh, fixed)

- Gradient ember scuro + texture topografica + ember glow corner
- Eyebrow: `▸ Gio 12:00` (giorno + ora corrente)
- H1 grande: `Ciao, {displayName}.`
- Sub: `Strade asciutte. Buon momento per uscire. · 22°` (sub meteo + temp inline)
- Bottom row:
  - Sinistra: **`12.840 km` totali** (font display 4xl)
  - Destra: chip "Garage →" (rapido accesso)

### Banner advisory (sottile, conditional)

Solo se ≥1 documento ≤30g/scaduto. Una riga, sfondo danger/warn tenue, tap → `io.garage`.

### Parti (4 azioni rapide, grid 2×2)

Titolo "Parti".

4 bottoni rettangolari compatti (aspect 2.4/1) con icona a sinistra + label + sub:
- **Registra** (mentre guidi) — highlight ember (azione principale) → apre `NavigationOverlay kind=tracking`
- **Crea** (su mappa) → apre `NavigationOverlay kind=tracking` (modalità editor)
- **Naviga** (a destinazione) → apre `NavigationOverlay kind=navigation`
- **Carica** (GPX) → modale upload (placeholder MVP)

Sono l'**unico** entry point alle 4 modalità di guida (la vecchia tab `io.registra` è stata eliminata — vedi `12_io_registra.md` ARCHIVED).

### Percorsi salvati (carousel orizzontale)

Titolo "I miei percorsi salvati" + link "tutti →" (porta a `io.mappa`).

Lista orizzontale scroll di card (44vw, max 180px):
- Mini-mappa procedurale 70px
- Badge "Moto · Auto" se `alsoForCars`
- Title (truncate) + `{distanceKm} km · {area}`
- Tap → `io.mappa` (in MVP). In Fase 1+ → detail screen del PublishedRoute.

Empty state se 0 saved: "Nessun percorso salvato ancora. Esplora il Mondo per salvarne uno."

---

## Read queries

```ts
getProfile(db, userId) → Profile
getPrimaryMotorcycle(db, userId) → Motorcycle | undefined  // per totalKm
listMyDocuments(db, userId) → Document[]  // per banner advisory
listSavedPublishedRoutes(db, userId) → PublishedRoute[]  // per carousel
```

### Aggregations

```ts
// Calcolo advisory:
docs.forEach(d => {
  const days = (d.expiresAt - now) / 86400000
  if (days < 0) → "scaduto da Xg"
  else if (days <= 30) → "scade fra Xg"
})
// Mostro solo il primo (il più urgente).
```

### RPC ottimizzata (futuro)

```sql
CREATE FUNCTION home_dashboard(p_user_id uuid)
RETURNS json AS $$
SELECT json_build_object(
  'profile', (SELECT row_to_json(p) FROM profiles p WHERE p.id = p_user_id),
  'primary_moto', (SELECT row_to_json(m) FROM motorcycles m
                   WHERE m.owner_id = p_user_id AND m.is_primary LIMIT 1),
  'documents_expiring', (SELECT json_agg(d) FROM documents d
                         WHERE d.owner_id = p_user_id
                           AND d.expires_at < now() + interval '30 days'
                         ORDER BY d.expires_at ASC LIMIT 5),
  'saved_routes_preview', (SELECT json_agg(pr) FROM published_routes pr
                           JOIN saved_routes sr ON sr.published_route_id = pr.id
                           WHERE sr.owner_id = p_user_id
                           ORDER BY sr.saved_at DESC LIMIT 5)
)
$$ LANGUAGE sql STABLE;
```

---

## Mutations

Nessuna mutation diretta da Home. Le azioni navigano:
- Quick actions → `io.registra`
- Banner advisory → `io.garage`
- "Garage" chip → `io.garage`
- "Tutti i percorsi" → `io.mappa`
- Tap saved route card → `io.mappa` (futuro: detail PublishedRoute)

---

## Validation rules

N/A (read-only).

---

## Policies (auth/RLS)

- Tutti i read sono per `auth.uid() = ownerId/userId`. Niente sharing su Home.
- RPC `home_dashboard` con SECURITY INVOKER + RLS sulle tabelle.

---

## HUMAN-DEFERRED

- **Hero immagine reale**: ora usiamo gradient + texture topo procedurale. Vorremmo una foto evocativa (moto in strada, paesaggio)? Decisione: in Fase 5/6 si può inserire foto contestuale (es. ultima moto dell'utente, oppure foto dell'ultima uscita). Per MVP pattern grafico OK.
- **Meteo reale**: ora hardcoded (`temp: 22, sub: "Strade asciutte…"`). Provider in Fase 5+ (OpenWeather o simile).
- **Deep-link azioni rapide**: oggi tutti i 4 bottoni vanno all'hub `io.registra`. In Fase 1+ ogni bottone aprirebbe direttamente la modalità (Registra → tracking, Crea → editor, Naviga → ricerca destinazione, Carica → file picker).
- **Suggerimento "torna a casa"**: in app simili c'è scorciatoia che usa la home location dell'utente. Out of MVP, valutabile in Fase 5.
- **Personalizzazione hero**: l'utente potrebbe scegliere quale dato mostrare nel posto principale (km totali / km mese / ore in sella / scadenza prossima)? Out of MVP, possibile setting in Fase 6.
- **Notification badge sull'hamburger**: già presente nell'Header globale. Numero notifiche unread.

---

## Note implementative

- File `src/features/io/HomeScreen.tsx`. ~270 righe.
- `MiniMap` helper procedurale (~50 righe). Riusabile per saved cards + futuri detail screen.
- `QuickAction` sub-component per i 4 bottoni quadrati.
- `SavedRouteCard` sub-component per ogni item del carousel.
- `hashSeed(routeId)` per polyline deterministica del SavedRoute (così ogni route ha sempre la stessa mappa procedurale finché non c'è Mapbox vero).

### Differenza dalla versione precedente

La Home originaria era un *dashboard dati* (stats, ultima uscita, moto, attenzione, condizioni, scorciatoie, etc. — 5+ sezioni che scrollavano).

La nuova è un *launcher* (hero + 4 quick actions + saved routes) che sta in viewport senza scroll. I dati profondi vivono nelle screen dedicate (Garage, Mappa, Notifiche).

Cambio fatto post-prototipo per ridurre cognitive load e velocizzare il "voglio uscire ora" flow.

---

## E2E coverage

Touch points: F-01 (onboarding → arriva qua), F-05 (registra GPS → tap "Registra" qui).

Test E2E per Fase 1:
1. Vedo hero con km totali della moto primaria
2. Banner advisory appare se ho documenti ≤30g
3. Tap "Registra" → naviga a `io.registra`
4. Tap "Garage" chip → naviga a `io.garage`
5. Saved routes scrolla orizzontalmente
6. Tap su saved route card → naviga a `io.mappa`
