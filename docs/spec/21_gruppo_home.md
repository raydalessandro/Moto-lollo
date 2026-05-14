# 21 · gruppo.home — Dashboard gruppo

## Purpose

Pagina principale del pillar GRUPPO. Doppia identità:

- **Member view**: dashboard del gruppo attivo (prossima ride, membri, percorsi proposti, admin queues se admin).
- **Non-member view** (entrato via Esplora): "profilo gruppo" pubblico — chi sono, prossima ride se confermata, bottone "Richiedi iscrizione".

Il discriminante è `isMember`, passato come prop da AppShell.

File implementazione: `src/features/gruppo/GruppoHomeScreen.tsx` (con sub-component `MemberDashboard` e `NonMemberProfile`).

---

## Stati UI

### Member states

| Stato | Trigger | Cosa cambia |
|-------|---------|-------------|
| `member-loaded` | default | dashboard completa |
| `member-admin` | isAdmin | aggiunge sezione "Da approvare" (proposte + iscrizioni count) |
| `member-no-rides` | no ride confermati | sezione "Prossima uscita" → "Nessuna uscita confermata. Vai a Pianifica per proporre" |

### Non-member states

| Stato | Trigger | Cosa cambia |
|-------|---------|-------------|
| `non-member-discoverable` | gruppo pubblico, niente request | "Richiedi iscrizione" attivo |
| `non-member-pending` | request pending | banner "Richiesta inviata, in attesa" + button disabled |
| `non-member-rejected` | request rejected | banner "Richiesta rifiutata" + cooldown 30g |

---

## Display

### Member view

Layout:
1. **Hero**: crest + group name + tag + area + membersCount + foundedAt
2. **Stat strip**: 3 numeri (uscite totali del gruppo, km totali cumulati, percorsi pubblicati)
3. **Prossima ride card** (se exists):
   - Title, meetupText, startAt countdown, confirmedCount/invitedCount
   - Quick action: "Confermo" (going)
4. **Da approvare card** (solo se admin, solo se exists):
   - Counter proposte pending + iscrizioni pending
   - Tap → vai a `gruppo.pianifica` AdminQueues
5. **Membri strip**: avatars dei membri con role badge (leader/admin/member)
6. **Percorsi del gruppo strip**: ultimi PublishedRoute con `scope: "group"`
7. **Footer**: bottone "Esci dal gruppo" (con conferma)

### Non-member view ("profilo gruppo")

Layout:
1. **Hero**: crest + group name + tag + area + foundedAt
2. **Pubblico card**:
   - "{membersCount} membri · {publicRoutesCount} percorsi pubblici condivisi"
   - Lista membri pubblici (Profile con `isPublic: true`)
3. **Prossima ride pubblica** (solo se `status: "confermata"`, **anche per non-member**):
   - Informativa: "Sabato 12 maggio · {meetupText}"
   - (no RSVP buttons, sei ospite)
4. **Bottoni**: `Richiedi iscrizione` (primary) / `← torna a Esplora` (secondary)

---

## Read queries

```ts
// Member view
getGroup(db, groupId) → Group
listGroupMembers(db, groupId) → { profile, role }[]
getNextConfirmedRide(db, groupId, nowIso) → GroupRide | undefined
isAdminOfGroup(db, userId, groupId) → boolean
listMembershipRequests(db, groupId, "pending") → GroupMembershipRequest[]  // se admin
listRouteProposals(db, groupId, "pending") → RouteProposal[]  // se admin
listPublishedRoutesByScope(db, "group")
  .filter(p => p.publishedToGroupId === groupId)
  .slice(0, 5)  // ultimi 5
// Stats aggregati
const groupActivities = ... activities di tutti i membri durante GroupRide del gruppo

// Non-member view
getGroup(db, groupId) → Group
listGroupMembers(db, groupId).filter(m => m.profile.isPublic)
getNextConfirmedRide(db, groupId, nowIso) → GroupRide | undefined  // solo se confermata
listMyMembershipRequestFor(db, userId, groupId) → GroupMembershipRequest | undefined
  // per stato "pending"
```

### RPC ottimizzata

```sql
-- Per member
CREATE FUNCTION group_home_member(p_group_id uuid, p_user_id uuid)
RETURNS json AS $$
SELECT json_build_object(
  'group', (SELECT row_to_json(g) FROM groups g WHERE g.id = p_group_id),
  'members', (SELECT json_agg(json_build_object('profile', p, 'role', gm.role))
              FROM group_memberships gm JOIN profiles p ON p.id = gm.user_id
              WHERE gm.group_id = p_group_id),
  'next_ride', (SELECT row_to_json(r) FROM group_rides r
                WHERE r.group_id = p_group_id
                  AND r.status = 'confermata'
                  AND r.start_at > now()
                ORDER BY r.start_at LIMIT 1),
  'is_admin', EXISTS (SELECT 1 FROM group_memberships
                      WHERE group_id = p_group_id AND user_id = p_user_id
                        AND role IN ('admin', 'leader')),
  'pending_proposals_count', (SELECT count(*) FROM route_proposals
                              WHERE group_id = p_group_id AND status = 'pending'),
  'pending_requests_count', (SELECT count(*) FROM group_membership_requests
                              WHERE group_id = p_group_id AND status = 'pending'),
  'group_routes', (SELECT json_agg(pr ORDER BY pr.published_at DESC)
                   FROM (SELECT * FROM published_routes
                         WHERE published_to_group_id = p_group_id
                         ORDER BY published_at DESC LIMIT 5) pr)
)
$$ LANGUAGE sql STABLE;
```

---

## Mutations

```ts
requestGroupMembership(groupId, userId)
  → insert GroupMembershipRequest(status: "pending")
  → side: Notification a tutti gli admin del gruppo (kind: "follow" riusato)
  → validation: non già membro, non già request pending

leaveGroup(groupId, userId)
  → delete GroupMembership
  → side: Group.membersCount--
  → side: rimuove RSVP futuri (cascade)
  → policy: leader non può lasciare senza promuovere un altro a leader prima
  → HUMAN-DEFERRED: confirm modal con "questo cancella il tuo posto in N ride confermate"

promoteToAdmin(membershipId, leaderUserId)
  → update GroupMembership.role = "admin"
  → policy: solo leader può promuovere

demoteAdmin(membershipId, leaderUserId)
  → update role = "member"
  → policy: solo leader, non self-demote

transferLeadership(toMembershipId, leaderUserId)
  → swap: current leader → admin, target → leader
  → policy: solo current leader, target deve essere già admin

removeMember(membershipId, adminUserId, reason?)
  → delete GroupMembership
  → policy: admin/leader, can't remove leader, can't self-remove (use leaveGroup)
  → side: Notification al removed user

cancelMembershipRequest(requestId)
  → delete request (only own pending)
```

---

## Validation rules

**requestGroupMembership:**
- User authenticated
- Not already member
- No existing request status="pending" for same (groupId, userId)
- If rejected in last 30g → cooldown (return 403)

**leaveGroup:**
- Authenticated
- User is member
- If role="leader": block, must transferLeadership first

**promoteToAdmin / demoteAdmin / transferLeadership:**
- Auth user has appropriate role
- Target user is member
- HUMAN-DEFERRED: vincoli sul numero massimo di admin per gruppo

---

## Policies (auth/RLS)

```sql
-- group_memberships
-- Read: members can see other members
CREATE POLICY "members see members" ...

-- Insert: solo da approveMembershipRequest workflow (handled in RPC)
-- Delete (leaveGroup): self only
CREATE POLICY "self can leave"
  ON group_memberships FOR DELETE
  USING (user_id = auth.uid());

-- Update (role change): solo leader
CREATE POLICY "leader can change roles"
  ON group_memberships FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM group_memberships my
    WHERE my.user_id = auth.uid()
      AND my.group_id = group_memberships.group_id
      AND my.role = 'leader'
  ));

-- group_membership_requests
CREATE POLICY "users see own + admins see all"
  ON group_membership_requests FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_id = group_membership_requests.group_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'leader')
    )
  );
```

---

## HUMAN-DEFERRED

- **Rejected cooldown 30g**: punissce "spam dell'iscrizione"? Forse troppo. Decidere lunghezza (7g? 30g? configurable per gruppo?).
- **Group photo**: ora solo crest + tag. Vorremmo immagine cover? Mockup HTML aveva qualcosa. Aggiungere campo `coverPhotoUrl`?
- **"Group rules" / descrizione lunga**: ora solo `description` corta. Markdown editor per regole del gruppo?
- **Invito diretto via link** (alternativa a richiesta open): admin genera `/join/<token>?expires=...` → chi clicca diventa member senza approvazione manuale. Spec separata in `docs/spec/95_invitations.md`? Decidere se per MVP.
- **Cap "1 leader per gruppo"**: se il leader perde l'account (cancellato), il gruppo resta senza leader. Backup: il leader può transferire prima di cancellarsi, oppure il primo admin in seniority subentra.
- **Stats by gruppo**: km totali, uscite totali, "miglior rider del mese". Out of MVP, eventuale gamification.

---

## Note implementative

- `MemberDashboard` e `NonMemberProfile` sono nel file unico `GruppoHomeScreen.tsx`, sub-component locali.
- Switching member vs non-member: via prop `isMember: boolean` passata da AppShell.
- Quando un non-member tap "Richiedi iscrizione" e questa viene approvata, l'utente passa a member view al next render (refresh dati).

---

## E2E coverage

Flussi in `70_flussi_e2e.md`:
- **F-11**: non-member tap "Richiedi iscrizione" → GroupMembershipRequest
- **F-12**: admin approva da `gruppo.pianifica` → user diventa member

Test E2E per Fase 2:
1. Member apre → vedo prossima ride + membri + stats
2. Admin → vedo card "Da approvare" con counters
3. Non-member entra via esplora → vedo profilo + bottone "Richiedi iscrizione"
4. Submit request → bottone diventa "in attesa"
5. Admin approva → next refresh: membro pieno
