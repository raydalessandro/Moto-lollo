# 60 · Domain model

Tutte le entità sono in `src/types/domain.ts`. Sotto: scopo + campi + denormalized counters + relazioni. Tipi `UUID = string`, `ISODate = string ISO 8601`.

## Indice entità

| # | Entità | Cardinalità | Note |
|---|--------|-------------|------|
| 01 | `Profile` | 1 per utente | identità pubblica |
| 02 | `UserPreferences` | 1 per utente | impostazioni private |
| 03 | `Motorcycle` | N per utente | una è `isPrimary: true` |
| 04 | `MaintenanceRecord` | N per moto | log interventi |
| 05 | `Document` | N per utente/moto | assicurazione, bollo, revisione, patente |
| 06 | `Activity` | N per utente | uscite registrate |
| 07 | `TrackPoint` | N per activity | embedded array `trackPoints` |
| 08 | `ActivityMedia` | N per activity | foto |
| 09 | `Waypoint` | N per route | embedded array |
| 10 | `PlannedRoute` | N per utente | percorsi progettati |
| 11 | `Group` | N globale | tutti privati moderati in MVP |
| 12 | `GroupMembership` | N per gruppo×utente | role: leader/admin/member |
| 13 | `GroupMembershipRequest` | N per gruppo | iscrizioni pending |
| 14 | `RouteProposal` | N per gruppo | proposte member → admin |
| 15 | `RideBoardComment` | N per ride | bacheca commenti |
| 16 | `GroupRide` | N per gruppo | uscite pianificate |
| 17 | `GroupRideRSVP` | N per ride×utente | going/maybe/no |
| 18 | `PublishedRoute` | N per utente | percorsi pubblicati (scope public o group) |
| 19 | `SavedRoute` | N per utente | percorsi salvati da feed |
| 20 | `RouteComment` | N per published route | commenti pubblici |
| 21 | `RouteLike` | N per published route×utente | unico per coppia |
| 22 | `FollowRelationship` | N | follow asimmetrici |
| 23 | `PublicEvent` | N globale | eventi curati big |
| 24 | `EventRSVP` | N per evento×utente | interested/going |
| 25 | `Segment` | N globale | **legacy** — non usato in MVP Mondo |
| 26 | `SegmentAttempt` | N per segment×utente | legacy |
| 27 | `Badge` | N globale | catalogo |
| 28 | `UserBadge` | N per utente | guadagnati |
| 29 | `Challenge` | N globale | sfide periodiche (placeholder) |
| 30 | `SafetyContact` | N per utente | contatti emergenza |
| 31 | `LiveSession` | N per attività | live sharing (placeholder) |
| 32 | `Notification` | N per utente | inbox |

---

## 01 · Profile

Identità pubblica dell'utente.

```ts
{
  id: UUID;
  username: string;        // @handle, unique
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  initials: string;        // 2-3 caratteri fallback se no avatar
  accentColor?: string;    // colore brand utente
  role: "user" | "admin";  // admin = sysadmin app, NON admin gruppo
  isPublic: boolean;       // se false → solo follower vedono attività
  city?: string;
  createdAt: ISODate;
}
```

**Vincoli:**
- `username` unique, regex `^[a-z0-9._]{3,24}$`
- `initials` 2-3 caratteri uppercase, derivati da displayName se vuoto

**Read by:** drawer Profilo, Feed cards, Cordata avatars, ovunque serva mostrare un utente.

---

## 02 · UserPreferences

Impostazioni private dell'utente. 1 record per `userId`.

```ts
{
  userId: UUID;             // PK
  theme: "light" | "dark" | "auto";
  language: "it" | "en";
  units: "metric" | "imperial";
  notificationsEnabled: boolean;
  defaultActivityVisibility: "private" | "followers" | "public";
  autoSyncEnabled: boolean;
}
```

**Write paths:** drawer Impostazioni.

---

## 03 · Motorcycle

Moto dell'utente. Una può essere `isPrimary: true` (visibile in Home + scelta default per Activity).

```ts
{
  id: UUID;
  ownerId: UUID;
  name: string;            // es. "La rossa"
  brand: string;           // Ducati
  model: string;           // Panigale V4
  year?: number;
  engineCc?: number;
  color?: string;
  photoUrl?: string;
  totalKm: number;         // counter cumulativo
  isPrimary: boolean;
  purchasedAt?: ISODate;
}
```

**Counter:** `totalKm` = somma `Activity.distanceKm` dove `motorcycleId = this.id`. Aggiornato lato back.

---

## 04 · MaintenanceRecord

Intervento di manutenzione su una moto.

```ts
{
  id: UUID;
  motorcycleId: UUID;
  kind: "tagliando" | "gomme" | "catena" | "pastiglie" | "olio" | "altro";
  date: ISODate;
  kmAtService: number;
  notes?: string;
  costEur?: number;
}
```

---

## 05 · Document

Documento con scadenza (assicurazione, bollo, revisione, patente).

```ts
{
  id: UUID;
  ownerId: UUID;
  motorcycleId?: UUID;     // patente è solo dell'utente, altri sono per-moto
  kind: "assicurazione" | "bollo" | "revisione" | "patente";
  expiresAt: ISODate;
  notes?: string;
}
```

**Reminder:** Home mostra documenti che scadono ≤ 30 giorni.

---

## 06 · Activity

Una uscita registrata. Può derivare da tracking GPS oppure essere creata manualmente.

```ts
{
  id: UUID;
  ownerId: UUID;
  motorcycleId?: UUID;
  groupRideId?: UUID;      // se l'uscita era parte di un GroupRide
  startedAt: ISODate;
  endedAt: ISODate;
  durationSeconds: number;
  distanceKm: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  elevationGainM?: number;
  polylineSeed?: number;   // seed per disegno SVG procedurale nel prototipo
  trackPoints?: TrackPoint[]; // embedded, opzionale (compressione lato back)
  title: string;
  notes?: string;
  tags: string[];
  visibility: Visibility;  // private | followers | public
  mediaIds: UUID[];        // riferimenti a ActivityMedia
  publishedRouteId?: UUID; // se l'utente l'ha pubblicato in Mondo/Gruppo
}
```

**Track points:** nel back consigliato store separato (`activity_track_points`) con compressione (delta + polyline encoding). Vedi `docs/sources/spec/04_tracking/*`.

---

## 07 · TrackPoint

Punto GPS embedded.

```ts
{ t: number;      // millis since epoch o offset da startedAt
  lat: number; lon: number;
  speed?: number;
  ele?: number;   // elevazione
  acc?: number; } // accuracy stimata
```

---

## 08 · ActivityMedia

Foto/video attaccati a un'activity.

```ts
{
  id: UUID;
  activityId: UUID;
  storageUrl: string;
  caption?: string;
  takenAt: ISODate;
  status: "uploaded" | "uploading" | "failed";
}
```

---

## 09 · Waypoint (embedded)

```ts
{ lat: number; lon: number; label?: string; }
```

---

## 10 · PlannedRoute

Percorso progettato dall'utente (da editor manuale, da GPX import, o da "naviga"). Non è ancora un'Activity. Vive in `io.mappa`.

```ts
{
  id: UUID;
  ownerId: UUID;
  title: string;
  notes?: string;
  waypoints: Waypoint[];
  polylineSeed?: number;
  distanceKm: number;
  estimatedDurationMin: number;
  visibility: Visibility;  // sempre "private" al momento della creazione
  tags: string[];
  createdAt: ISODate;
}
```

**Per pubblicare** un PlannedRoute → si crea un `PublishedRoute` con `sourceType: "planned_route"`, `sourceId: plannedRoute.id`.

---

## 11 · Group

Gruppo privato moderato. In MVP `isPrivate: true` sempre.

```ts
{
  id: UUID;
  slug: string;            // url-safe handle
  name: string;
  tag: string;             // 2-3 chars per crest (es. "MG" per Moto Garda)
  crestColor: string;      // hex
  description?: string;
  membersCount: number;    // denormalized
  foundedAt: ISODate;
  isPrivate: boolean;      // always true in MVP
  area?: string;           // zona geografica, visibile ai non-membri
  publicRoutesCount: number; // denormalized
}
```

**Visibility logic:**
- Non-membro vede: `name`, `tag`, `crestColor`, `area`, `membersCount`, `publicRoutesCount`, lista membri pubblici, prossima ride (se `confermata`), percorsi `scope: "group"` resi pubblici.
- Membro vede tutto inclusa bacheca, proposte percorsi, RSVP, navigatore designato.

---

## 12 · GroupMembership

Relazione utente×gruppo con ruolo.

```ts
{
  id: UUID;
  groupId: UUID;
  userId: UUID;
  role: "leader" | "admin" | "member";
  joinedAt: ISODate;
}
```

**Ruoli:**
- `leader`: 1 per gruppo, il fondatore. Eredita capacità admin + un badge.
- `admin`: N per gruppo, gestiscono iscrizioni / proposte / promote-to-public.
- `member`: tutti gli altri, sola lettura + propose + comment + RSVP.

**HUMAN-DEFERRED:** in MVP seed Ray è admin di Garda. Promotion in prod richiede workflow (richiesta + accept dell'admin senior).

---

## 13 · GroupMembershipRequest

Richiesta di iscrizione a un gruppo privato.

```ts
{
  id: UUID;
  groupId: UUID;
  userId: UUID;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: UUID;
  reviewedAt?: ISODate;
  createdAt: ISODate;
}
```

**Side effects on approve:** crea `GroupMembership` con `role: "member"`. Incrementa `Group.membersCount`. Crea notification al user.

---

## 14 · RouteProposal

Un member propone un suo `PlannedRoute` al gruppo.

```ts
{
  id: UUID;
  groupId: UUID;
  proposedBy: UUID;        // userId del proponente
  plannedRouteId: UUID;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: UUID;
  reviewedAt?: ISODate;
  note?: string;           // motivo rifiuto o nota proposta
  createdAt: ISODate;
}
```

**Side effects on approve:** admin può creare un `GroupRide` dalla proposta. La proposta resta nel log con `status: "approved"` ma diventa "consumata" se collegata a un ride.

---

## 15 · RideBoardComment

Bacheca commenti di un evento gruppo.

```ts
{
  id: UUID;
  groupRideId: UUID;
  authorId: UUID;
  text: string;
  createdAt: ISODate;
}
```

**Visibility:** solo membri del gruppo. Non sostituisce la cordata chat (che è realtime, in-ride).

---

## 16 · GroupRide

Uscita pianificata da un gruppo.

```ts
{
  id: UUID;
  groupId: UUID;
  plannedRouteId?: UUID;   // route source (da una proposal approvata)
  title: string;
  meetupText: string;
  startAt: ISODate;
  distanceKm: number;
  estimatedDurationMin: number;
  status: "proposta" | "confermata" | "in-corso" | "completata" | "annullata";
  proposedBy: UUID;
  activityIds: UUID[];     // activities di partecipanti collegate
  invitedCount: number;    // denormalized
  confirmedCount: number;  // denormalized: count RSVP where value="going"
  navigatorUserId?: UUID;  // l'utente che apre turn-by-turn durante la cordata
}
```

**Status lifecycle:**
```
proposta → confermata (admin conferma data/luogo)
        → annullata (admin cancella)
confermata → in-corso (al `startAt`, automatico server-side)
           → annullata
in-corso → completata (al fine partita, manuale o auto-timeout)
```

**Navigator:** l'admin designa un member tra chi ha confermato. Solo lui ha la turn-by-turn fullscreen. Gli altri vedono lo screen Cordata.

---

## 17 · GroupRideRSVP

```ts
{
  id: UUID;
  groupRideId: UUID;
  userId: UUID;
  value: "going" | "maybe" | "no";
  respondedAt: ISODate;
}
```

**Unique:** (`groupRideId`, `userId`). Update on resubmit.

---

## 18 · PublishedRoute

Un percorso condiviso. Può derivare da `Activity` (l'utente pubblica la sua uscita) o da `PlannedRoute` (l'utente pubblica un percorso progettato).

```ts
{
  id: UUID;
  sourceType: "activity" | "planned_route";
  sourceId: UUID;          // riferimento all'entità source
  ownerId: UUID;
  title: string;
  coverText?: string;      // testo evocativo per card feed
  heroColor?: string;
  distanceKm: number;
  durationMin?: number;
  area?: string;
  tags: string[];
  publishedAt: ISODate;
  scope: "public" | "group";  // chi può vederlo
  publishedToGroupId?: UUID;  // required se scope === "group"
  alsoForCars: boolean;       // flag filtro Feed
  savedCount: number;         // denormalized: count SavedRoute
  navigatedCount: number;     // denormalized: count "Naviga" su questo route
}
```

**Filtro veicolo:** Feed con `onlyCars: true` → `WHERE alsoForCars = true`.

**Promote group → public:** admin di gruppo può cambiare `scope` da `"group"` a `"public"`. Solo l'admin del gruppo che lo possiede.

---

## 19 · SavedRoute

Quando un utente salva un `PublishedRoute` dal Feed Mondo/Gruppo → finisce nel suo archivio `io.mappa`.

```ts
{
  id: UUID;
  ownerId: UUID;           // chi ha salvato
  publishedRouteId: UUID;
  savedAt: ISODate;
  note?: string;
}
```

**Unique:** (`ownerId`, `publishedRouteId`).

**Side effects on insert:** incrementa `PublishedRoute.savedCount`.

---

## 20 · RouteComment

Commento pubblico su un PublishedRoute (visibile a chi può vedere il route).

```ts
{
  id: UUID;
  publishedRouteId: UUID;
  authorId: UUID;
  text: string;
  createdAt: ISODate;
}
```

---

## 21 · RouteLike

```ts
{
  id: UUID;
  publishedRouteId: UUID;
  userId: UUID;
  createdAt: ISODate;
}
```

**Unique:** (`publishedRouteId`, `userId`).

---

## 22 · FollowRelationship

Follow asimmetrico.

```ts
{
  id: UUID;
  followerId: UUID;
  followedId: UUID;
  createdAt: ISODate;
}
```

**Unique:** (`followerId`, `followedId`). Non c'è "request approval" — i profili sono pubblici per default; chi vuole privacy mette `Profile.isPublic = false`.

---

## 23 · PublicEvent

Eventi big curati da noi (raduni, EICMA, track day). NON sono i GroupRide.

```ts
{
  id: UUID;
  kind: "raduno" | "track_day" | "viaggio" | "corso" | "fiera";
  title: string;
  description: string;
  organizerId: UUID;       // chi cura
  location: string;
  startAt: ISODate;
  endAt?: ISODate;
  coverHue: number;        // 0-360
  attendeesCount: number;  // denormalized
}
```

---

## 24 · EventRSVP

```ts
{
  id: UUID;
  eventId: UUID;
  userId: UUID;
  value: "interested" | "going";
  respondedAt: ISODate;
}
```

---

## 25-26 · Segment / SegmentAttempt — **LEGACY**

Concetto di "segmento cronometrato" stile Strava. **Non usato** nella nuova Classifica Mondo (che è per-percorso). Lascio i tipi nel codice per riusare in futuro per "tratti notevoli intra-percorso".

---

## 27 · Badge

Catalogo badge ottenibili.

```ts
{
  id: UUID;
  slug: string;
  title: string;
  description: string;
  iconGlyph: string;       // emoji o glyph
  accentColor: string;
}
```

---

## 28 · UserBadge

Badge guadagnato da un utente.

```ts
{
  id: UUID;
  userId: UUID;
  badgeId: UUID;
  earnedAt: ISODate;
}
```

**Unique:** (`userId`, `badgeId`).

---

## 29 · Challenge

Sfida periodica (placeholder, non implementata in UI MVP).

```ts
{
  id: UUID;
  title: string;
  description: string;
  startAt: ISODate;
  endAt: ISODate;
  targetKm?: number;
  targetElevationM?: number;
  participantsCount: number;
}
```

---

## 30 · SafetyContact

Contatto di emergenza configurato dall'utente.

```ts
{
  id: UUID;
  ownerId: UUID;
  name: string;
  phone?: string;
  email?: string;
  notifyEnabled: boolean;
}
```

**Use:** invocati su SOS (non implementato in UI MVP). Vedi legacy `09_safety/*`.

---

## 31 · LiveSession

Sessione di live sharing posizione (durante un tracking o cordata).

```ts
{
  id: UUID;
  ownerId: UUID;
  groupId?: UUID;          // se collegata a una cordata
  activityId: UUID;
  title?: string;
  startedAt: ISODate;
  endedAt?: ISODate;
  state: "active" | "ended_normal" | "ended_timeout" | "ended_by_leader";
  shareToken: string;      // token per URL pubblico view-only
}
```

**Placeholder in MVP.**

---

## 32 · Notification

Inbox notifiche utente.

```ts
{
  id: UUID;
  userId: UUID;
  kind: "like" | "comment" | "follow" | "ride_confirmed"
      | "ride_reminder" | "safety_alert" | "badge_earned";
  title: string;
  body: string;
  createdAt: ISODate;
  readAt?: ISODate;
  linkScreen?: string;     // es. "gruppo.home", "profilo", "mondo.feed"
  linkEntityId?: UUID;     // id dell'entità linkata (ride, route, profile…)
}
```

---

## Denormalized counters — riepilogo

Vanno tenuti sincronizzati lato back (trigger o job):

| Counter | Entità owner | Sorgente |
|---------|--------------|----------|
| `Motorcycle.totalKm` | per moto | Σ `Activity.distanceKm` |
| `Group.membersCount` | per gruppo | COUNT `GroupMembership` |
| `Group.publicRoutesCount` | per gruppo | COUNT `PublishedRoute` WHERE `publishedToGroupId = g` AND `scope = 'public'` |
| `GroupRide.invitedCount` | per ride | COUNT `GroupMembership` del gruppo |
| `GroupRide.confirmedCount` | per ride | COUNT `GroupRideRSVP` WHERE `value = 'going'` |
| `PublishedRoute.savedCount` | per route | COUNT `SavedRoute` |
| `PublishedRoute.navigatedCount` | per route | COUNT eventi "naviga avviato" su questo route |
| `PublicEvent.attendeesCount` | per evento | COUNT `EventRSVP` WHERE `value = 'going'` |

Likes / comments counts sono derivabili al volo (non denormalizzati) finché il volume regge.

---

## Indici consigliati (hint per il back)

- `PublishedRoute (scope, publishedAt DESC)` — feed cronologico pubblico
- `PublishedRoute (publishedToGroupId, scope, publishedAt DESC)` — feed gruppo
- `PublishedRoute (alsoForCars, publishedAt DESC)` — filtro Feed auto
- `PublishedRoute (savedCount DESC), (navigatedCount DESC), (publishedAt DESC)` — classifiche
- `GroupRide (groupId, startAt DESC)` — prossime/passate
- `GroupRide (groupId, status, startAt)` — filtro per status
- `SavedRoute (ownerId, savedAt DESC)` — archivio utente
- `Activity (ownerId, startedAt DESC)` — stats home
- `Notification (userId, readAt NULLS FIRST, createdAt DESC)` — inbox
- `GroupMembership (userId)` UNIQUE (groupId, userId) — fast "i miei gruppi"

GIS: se serve fare bounding-box query (es. "percorsi vicino a Brescia"), aggiungere geometry columns su `PublishedRoute` (start point, bounding box).
