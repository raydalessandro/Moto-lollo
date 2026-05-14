# 22 · gruppo.pianifica — Bacheca eventi gruppo

## Purpose

Schermo centrale per la pianificazione delle uscite di un gruppo. È **bicipite**: la stessa entry-point ha due UI radicalmente diverse a seconda che l'utente sia **admin** o **member** del gruppo corrente.

- **Admin view (`AdminQueues`)**: code di moderazione (proposte percorsi pending + iscrizioni pending) + lista ride esistenti modificabili.
- **Member view**: lista ride read-only con RSVP + bacheca commenti + "Proponi un percorso" form.

File implementazione: `src/features/gruppo/PianificaScreen.tsx`.

---

## Stati UI

| Stato | Trigger | Cosa cambia |
|-------|---------|-------------|
| `member-no-rides` | nessun ride confermato/proposto | empty state + "Proponi un percorso" CTA primario |
| `member-with-rides` | ≥1 ride | lista cards RideBoardCard + tab "Tutte/Confermate/Proposte" |
| `admin-no-queues-no-rides` | gruppo vuoto | empty state admin "Nessuna richiesta, nessuna proposta. Crea il primo evento." |
| `admin-with-queues` | proposte o iscrizioni pending | tabs `AdminQueues`: Proposte percorsi (N) / Iscrizioni (N) |
| `admin-creating-ride` | tap "Crea ride" o "Approva proposta" | form modale (titolo, meetup text, startAt, plannedRouteId opzionale) |

Il discriminante è `isAdminOfGroup(userId, currentGroupId)`. Vedi `src/components/AppShell.tsx` che passa `isMember` come prop e PianificaScreen che chiede a `useQuery` lo status admin.

---

## Display

### Admin view (AdminQueues)

**Tab 1 — Proposte percorsi (N pending)**
- Card per ogni `RouteProposal.status === "pending"`:
  - Header: proponente (avatar + nome) + data proposta
  - Body: titolo `plannedRoute`, distanceKm, durata, note del proponente
  - Footer: bottoni `[Approva] [Rifiuta]`
  - Tap "Approva" → form pre-compilato per crear GroupRide
  - Tap "Rifiuta" → textarea per motivo + invio

**Tab 2 — Iscrizioni (N pending)**
- Card per ogni `GroupMembershipRequest.status === "pending"`:
  - Header: richiedente (avatar + nome + città) + data richiesta
  - Body: stats brevi (es. "12 attività registrate · 1234 km totali") — nice-to-have, decidere
  - Footer: `[Approva] [Rifiuta]`
  - Tap "Rifiuta" → conferma (niente motivo richiesto)

**Sotto le code**: lista `GroupRide` del gruppo (tutti i status), con possibilità per admin di:
- Editare (`Modifica`): cambiare title, meetupText, startAt
- Annullare (`Annulla evento`): status → `annullata`
- Designare navigatore (vedi `23_gruppo_cordata.md` per UI)

### Member view

**Toolbar in alto**:
- Tabs filtro: `Tutte` (default) / `Confermate` / `Proposte`
- Bottone primario `Proponi un percorso`

**Lista**: cards `RideBoardCard` per ogni ride. Per ognuna:
- Header: title + status badge (confermata/proposta/in-corso/completata/annullata)
- Meta: meetup text, data/ora, distance, duration
- Counter: `confirmedCount` / `invitedCount`
- **RSVP buttons**: 3 chip mutuamente esclusive: `Vengo` (going) / `Forse` (maybe) / `No` (no)
- **Bacheca commenti** (espandibile): ultimi 3 commenti + composer "Scrivi in bacheca…"

### Form "Proponi un percorso" (member)

- Picker `PlannedRoute` dal mio archivio (`listMyPlannedRoutes(userId)`)
- Textarea note opzionale ("perché ti piace, quando lo faresti…")
- Submit → mutation submitRouteProposal

### Form "Approva proposta → crea ride" (admin)

- Pre-filled da `plannedRoute` (distance, duration)
- Editable: `title`, `meetupText`, `startAt` (date+time picker)
- Submit → approveRouteProposal (combina update proposal + create GroupRide)

---

## Read queries

```ts
// Comuni
listGroupRides(db, groupId) → GroupRide[]
listRideRSVPs(db, rideId) → GroupRideRSVP[]
getMyRideRSVP(db, rideId, userId) → GroupRideRSVP | undefined

// Solo admin
isAdminOfGroup(db, userId, groupId) → boolean
listRouteProposals(db, groupId, "pending") → RouteProposal[]
listMembershipRequests(db, groupId, "pending") → GroupMembershipRequest[]
getPlannedRoute(db, plannedRouteId) → PlannedRoute  // per renderizzare proposta
getProfile(db, userId) → Profile  // per ogni proponente / richiedente

// Solo member
listMyPlannedRoutes(db, userId) → PlannedRoute[]  // per picker proponi
listBoardComments(db, rideId) → RideBoardComment[]
```

### Pagination
Per ora in-memory. Quando un gruppo avrà ≥ 50 rides:
- Paginate `listGroupRides` con cursor su `startAt`
- "Storico" → infinite scroll
- "Prossime" → primo 10 sempre fetched

---

## Mutations

### Member-side

```ts
setRideRSVP(rideId, userId, value: "going" | "maybe" | "no")
  → upsert GroupRideRSVP (unique on rideId+userId)
  → side: GroupRide.confirmedCount aggiornato (count "going")
  → side: se "no"→"going" e ride is <24h via, notify organizer

submitRouteProposal(groupId, proposedBy, plannedRouteId, note?)
  → insert RouteProposal (status: "pending")
  → side: Notification a tutti gli admin del gruppo

submitBoardComment(rideId, userId, text)
  → insert RideBoardComment
  → side: Notification a partecipanti del ride (kind: "comment")
```

### Admin-side

```ts
approveMembershipRequest(requestId, adminUserId)
  → update GroupMembershipRequest.status = "approved"
  → side: insert GroupMembership(role: "member")
  → side: Group.membersCount++
  → side: Notification al richiedente

rejectMembershipRequest(requestId, adminUserId, reason?)
  → update status = "rejected", reviewedBy, reviewedAt
  → side: Notification al richiedente (con motivo se fornito)

approveRouteProposal(proposalId, adminUserId, rideFields: {
  title: string, meetupText: string, startAt: ISODate
})
  → update RouteProposal.status = "approved"
  → side: insert GroupRide (with plannedRouteId from proposal, status: "confermata")
  → side: Notification al proponente + a tutti i member (kind: "ride_confirmed")

rejectRouteProposal(proposalId, adminUserId, reason)
  → update status = "rejected", reviewedBy, reviewedAt, note (reason)
  → side: Notification al proponente

createGroupRide(groupId, adminUserId, fields)
  → insert GroupRide(status: "confermata"), plannedRouteId optional
  → side: Notification ai member (kind: "ride_confirmed")

updateGroupRide(rideId, adminUserId, fields)
  → only updatable: title, meetupText, startAt, navigatorUserId
  → side: se startAt cambia → Notification ai confermati (re-conferma RSVP?)

cancelGroupRide(rideId, adminUserId, reason?)
  → update status = "annullata"
  → side: Notification ai confermati (kind: "ride_reminder", body con "annullata")

setRideNavigator(rideId, navigatorUserId)
  → update GroupRide.navigatorUserId
  → side: Notification al navigatore designato
  → validation: navigatorUserId ha RSVP="going" per questo ride
```

---

## Validation rules

**RSVP:**
- User must be member of `ride.groupId`
- Cannot RSVP to `status: "annullata" | "completata"` rides

**Submit proposal:**
- Proposer must be member of group
- `plannedRouteId.ownerId === proposedBy` (non puoi proporre roba degli altri)
- Same `plannedRouteId` not already pending in same group (idempotency)

**Approve proposal:**
- Admin only
- Proposal must be `status: "pending"`
- `startAt > now()` (no creare ride nel passato)
- `startAt < now() + 365d` (sanity)

**Approve membership:**
- Admin only
- Request must be `status: "pending"`
- Side effect creates membership: must not already exist for same (groupId, userId) — RACE WARNING, lock o ON CONFLICT DO NOTHING

**Cancel ride:**
- Admin only
- Cannot cancel `status: "in-corso"` (devi prima fermarla manualmente)
- Cannot cancel `status: "completata"` (è storia)

**Submit board comment:**
- Member of group
- `text` length 1–500
- Rate limit 10/min per user

---

## Policies (auth/RLS)

| Operazione | Member | Admin | Non-member |
|-----------|--------|-------|------------|
| read GroupRide | ✅ | ✅ | ❌ (anche `confermata` solo per discovery in `21_gruppo_home.md` non-member view, decidere) |
| read RouteProposal | ❌ | ✅ | ❌ |
| read GroupMembershipRequest | own only | ✅ | own only (può vedere la propria pending) |
| read RideBoardComment | ✅ | ✅ | ❌ |
| insert RSVP | ✅ (self) | ✅ (self) | ❌ |
| insert RouteProposal | ✅ | ✅ | ❌ |
| approve proposal | ❌ | ✅ | ❌ |
| approve membership | ❌ | ✅ | ❌ |
| insert RideBoardComment | ✅ | ✅ | ❌ |
| create/update/cancel GroupRide | ❌ | ✅ | ❌ |
| setRideNavigator | ❌ | ✅ | ❌ |

Tradotto in Postgres RLS (esempio per `route_proposals`):
```sql
-- Read: solo admin del gruppo o il proponente stesso
CREATE POLICY "members read own proposals, admins read all"
  ON route_proposals FOR SELECT
  USING (
    proposed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = route_proposals.group_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('admin', 'leader')
    )
  );

-- Insert: member del gruppo
CREATE POLICY "members can propose"
  ON route_proposals FOR INSERT
  WITH CHECK (
    auth.uid() = proposed_by
    AND EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = route_proposals.group_id
        AND gm.user_id = auth.uid()
    )
  );

-- Update: solo admin (per change status)
CREATE POLICY "admins moderate"
  ON route_proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = route_proposals.group_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('admin', 'leader')
    )
  );
```

---

## HUMAN-DEFERRED

- **Admin che rifiuta una proposta senza motivo**: notifica al proponente "Rifiutata" senza testo. Decidere se motivo è obbligatorio (più friction) o opzionale (UX più fluida).
- **Cosa fare se un'iscrizione viene approvata DOPO che il gruppo è "pieno"?** In MVP nessun cap. In futuro decidere `Group.maxMembers` e bloccare quando si raggiunge.
- **Modifica proposta da parte del proponente**: può editare la sua proposta pending o no? Decisione: **no, deve cancellarla e re-proporre**. Più semplice da modellare.
- **Bacheca commenti: edit/delete proprio?** Tipico pattern: posso editare entro 5 min, cancellare sempre il mio. Admin può cancellare quelli altrui.
- **Cordata leader vs ride navigator**: se admin designa un navigatore, è quel navigatore l'unico che apre turn-by-turn. Ma chi inizia formalmente la cordata (transition status → "in-corso")? Decisione: server cron al `startAt`, oppure trigger su `setRideRSVP` quando ≥ 2 going + tempo ≥ start. Da decidere in Fase 4.
- **Multi-admin**: 2 admin che approvano la stessa proposta in race condition? `UPDATE ... WHERE status = 'pending' RETURNING id` per atomicità.
- **Calendario integration**: export `.ics` per "Vengo" RSVP → aggiunge l'evento al calendario nativo. Nice-to-have, fuori scope MVP.

---

## Note implementative

- Schema attuale (`src/features/gruppo/PianificaScreen.tsx`):
  - Component principale fa lo split `amAdmin` → renderizza `<AdminQueues>` o `<MemberView>`.
  - `RideBoardCard` con `BacheCardComposer` per i commenti.
  - `ProposeRouteCard` con picker dei PlannedRoute miei.
- Le mutations `approveMembershipRequest` etc. **non sono ancora wirate** nel prototipo (è tutto seed). I bottoni esistono ma sono no-op. Da implementare in Fase 2.
- Legacy spec utile:
  - `docs/sources/spec_bundle.zip/spec/10_planning/L0_architecture.md` per pattern di GroupRide lifecycle.
  - `docs/sources/spec_bundle.zip/spec/07_community/L05_interfaces.md` per pattern di moderation.

---

## E2E coverage

Flussi in `70_flussi_e2e.md`:
- **F-12**: Admin approva richiesta iscrizione
- **F-13**: Member propone percorso al gruppo
- **F-14**: Admin valida proposta → crea GroupRide
- **F-15**: Member conferma RSVP

Test E2E per Fase 2:
1. Come admin: vedo coda proposte → approvo una → diventa GroupRide confermata
2. Come admin: vedo coda iscrizioni → approvo → user diventa member, counter++
3. Come member: tap "Proponi" → seleziono planned route → submit → status pending
4. Come member: tap "Vengo" su ride → confirmedCount++
5. Come member: scrivo in bacheca → appare immediatamente
