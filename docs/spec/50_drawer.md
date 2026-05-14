# 50 · Drawer — Profilo · Eventi · Classifica · Impostazioni · Privacy

## Purpose

Hamburger drawer top-left dell'Header. Contiene le destinazioni "esplorative o personali" fuori dai 2 pillar core (IO + GRUPPO):

- **Profilo**: identità pubblica, stats, badge, moto (riusa `ProfiloScreen`)
- **Eventi**: eventi curati big — raduni, EICMA, track day (ex `mondo.eventi`, vedi `31_mondo_eventi.md`)
- **Classifica**: classifica percorsi della community (ex `mondo.classifica`, vedi `32_mondo_classifica.md`)
- **Impostazioni**: tema, lingua, unità, notifiche, default visibility
- **Privacy & Policy**: visibilità account, consensi, export dati, cancella account
- **Esci**: logout

**Note IA**: Eventi e Classifica vivono nel drawer (non tab) perché sono visite **occasionali esplorative**, non quotidiane. Il pillar MONDO è stato sciolto dopo iterazione UX: solo il Feed (visita frequente) è rimasto come tab core, dentro IO.

File implementazioni:
- Drawer container: `src/components/nav/HamburgerDrawer.tsx`
- Overlay che renderizza il contenuto destinazione: `DrawerOverlay` in `src/components/AppShell.tsx`
- Profilo: `src/features/profilo/ProfiloScreen.tsx`
- Impostazioni: `SettingsPlaceholder` (in AppShell.tsx, placeholder)
- Privacy: `PrivacyPlaceholder` (in AppShell.tsx, placeholder)

---

## Stati UI

| Stato | Trigger | Cosa cambia |
|-------|---------|-------------|
| `closed` (default) | nessuna interazione | drawer translateX(-100%), pointer-events: none |
| `open` | tap hamburger | drawer slide-in, overlay backdrop, ESC chiude |
| `destination-open` | tap voce drawer | `Overlay` viene popolato con la destinazione (Profilo/Settings/Privacy) → drawer si chiude |

---

## Display

### Drawer aside

Width 82% max 384px, slide da sinistra. Header con avatar + displayName + @username + close button. Lista voci sotto:

| Icona | Label | Description |
|-------|-------|-------------|
| user | Profilo | Identità pubblica, statistiche, badge |
| gear | Impostazioni | Tema, lingua, unità, notifiche |
| shield | Privacy & Policy | Visibilità, consensi, termini |
| log-out (danger color) | Esci | Termina la sessione |

Footer drawer: "Moto_App · v0.1 · prototipo UX"

### Profilo screen

Già definita in `ProfiloScreen.tsx`. Sezioni:
1. Hero: avatar + displayName + @username + città + bio
2. Stats: uscite, km totali, ore in sella
3. Badge guadagnati (grid 2 col)
4. Moto (riferimento al garage, tap → io.garage)
5. Footer: "Impostazioni e Privacy nel menu in alto"

### Impostazioni screen

Placeholder con 6 bullet:
- Tema: chiaro / scuro / auto
- Lingua: it / en
- Unità: metric / imperial
- Notifiche push e in-app
- Visibilità di default delle attività (private / followers / public)
- Auto-sync attivo

Da implementare con form vero in Fase 1-2.

### Privacy screen

Placeholder con 6 bullet:
- Profilo pubblico / privato
- Chi può vedere le mie attività
- Chi può commentare i miei percorsi
- Esporta i miei dati (CSV / JSON)
- Cancella account
- Termini di servizio · Privacy policy

---

## Read queries

```ts
// Profilo
getProfile(db, userId) → Profile
listMyMotorcycles(db, userId) → Motorcycle[]
listMyActivities(db, userId) → Activity[]
listFollowers/listFollowing(db, userId)
listUserBadges(db, userId)

// Impostazioni
getMyPreferences(db, userId) → UserPreferences | undefined
```

---

## Mutations

### Profilo

```ts
updateProfile(userId, {
  displayName?, bio?, avatarUrl?, accentColor?, city?, initials?
})
  → policy: auth.uid() = userId
  → validation: see below
  → side: nessuno

updateUsername(userId, newUsername)
  → check uniqueness
  → HUMAN-DEFERRED: vincolo "modificabile solo entro 7g dalla creazione"? (proposed in vecchia spec)
  → side: nessuno

uploadAvatar(userId, file) → avatarUrl
  → upload Supabase Storage avatars/{userId}.{ext}
  → update Profile.avatarUrl
```

### Impostazioni

```ts
updatePreferences(userId, fields) → UserPreferences
  → upsert (1:1 con userId)
  → side: se changed `defaultActivityVisibility`, future Activity create con questo default
```

### Privacy

```ts
setProfilePublic(userId, isPublic: boolean) → Profile
exportMyData(userId) → { downloadUrl, expiresAt }
  → async job che genera ZIP con profile.json + activities.json + photos/
  → email all'utente quando pronto OR download URL temporaneo
  → HUMAN-DEFERRED: timeout export (es. valid 7g)

requestAccountDeletion(userId, confirmPassword)
  → set Profile.deletedAt = now() (soft delete)
  → schedule hard-delete in 30g (cron job)
  → user può recoverare entro 30g via login
  → side: logout immediato
  → side: cascade soft-delete attività/moto/etc. (tutto soft)
  → side: hard-delete (al cron) di tutto + anonimizzazione comments/likes pubblici

cancelAccountDeletion(userId)
  → recoverable solo within 30g
  → clear deletedAt → account riattivato
```

### Logout

```ts
signOut(sessionId)
  → invalidate JWT / refresh token
  → clear local state
  → redirect a /login
```

---

## Validation rules

**updateProfile:**
- displayName 2-40 chars
- bio 0-500 chars
- accentColor: hex 6 chars
- city 0-100 chars
- initials 2-3 uppercase ASCII

**updateUsername:**
- regex `^[a-z0-9._]{3,24}$`
- unique nella tabella
- (HUMAN-DEFERRED) limit di cambi nel tempo

**updatePreferences:**
- theme ∈ ["light", "dark", "auto"]
- language ∈ ["it", "en"]
- units ∈ ["metric", "imperial"]
- visibility ∈ ["private", "followers", "public"]

**uploadAvatar:**
- mime image/jpeg|png|webp
- size ≤ 2 MB

**requestAccountDeletion:**
- confirmPassword matches account
- HUMAN-DEFERRED: re-confirm via email link?

---

## Policies (auth/RLS)

```sql
-- profiles
-- Read: tutti gli auth user vedono i profile (i `isPublic: false` hanno solo info minime)
CREATE POLICY "auth users see profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Update: self
CREATE POLICY "self update profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- user_preferences
CREATE POLICY "self CRUD preferences"
  ON user_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

Sui dettagli mostrati di `isPublic: false`:
- displayName + initials + accentColor visibili (per render in commenti/like)
- Bio, city, stats nascosti ai non-follower
- Attività `private` non visibili
- Attività `followers`: solo a follower
- Attività `public`: a tutti

Implementare lato view (RPC `get_profile_for_viewer(target_id, viewer_id)`).

---

## HUMAN-DEFERRED

- **Vincolo 7g username** (vecchia spec F-003): decidere se mantenere. Pro: previene squatting. Contro: friction se sbaglio username.
- **Account deletion grace period**: 30g è ragionevole? Strava ne ha 30. Decidere se mostrare countdown in UI.
- **Export dati GDPR**: deve includere foto, GPX, commenti, like. JSON o ZIP? Decidere format.
- **Soft delete cascade**: cosa fare di:
  - Activity pubbliche: anonimizzare (`ownerId = "deleted_user"`)? Cancellare? Trasferire a admin? Probabilmente anonimizzare e mantenere visibili (le strade sono utili agli altri).
  - GroupMembership: hard-delete, decrementa `Group.membersCount`. Se era leader → prompt durante deletion.
  - Commenti pubblici: keep, anonimizzare authorId.
- **2FA**: Supabase Auth supporta TOTP. Aggiungere in Fase 5-6.
- **Magic link login** vs password: in MVP entrambi (Supabase default). Decidere se rimuovere password e tenere solo magic link (più sicuro, più user-friendly).
- **Theme system**: dark default. Light theme richiede CSS variables aggiornate. Quando arriverà: ridefinire tutti i `var(--ink)`, `var(--bg)` etc.
- **Notifiche push web**: Web Push API. Solo Chrome/Android in MVP (iOS supporta solo da iOS 16.4 + PWA installata). Implementare in Fase 5.

---

## Note implementative

- HamburgerDrawer ha already proper ESC handler + backdrop click close.
- ProfiloScreen è in `src/features/profilo/` (movato dopo cleanup).
- SettingsPlaceholder e PrivacyPlaceholder sono dentro AppShell.tsx — placeholder buoni per il prototipo. Quando arriva il form vero, estrarli in `src/features/settings/` e `src/features/privacy/`.
- Da Header (top-left) il bottone hamburger apre `setDrawerOpen(true)`. Tap su una voce → `handleDrawerNavigate(dest)` → `setOverlay({ kind: dest })` → render `DrawerOverlay`.

---

## E2E coverage

Flussi in `70_flussi_e2e.md`:
- **F-01**: Onboarding nuovo rider (compila Profile + Preferences dal drawer)
- **F-20**: Apro inbox notifiche (notification bell nel header, non drawer ma collegato)
- **F-21**: Logout / cancello account

Test E2E per Fase 1:
1. Tap hamburger → drawer slides in
2. Tap "Impostazioni" → drawer chiude, overlay impostazioni si apre
3. Cambio tema → applicato, persistito in UserPreferences
4. Tap "Profilo" → vedo le mie stats
5. Tap "Esci" → logout, redirect /login
