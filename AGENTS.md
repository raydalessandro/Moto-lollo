# AGENTS.md — istruzioni operative per AI agents

Documento di onboarding per AI agents che lavorano su questo repo. Tienilo aperto durante una sessione. Pensato per essere conciso e operativo.

---

## Prima di iniziare qualsiasi task

**Leggi in quest'ordine (~5 minuti):**

1. [`HANDOFF.md`](./HANDOFF.md) — stato corrente + prossimo step
2. [`docs/ROADMAP.md`](./docs/ROADMAP.md) — quale fase, cosa rimane
3. [`docs/spec/README.md`](./docs/spec/README.md) — mappa della spec v2
4. [`CHANGELOG.md`](./CHANGELOG.md) — cosa è cambiato di recente

Per task specifici a una schermata: leggi anche il relativo `docs/spec/<num>_*.md`.

Per task backend: `docs/spec/80_backend_design.md` + le sezioni "Read queries" / "Mutations" / "Policies" delle spec per-screen interessate.

---

## Chi sono gli interlocutori

- **Ray** (utente principale) — owner del progetto. Decisioni di prodotto, strategia, scope.
- **AI agent** (tu) — implementazione tecnica. Domanda quando una decisione non è chiara o non documentata. Non improvvisare sulle decisioni di prodotto.

---

## Regole d'oro

1. **Non improvvisare scelte di prodotto.** Se la spec dice "HUMAN-DEFERRED" o non copre, **chiedi** prima di implementare.
2. **Non rompere la build.** Prima di qualsiasi push: `npm run typecheck` deve passare. Build verde su `main` è non-negoziabile.
3. **Aggiorna le doc quando aggiungi codice.** Una nuova feature → la spec per-screen va aggiornata. Una nuova entità → `60_domain_model.md` va aggiornata. Un nuovo flusso → `70_flussi_e2e.md` va aggiornato.
4. **Commit atomici** con messaggio Conventional. Niente "wip" o "various fixes".
5. **Tienilo asciutto.** Niente abstraction premature, niente "potrebbe servire domani". Si aggiunge quando serve.

---

## Comandi base

```bash
# Locale
npm install
npm run dev               # dev server
npm run typecheck         # tsc --noEmit (DEVE passare prima di push)
npm run build             # production build (DEVE passare prima di push)
npm run test              # vitest run (DEVE passare prima di push)
npm run test:watch        # vitest watch mode
npm run test:coverage     # v8 coverage report
npm run lint              # eslint

# Git — workflow branch + PR (attivo dalla Fase A turn-by-turn)
git status                # SEMPRE prima di committare
git diff                  # rivedi le modifiche prima di committare
git log --oneline -10     # contesto recente

git checkout -b feat/<name>     # nuova branch
git add <file>                  # mai `git add -A` se non hai verificato git status
git commit -m "tipo(area): messaggio"
git push -u origin feat/<name>  # push branch
# poi: apri PR via mcp__github__create_pull_request (draft se WIP)
# Ray valida su Preview Vercel → squash merge → sync main → cancella branch
```

**Niente più push diretti su `main`**: tutto via PR + squash merge.

---

## Convenzioni commit

Conventional Commits con scope:

| Tipo | Quando | Esempio |
|------|--------|---------|
| `feat` | nuova feature/screen visibile all'utente | `feat(io): add GPX import flow` |
| `fix` | bug fix | `fix(gruppo): cordata navigator not refreshing` |
| `chore` | cleanup, config, deps | `chore: bump next 16.3.0` |
| `docs` | solo documentazione | `docs(spec): clarify F-17 cordata realtime` |
| `refactor` | refactor senza behavior change | `refactor(mocks): extract rng helpers` |

Scope possibili: `nav · io · gruppo · mondo · profilo · mocks · shell · ui · docs · spec`.

**Messaggio multi-line**: usa HEREDOC se serve corpo dettagliato.

```bash
git commit -m "$(cat <<'EOF'
feat(io): GPX import — first cut

- new src/lib/gpx-parser.ts
- mutation importGpx wired in RegistraScreen
- supports GPX 1.0/1.1
EOF
)"
```

---

## Convenzioni codice

### Tipi

- Single source of truth in `src/types/domain.ts`. Tutto il resto deriva.
- UUID = stringa. ISODate = stringa ISO 8601.

### Importazioni

- Path alias `@/*` per tutto sotto `src/`. Evita relative deep (`../../../`).
- Componenti UI: import da `@/components/ui` o `@/components/nav`.
- Dati: import via `@/mocks/queries` o `@/mocks/DbProvider`. **Mai** import diretto delle tabelle.

### File new

- Componenti React in PascalCase: `FooScreen.tsx`.
- Utilities in camelCase: `formatDate.ts`.
- Tipi in PascalCase nei file `domain.ts` / specifici.

### Style

- Tailwind 4 con design tokens in `src/app/globals.css`.
- Niente CSS-in-JS, niente styled-components.
- Animazioni in `globals.css`, riusare quelle esistenti (`screen-enter`, `live-pulse-dot`, `avatar-ring-spin`, `cordata-thread`).

---

## File da NON toccare senza ragione esplicita

| File | Perché |
|------|--------|
| `docs/sources/spec.xlsx` | Binario originale, immutabile |
| `docs/sources/spec_bundle.zip` | Bundle originale, immutabile |
| `docs/sources/prototype.html` | Prototype HTML originale |
| `docs/INCONSISTENCIES.md` | Archived. Storia, non aggiornare. |
| `package-lock.json` | Lascialo gestire a npm |
| `.gitignore` | Modifica solo se aggiungi tool/dir nuovi |
| `LICENSE` | MIT, non cambiare |

`docs/PLAN.md` è storico ma può ricevere checkpoint quando chiudiamo fasi.

---

## Quando aprire un task

### Task piccolo (1 file, < 50 righe)

Vai diretto: leggi → modifica → typecheck → commit → push.

### Task medio (multi-file, < 300 righe)

1. Pianifica a voce (1 paragrafo "ecco cosa farò").
2. Conferma con Ray se cambia qualcosa di prodotto.
3. Implementa.
4. Aggiorna spec se hai introdotto nuova logica/entità.
5. Typecheck + build verde.
6. Commit + push.

### Task grosso (nuova feature, multi-commit, > 300 righe)

1. Spec prima: aggiorna o crea il documento `docs/spec/<num>_*.md`.
2. Conferma scope con Ray.
3. Implementa per step incrementali.
4. Ogni step → commit atomico + typecheck verde.
5. Aggiorna `CHANGELOG.md` quando lo step segna milestone.

---

## MCP tools disponibili

GitHub MCP per branch/PR (workflow attivo):

- `mcp__github__create_pull_request` — apre PR (draft per WIP)
- `mcp__github__update_pull_request` — toglie draft prima del merge
- `mcp__github__merge_pull_request` — squash merge
- `mcp__github__push_files` per batch commit multi-file (raramente serve)
- `mcp__github__create_or_update_file` per single file con SHA

Quando si avvia Fase 1, useremo anche **Supabase MCP** (configurazione futura) per database migrations + RLS testing.

---

## Quando chiedere a Ray

- **Decisioni di prodotto**: scope, priorità, UX trade-off.
- **HUMAN-DEFERRED** nelle spec: ogni voce così marcata richiede una decisione.
- **Cambi di stack**: aggiungere dipendenze grosse, cambi DB, etc.
- **Operazioni distruttive**: drop table, delete branch, force-push, rewrite history.

## Quando NON chiedere (procedi)

- Implementazione tecnica già specificata in `docs/spec/`.
- Refactor che non cambia comportamento.
- Fix di bug evidenti.
- Cleanup di dead code/stale comments.
- Aggiornamento docs in sync con codice.

---

## Pattern di errore comuni da evitare

1. **Commit "tipo" mancante**: `git commit -m "stuff"` → no. Sempre `feat(area): ...`.
2. **Push senza typecheck + test**: scotta. Sempre `npm run typecheck && npm run test` prima.
3. **Push diretto su `main`**: vietato dopo Fase A turn-by-turn. Sempre branch + PR.
4. **Aggiungere CLAUDE.md mid-session**: questo file è AGENTS.md, non duplicare.
5. **Toccare file legacy `docs/sources/*`**: sono immutabili. Modifica `docs/sources/README.md` se serve aggiornare il mapping.
6. **Modificare il mock DB per fixare la UI**: se la UI ha un bug, sistema il componente, non il seed.
7. **Spec out-of-date**: se modifichi una mutation senza aggiornare la spec → debito. Spec e codice si muovono insieme.
8. **Bug senza regression test**: ogni bug che richiede un fix in `lib/navigation.ts`, `lib/voice.ts` o futuro `lib/*` testabile → scrivere prima il test che riproduce il bug, poi fixare.

---

## Workflow di apertura sessione

Quando una chat si apre:

1. Leggi `HANDOFF.md` (30 secondi)
2. `git status` + `git log --oneline -5` per contesto recentissimo
3. Conferma a Ray cosa stai per fare
4. Procedi

Quando una chat si chiude:

1. Aggiorna `HANDOFF.md` se siamo a uno stato che vale la pena salvare
2. Aggiorna `CHANGELOG.md` se hai chiuso un milestone
3. Verifica build verde + push pulito su `main`

---

## Versione corrente

`0.1.0` — Fase 0 chiusa (vedi `CHANGELOG.md`).
