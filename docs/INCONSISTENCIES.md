# Incongruenze tra fonti — [ARCHIVED]

> **Stato 2026-05-14:** documento archiviato. Tutte le 6 incongruenze tracciate qui sono state risolte dal refactor front (Step 1–15) e dalla nuova spec v2 in `docs/spec/`. Resta qui per storia.

Sotto un riepilogo finale di ciascuna voce e come è stata risolta. Per il futuro, le decisioni vivono in `docs/spec/00_overview.md §"Decisioni chiave"` e in `docs/PLAN.md §1`.

---

## [F-001] Moduli applicativi: 8 (Excel) vs 7 (spec zip)

- **Resolved:** adottato il pattern 3-pillar (IO/GRUPPO/MONDO) del prototipo. Le 8 aree Excel sono state ridistribuite. Vedi `docs/spec/00_overview.md`.

## [F-002] Excel e spec zip hanno obiettivi prodotto diversi

- **Resolved:** Next.js + React per il prototipo è confermato. Decisione PWA vs Flutter rinviata a dopo la prima fase di build reale (vedi `docs/ROADMAP.md`).

## [F-003] Cancellazione account: vincolo temporale username

- **Resolved-deferred:** vincolo "username modificabile 7g" non implementato in MVP. Tracciato come HUMAN-DEFERRED nella spec drawer/Privacy (`docs/spec/50_drawer.md` quando lo scriviamo).

## [F-004] Safety / SOS: presenza nell'Excel

- **Resolved:** Safety **non** è in bottom nav. Vivrà sotto drawer > Impostazioni > Sicurezza (placeholder MVP). La spec legacy `09_safety/*` resta valida come riferimento back-end. Vedi `docs/sources/README.md`.

## [F-005] Cordata live: concetto UX solo prototipo

- **Resolved:** Cordata implementata come modalità live di un GroupRide (Step 10 + 14). LiveSession del back è il modello dietro. Documentata in `docs/spec/70_flussi_e2e.md F-17`.

## [F-006] Architettura navigazione: 3 pillars vs 8 aree flat

- **Resolved:** seguito il prototipo (3 pillars). Vedi `docs/spec/00_overview.md`.
