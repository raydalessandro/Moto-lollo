# Moto-lollo · Spec v2

Specifica funzionale del front Moto-lollo, organizzata **per schermata** (non per area tecnica). È la fonte primaria per chi disegna il backend: ogni schermata dichiara cosa legge, cosa scrive, quali regole valgono, quali aree restano aperte.

**Sostituisce** (per il "cosa fa la UI"): `docs/sources/spec.xlsx` + bundle markdown legacy. Le vecchie sezioni tecniche profonde (`04_tracking/*`, `05_sync/*`, `09_safety/*`) restano valide come riferimento implementativo: vengono linkate dalle pagine corrispondenti.

---

## Stato

- **Front:** Step 1–15 ✅ chiusi su `main`. Build verde, deploy Vercel ok.
- **Spec v2:** in scrittura, file principali sotto.
- **Backend:** non ancora disegnato. Si parte da questa spec.

---

## Indice

### Fondamentali
- [`00_overview.md`](./00_overview.md) — modello a 3 pillars, drawer, fullscreen. Cosa c'è e cosa NON c'è.
- [`60_domain_model.md`](./60_domain_model.md) — entità, campi, relazioni, denormalized counters.
- [`70_flussi_e2e.md`](./70_flussi_e2e.md) — flussi utente end-to-end (onboarding, ride, gruppo, mondo).

### Per schermata

**Pillar IO**
- `10_io_home.md` — launcher (km + 4 azioni rapide)
- `11_io_mappa.md` — archivio percorsi (creati + salvati)
- `12_io_registra.md` — **[ARCHIVED]** sostituito dalle azioni Home
- `30_mondo_feed.md` — Feed (3ª tab IO dopo scioglimento MONDO)
- `13_io_garage.md` — moto + manutenzione + documenti

**Pillar GRUPPO** (contesto = gruppo corrente)
- `20_gruppo_lista.md` — esplora gruppi + profilo non-membro
- `21_gruppo_home.md` — dashboard gruppo (membri, next ride, percorsi)
- `22_gruppo_pianifica.md` — bacheca eventi (admin edit, member read+proponi)
- `23_gruppo_cordata.md` — pre-partenza + live
- `24_gruppo_storia.md` — ultima uscita finestrata (24h+30g)
- `25_gruppo_diario.md` — archivio cristallizzato

**Drawer destinations** (ex MONDO pillar — sciolto)
- `31_mondo_eventi.md` — eventi curati big (drawer destination)
- `32_mondo_classifica.md` — classifica percorsi (drawer destination)

**Trasversali**
- `40_navigation.md` — overlay fullscreen turn-by-turn / tracking / cordata
- `50_drawer.md` — Profilo · Eventi · Classifica · Impostazioni · Privacy

---

## Come si legge una pagina

Ogni pagina di schermata segue la stessa struttura:

1. **Purpose** — una riga, perché esiste.
2. **Stati UI** — empty / loaded / detail / errore, con cosa cambia.
3. **Display** — quali campi/colonne mostra.
4. **Read queries** — firme delle funzioni di lettura (`listX(userId)`, `getY(id)`).
5. **Mutations** — firme delle scritture + effetti collaterali (counter, notifiche…).
6. **Validation rules** — vincoli su input / stato (es. `distanceKm > 0`).
7. **Policies (auth/RLS)** — chi può leggere/scrivere cosa.
8. **HUMAN-DEFERRED** — decisioni da prendere prima del back / shortcut del prototipo.
9. **Note implementative** — link a vecchio bundle dove rilevante.

Convenzioni:
- I tipi (`Profile`, `PublishedRoute`…) sono definiti in `60_domain_model.md` e tracciati in `src/types/domain.ts`.
- ID = `UUID` stringa. Timestamp = `ISODate` stringa.
- Counter denormalizzati sull'entità (`savedCount`, `navigatedCount`, `membersCount`, `confirmedCount`) sono mantenuti via trigger nel back. Nel prototipo sono seedati a mano.

---

## Backend-agnostic

Questa spec **non** prescrive Supabase / Postgres / Node / Flutter. Definisce contract logici. Il backend designer decide:
- DB engine (Postgres consigliato per RLS e GIS)
- Auth provider (Supabase Auth, Clerk, Auth0)
- Realtime: cordata live richiede broadcasting (Supabase Realtime, Pusher, o WS custom)
- Storage media (S3, Supabase Storage)
- Map tiles (Mapbox confirmed nel front, ma swappabile a MapLibre+OSM)

Decisione cliente (PWA vs Flutter nativo) **non** impatta lo spec: questa è purely server-side contract.
