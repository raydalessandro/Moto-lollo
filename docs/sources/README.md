# docs/sources — Materiale storico di riferimento

Questa cartella contiene le fonti originali del progetto Moto-lollo. **Non sono più la fonte di verità** per quel che riguarda il "cosa fa la UI" (vedi `docs/spec/` per la spec v2), ma restano utili come riferimento implementativo per il backend.

## File tracciati

| File | Cos'è | Stato |
|------|-------|-------|
| `prototype.html` | Prototipo HTML originale del front (single-file, design system + screen) | Riferimento visivo: è da qui che abbiamo costruito i 3 pillars. Aggiornato? No, è la versione iniziale. |
| `spec.xlsx` | Excel originale con 20 fogli (8 aree app + sistema + permessi + errori + data dictionary…) | **Superseded** per la UI dalla `docs/spec/` v2 (per-screen). Resta valido per data dictionary, permessi device, errori standard. |
| `spec_bundle.zip` | Archivio markdown delle spec tecniche profonde (35 file: tracking, sync, garage, community, navigation, safety, planning, ui_components, settings) | **Parzialmente valido** per il backend: vedi mapping sotto. |

## Mapping vecchia spec → nuova spec

Quando si progetta il backend, la nuova `docs/spec/` (per-schermata) è la fonte primaria per "cosa serve dalla UI". Per il "come funziona sotto" la spec vecchia resta valida:

| Vecchio bundle (`spec_bundle.zip/spec/`) | Stato | Note |
|------|-------|------|
| `00_overview.md` | Superseded | sostituito da `docs/spec/00_overview.md` |
| `01_data_model.md` | Parzialmente valido | nuove entità in `docs/spec/60_domain_model.md`, ma sezioni sui tipi base coincidono |
| `02_database_schema.md` | Riferimento | template per RLS, schema Postgres. Da rivedere dopo che chi disegna back ha letto la nuova spec |
| `03_local_db.md` | Riferimento | strategia local DB (SQLite/Drift) — rilevante se andiamo Flutter |
| `04_tracking/*` | **Valido** | GPS filters, state machine, edge cases. Da usare quando si implementa il vero tracking |
| `05_sync/*` | **Valido** | Queue design, idempotency, UX feedback. Da usare per la sync online/offline |
| `06_garage/*` | Parzialmente valido | UI cambia, dominio coincide |
| `07_community/*` | Da rivedere | community model è cambiato (alsoForCars, scope, savedCount) |
| `08_navigation/*` | **Valido** | architettura di navigazione |
| `09_safety/*` | **Valido** | SOS, contatti emergenza, live sharing — non implementato in UI MVP ma da progettare backend |
| `10_planning/*` | Da rivedere | planning è ora GroupRide + RouteProposal |
| `11_ui_components/*` | Superseded | il design system attuale è in `src/components/` |
| `12_settings_profile/*` | Parzialmente valido | settings struct OK, profile ha campi nuovi (initials, accentColor) |
| `99_open_questions.md` | Da chiudere | domande aperte che vanno risolte prima del back |

## Estrazione locale (gitignored)

La cartella `_refs/` nel root del repo contiene le versioni **estratte** di questi binari per facilità di grep / lettura:

- `_refs/excel_dump.md` — full text dump dell'Excel
- `_refs/excel_by_sheet/` — 20 fogli Excel splittati in markdown
- `_refs/prototype/` — i .jsx del prototipo + manifest
- `_refs/spec_bundle/spec/` — i 35 markdown del bundle, estratti

`_refs/` è **gitignored** (vedi `.gitignore`): è solo una conveniency locale, non parte del repo. Chi clona può estrarre lo zip e l'Excel manualmente.
