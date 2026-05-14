# 20 · Picker gruppi (long-press) + Esplora

## Purpose

Due overlay per lavorare con i gruppi:

1. **GroupPickerOverlay** — bottom sheet che si apre su **long-press** del toggle "GRUPPO" nell'Header. Mostra i miei gruppi + voce "Esplora altri".
2. **ExploreGroupsOverlay** — fullscreen overlay per scoprire gruppi pubblici (i miei + altri). Si apre da: dentro il GroupPickerOverlay (voce "Esplora altri"), oppure quando un nuovo utente non ha gruppi ancora.

File implementazioni:
- `src/components/nav/GroupPickerOverlay.tsx` (picker veloce)
- `src/components/AppShell.tsx` → componente `ExploreGroupsOverlay` (esplora full)

Quando l'utente tap su un gruppo nell'overlay:
- **Gruppo a cui appartiene**: cambia il contesto del pillar + va a `gruppo.home`
- **Gruppo a cui NON appartiene**: come sopra, ma in versione "profilo gruppo non-membro" (vedi `21_gruppo_home.md`)

## Storia IA

Originariamente i miei gruppi vivevano come **chip strip orizzontale** sopra il pillar GRUPPO (sotto l'Header). È stato eliminato per recuperare verticale: lo switch tra i miei gruppi avviene ora tramite **long-press sul toggle GRUPPO** nell'Header. Una piccola freccetta ▾ indica la presenza del menu quando il toggle è attivo.

---

## Stati UI

| Stato | Trigger | Cosa cambia |
|-------|---------|-------------|
| `loaded` (default) | apertura overlay | 2 sezioni: I tuoi gruppi / Scopri altri |
| `no-other-groups` | sei in tutti i gruppi conosciuti | EmptyState "Sei già membro di tutti i gruppi che conosciamo" |
| `request-pending` | hai già richiesto iscrizione (non yet approved) | GroupRow con badge "in attesa" + bottone disabilitato |

---

## Display

Header overlay: back button (`← chiudi`) + titolo "Esplora gruppi" + spacer.

**Sezione 1 — I tuoi gruppi** (sopra)
- Eyebrow `▸ I tuoi gruppi` + count
- Lista `GroupRow`:
  - Crest 40×40 con tag (es. "GRD") in font display
  - Group name + badge "· membro"
  - Subtitle: `area · membersCount membri · publicRoutesCount percorsi pubblici`
  - Chevron →

**Sezione 2 — Scopri altri** (sotto)
- Eyebrow `▸ Scopri altri` + count "N pubblici"
- Lista `GroupRow` (stesso layout)
- Tap → entra come ospite + apre `21_gruppo_home.md` profilo gruppo

---

## Read queries

```ts
listMyGroups(db, userId) → Group[]
  // gruppi where exists GroupMembership(userId, groupId)
listOtherGroups(db, userId) → Group[]
  // gruppi where NOT exists GroupMembership(userId, groupId)
```

Per implementazione Postgres:

```sql
-- My groups
SELECT g.* FROM groups g
JOIN group_memberships gm ON gm.group_id = g.id
WHERE gm.user_id = auth.uid()
ORDER BY g.name;

-- Other groups (discovery)
SELECT g.* FROM groups g
WHERE NOT EXISTS (
  SELECT 1 FROM group_memberships gm
  WHERE gm.group_id = g.id AND gm.user_id = auth.uid()
)
  AND g.public_routes_count > 0  -- solo gruppi attivi
ORDER BY g.public_routes_count DESC, g.members_count DESC;
```

Per scaling: in seguito aggiungere `area` filter, full-text search su `name`/`description`.

---

## Mutations

Da questo overlay nessuna mutation diretta. Le mutations rilevanti:
- `requestGroupMembership(groupId)` — chiamata da `21_gruppo_home.md` (profilo non-membro)
- `setCurrentGroupId(groupId)` — state lato AppShell (non DB)

---

## Validation rules

Nessuna validazione lato qui (read-only display). Il context switch lato client è validato implicitamente.

---

## Policies (auth/RLS)

```sql
-- groups visible a TUTTI gli auth user (per discovery)
CREATE POLICY "auth users see all groups"
  ON groups FOR SELECT
  TO authenticated
  USING (true);

-- group_memberships visible solo se sei nel gruppo
CREATE POLICY "members see members"
  ON group_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships my
      WHERE my.user_id = auth.uid()
        AND my.group_id = group_memberships.group_id
    )
  );
```

**Eccezione**: dovremmo permettere a un non-membro di vedere `Profile` dei membri pubblici del gruppo (per "profilo gruppo")? Idea: Sì, solo dei membri con `Profile.isPublic = true`. Lato `21_gruppo_home.md` lo facciamo lato view non lato RLS sulla tabella memberships.

---

## HUMAN-DEFERRED

- **Creazione gruppo da utente**: chi può creare un gruppo? Tutti gli auth user? In MVP probabilmente sì. Mutation `createGroup({name, tag, crestColor, area})` → l'autore diventa `leader`. Da implementare in Fase 2.
- **Algoritmo "scopri altri"**: ora è semplice (publicRoutesCount DESC). In futuro:
  - Vicinanza geografica (Postgres earthdistance / PostGIS sul `area` decoded a lat/lng centroid)
  - Profili simili (matching su tag attività)
  - "Friend of friend": gruppi a cui appartengono utenti che segui
- **Cap membri per gruppo**: MVP no cap. In futuro forse `Group.maxMembers` per evitare gruppi giganteschi che diluiscono la cordata.
- **Gruppi "verificati"**: club ufficiali (Ducati Owners, BMW Motorrad Club). Badge "verified". Out of scope MVP.
- **Search bar**: per ora niente, lista è corta (4 gruppi seed). Da aggiungere quando ≥ 10 gruppi totali.

---

## Note implementative

- `ExploreGroupsOverlay` esiste in `AppShell.tsx` come componente locale. Quando crescerà si estrae in `src/features/gruppo/EsploraOverlay.tsx`.
- `GroupRow` riusabile sia per "i tuoi gruppi" sia per "altri", differenza solo nel `isMember` boolean.
- Quando si tap un gruppo non-membro: `setCurrentGroupId(g.id) + setScreen("gruppo.home")`. La home gestisce il "profilo gruppo" view.
- Tutti i Group hanno `isPrivate: true` in MVP. Il discovery pubblico mostra solo metadati (nome, area, membersCount, publicRoutesCount). I dettagli (membri, ride futuri) richiedono iscrizione.

---

## E2E coverage

Flussi in `70_flussi_e2e.md`:
- **F-11**: Esploro e richiedo iscrizione a un gruppo (parte da qui)

Test E2E per Fase 2:
1. Apri esplora → vedo i miei gruppi + altri pubblici
2. Tap un gruppo non-membro → cambio contesto, vado a gruppo.home, vedo "profilo gruppo"
3. Tap "Richiedi iscrizione" → GroupMembershipRequest creata, status pending
4. Riapri esplora → quel gruppo ora mostra "in attesa" (HUMAN-DEFERRED implementazione)
