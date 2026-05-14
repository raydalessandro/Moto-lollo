# 12 · io.registra — [ARCHIVED]

> **Stato 2026-05-14:** schermo eliminato. Le 4 modalità (Registra · Crea · Naviga · Carica GPX) vivono ora come **azioni rapide** nella `10_io_home.md` e aprono direttamente il NavigationOverlay (`40_navigation.md`).
>
> Motivazione: il vecchio `RegistraScreen` era un "hub intermedio" che duplicava esattamente le 4 azioni della Home. Eliminandolo si è semplificato il flusso (1 tap invece di 2) e si è liberato uno slot nella bottom nav IO (ora a 3 tab: Home · Mappa · Garage).

## Dove sono finite le 4 modalità

| Modalità (vecchio nome) | Trigger nuovo | Overlay aperto |
|-------------------------|---------------|----------------|
| Registra (GPS tracking) | Home → bottone "Registra" | `NavigationOverlay kind=tracking` |
| Crea su mappa | Home → bottone "Crea" | `NavigationOverlay kind=tracking` (editor placeholder) |
| Naviga | Home → bottone "Naviga" | `NavigationOverlay kind=navigation` |
| Importa GPX | Home → bottone "Carica" | Modale upload (placeholder MVP) |

## Cosa NON è cambiato

Le 4 mutations + validation + RLS restano valide nella `40_navigation.md`. La parte di backend è identica — è solo l'entry point UI che è cambiato.

I requisiti funzionali (parsing GPX, geocoding, idempotency, ecc.) restano come descritti in `40_navigation.md` §"Mutations" e nei file legacy `docs/sources/spec_bundle.zip/spec/04_tracking/*`.
