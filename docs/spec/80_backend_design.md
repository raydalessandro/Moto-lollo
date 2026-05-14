# 80 · Backend design

Documento di sintesi per disegnare il backend dell'app Moto-lollo. Integra:
- `60_domain_model.md` (entità + counter + indici)
- `70_flussi_e2e.md` (mutations + side effects + authorization matrix)
- Le 15 spec per-screen (read queries, RLS policies per-tabella)
- I file del bundle legacy validi (`docs/sources/spec_bundle.zip`)

**Output atteso da questo documento:** uno schema Postgres completo, le RLS policies, le RPC functions, la lista degli endpoint REST di Supabase, la configurazione di Auth/Storage/Realtime, e la setup di Mapbox.

---

## 1. Stack scelto

| Concern | Tech | Note |
|---------|------|------|
| Database | **Postgres 15** (via Supabase) | RLS, JSON, GIS, trigger |
| Auth | **Supabase Auth** | email/password + magic link; Google OAuth in Fase 2 |
| Storage | **Supabase Storage** | bucket dedicati per avatar, moto, activity media, GPX |
| Realtime | **Supabase Realtime** | Postgres CDC + Broadcast channels (Cordata) |
| Edge functions | **Supabase Edge Functions** (Deno) | webhook Mapbox proxy, GPX parser, cron job |
| API | Supabase **PostgREST** auto-generato + **RPC** custom | Niente API custom Node a meno di esigenze specifiche |
| Map | **Mapbox** (GL JS + Directions + Geocoding + Static Images) | Token gestito da proxy |
| Push | **Web Push API** (VAPID keys) | iOS solo dopo PWA install + iOS 16.4+ |
| Email | **Resend** o Supabase SMTP | transazionali (verify, deletion confirm) |
| Monitoring | **Sentry** (frontend) + Supabase logs | Fase 6 |

---

## 2. Schema Postgres

Genera tutto dal modello in `60_domain_model.md`. Mapping convenzionale:
- Tipi TS `UUID` → `uuid` Postgres
- `ISODate` → `timestamptz`
- `Visibility` enum → ENUM type Postgres
- Foreign keys → `REFERENCES`
- Soft-delete → colonna `deleted_at timestamptz`

### 2.1 Tipi enum

```sql
CREATE TYPE visibility AS ENUM ('private', 'followers', 'public');
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE membership_role AS ENUM ('leader', 'admin', 'member');
CREATE TYPE document_kind AS ENUM ('assicurazione', 'bollo', 'revisione', 'patente');
CREATE TYPE maintenance_kind AS ENUM ('tagliando', 'gomme', 'catena', 'pastiglie', 'olio', 'altro');
CREATE TYPE proposal_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE ride_status AS ENUM ('proposta', 'confermata', 'in-corso', 'completata', 'annullata');
CREATE TYPE rsvp_value AS ENUM ('going', 'maybe', 'no');
CREATE TYPE event_kind AS ENUM ('raduno', 'track_day', 'viaggio', 'corso', 'fiera');
CREATE TYPE event_rsvp_value AS ENUM ('interested', 'going');
CREATE TYPE published_route_source AS ENUM ('activity', 'planned_route');
CREATE TYPE published_route_scope AS ENUM ('public', 'group');
CREATE TYPE media_status AS ENUM ('uploaded', 'uploading', 'failed');
CREATE TYPE live_session_state AS ENUM ('active', 'ended_normal', 'ended_timeout', 'ended_by_leader');
CREATE TYPE notification_kind AS ENUM (
  'like', 'comment', 'follow',
  'ride_confirmed', 'ride_reminder',
  'safety_alert', 'badge_earned'
);
```

### 2.2 Tabelle (esempio compatto, full schema in `db/schema.sql`)

```sql
-- ── Profile + Preferences ───────────────────────────────────────────────────

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9._]{3,24}$'),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 2 AND 40),
  bio text CHECK (length(bio) <= 500),
  avatar_url text,
  initials text NOT NULL CHECK (length(initials) BETWEEN 2 AND 3),
  accent_color text CHECK (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  role user_role NOT NULL DEFAULT 'user',
  is_public boolean NOT NULL DEFAULT true,
  city text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX ON profiles (username);
CREATE INDEX ON profiles (deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TABLE user_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('light','dark','auto')),
  language text NOT NULL DEFAULT 'it' CHECK (language IN ('it','en')),
  units text NOT NULL DEFAULT 'metric' CHECK (units IN ('metric','imperial')),
  notifications_enabled boolean NOT NULL DEFAULT true,
  default_activity_visibility visibility NOT NULL DEFAULT 'followers',
  auto_sync_enabled boolean NOT NULL DEFAULT true
);

-- ── Garage ──────────────────────────────────────────────────────────────────

CREATE TABLE motorcycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  year int CHECK (year BETWEEN 1900 AND 2100),
  engine_cc int CHECK (engine_cc BETWEEN 50 AND 5000),
  color text,
  photo_url text,
  total_km numeric(10,2) NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  purchased_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One primary per owner
CREATE UNIQUE INDEX one_primary_per_owner
  ON motorcycles (owner_id) WHERE is_primary = true;

CREATE TABLE maintenance_records (...);  -- vedi 13_io_garage.md
CREATE TABLE documents (...);  -- idem

-- ── Activities ──────────────────────────────────────────────────────────────

CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  motorcycle_id uuid REFERENCES motorcycles(id) ON DELETE SET NULL,
  group_ride_id uuid REFERENCES group_rides(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL CHECK (ended_at > started_at),
  duration_seconds int NOT NULL CHECK (duration_seconds > 0),
  distance_km numeric(8,3) NOT NULL CHECK (distance_km > 0),
  avg_speed_kmh numeric(5,2),
  max_speed_kmh numeric(5,2),
  elevation_gain_m int,
  title text NOT NULL,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  visibility visibility NOT NULL DEFAULT 'followers',
  published_route_id uuid REFERENCES published_routes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON activities (owner_id, started_at DESC);
CREATE INDEX ON activities (group_ride_id) WHERE group_ride_id IS NOT NULL;

-- TrackPoint separato (alto volume)
CREATE TABLE activity_track_points (
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  t int NOT NULL,  -- offset ms da started_at
  lat numeric(10,7) NOT NULL,
  lon numeric(10,7) NOT NULL,
  speed numeric(5,2),
  ele int,
  acc numeric(4,1),
  PRIMARY KEY (activity_id, t)
);

-- Compression: vedi legacy 04_tracking/state_machine.md
-- In future: store track points come polyline-encoded string in activities table
-- per ridurre I/O su read.

-- ── Planned routes + waypoints ──────────────────────────────────────────────

CREATE TABLE planned_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  waypoints jsonb NOT NULL,  -- [{lat, lon, label?}, ...]
  distance_km numeric(8,3) NOT NULL,
  estimated_duration_min int NOT NULL,
  visibility visibility NOT NULL DEFAULT 'private',
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Groups + memberships ────────────────────────────────────────────────────

CREATE TABLE groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  tag text NOT NULL CHECK (length(tag) BETWEEN 2 AND 4),
  crest_color text NOT NULL,
  description text,
  members_count int NOT NULL DEFAULT 0,  -- denormalized
  founded_at timestamptz NOT NULL,
  is_private boolean NOT NULL DEFAULT true,
  area text,
  public_routes_count int NOT NULL DEFAULT 0,  -- denormalized
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE group_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role membership_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- One leader per group
CREATE UNIQUE INDEX one_leader_per_group
  ON group_memberships (group_id) WHERE role = 'leader';

CREATE TABLE group_membership_requests (...);
CREATE TABLE route_proposals (...);
CREATE TABLE ride_board_comments (...);

CREATE TABLE group_rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  planned_route_id uuid REFERENCES planned_routes(id) ON DELETE SET NULL,
  title text NOT NULL,
  meetup_text text NOT NULL,
  start_at timestamptz NOT NULL,
  distance_km numeric(8,3) NOT NULL,
  estimated_duration_min int NOT NULL,
  status ride_status NOT NULL DEFAULT 'proposta',
  proposed_by uuid NOT NULL REFERENCES profiles(id),
  activity_ids uuid[] NOT NULL DEFAULT '{}',
  invited_count int NOT NULL DEFAULT 0,
  confirmed_count int NOT NULL DEFAULT 0,
  navigator_user_id uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON group_rides (group_id, start_at DESC);
CREATE INDEX ON group_rides (status, start_at);
CREATE INDEX ON group_rides (group_id, status) WHERE status IN ('confermata','in-corso');

CREATE TABLE group_ride_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_ride_id uuid NOT NULL REFERENCES group_rides(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  value rsvp_value NOT NULL,
  responded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_ride_id, user_id)
);

-- ── Community ───────────────────────────────────────────────────────────────

CREATE TABLE published_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type published_route_source NOT NULL,
  source_id uuid NOT NULL,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  cover_text text,
  hero_color text,
  distance_km numeric(8,3) NOT NULL,
  duration_min int,
  area text,
  tags text[] NOT NULL DEFAULT '{}',
  published_at timestamptz NOT NULL DEFAULT now(),
  scope published_route_scope NOT NULL DEFAULT 'public',
  published_to_group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  also_for_cars boolean NOT NULL DEFAULT false,
  saved_count int NOT NULL DEFAULT 0,        -- denorm
  navigated_count int NOT NULL DEFAULT 0,    -- denorm
  CHECK (
    (scope = 'public' AND published_to_group_id IS NULL)
    OR (scope = 'group' AND published_to_group_id IS NOT NULL)
  )
);

CREATE INDEX ON published_routes (scope, published_at DESC);
CREATE INDEX ON published_routes (published_to_group_id, published_at DESC);
CREATE INDEX ON published_routes (also_for_cars, published_at DESC) WHERE also_for_cars = true;
CREATE INDEX ON published_routes (navigated_count DESC);
CREATE INDEX ON published_routes (saved_count DESC);

CREATE TABLE saved_routes (...);
CREATE TABLE route_likes (...);
CREATE TABLE route_comments (...);
CREATE TABLE follow_relationships (...);

-- ── Events ──────────────────────────────────────────────────────────────────

CREATE TABLE public_events (...);
CREATE TABLE event_rsvps (...);

-- ── Badges ──────────────────────────────────────────────────────────────────

CREATE TABLE badges (...);
CREATE TABLE user_badges (...);

-- ── Safety + Live ──────────────────────────────────────────────────────────

CREATE TABLE safety_contacts (...);
CREATE TABLE live_sessions (...);

-- ── Notifications ──────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind notification_kind NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  link_screen text,
  link_entity_id uuid
);

CREATE INDEX ON notifications (user_id, read_at NULLS FIRST, created_at DESC);
```

Full schema sarà in `db/schema.sql` quando inizia Fase 1.

---

## 3. RLS policies (riassunto)

Vedi `70_flussi_e2e.md` §"Authorization matrix" per la versione completa. Pattern:

- **Self-only tables** (motorcycles, planned_routes, maintenance_records, documents, user_preferences, safety_contacts): `USING (owner_id = auth.uid())`, idem WITH CHECK.
- **Public read, self write** (profiles, follow_relationships, route_likes): SELECT TO authenticated USING true; INSERT/UPDATE/DELETE bound to self.
- **Group-scoped** (group_memberships, group_rides, route_proposals, ride_board_comments): membership-based SELECT, role-based INSERT/UPDATE.
- **Activity visibility-aware** (activities, activity_media, published_routes):
  ```sql
  CREATE POLICY "respect visibility"
    ON activities FOR SELECT
    USING (
      owner_id = auth.uid()
      OR (visibility = 'public')
      OR (visibility = 'followers' AND EXISTS (
        SELECT 1 FROM follow_relationships
        WHERE follower_id = auth.uid() AND followed_id = activities.owner_id
      ))
    );
  ```

Tutte le policies pattern-base sono già nelle spec per-screen.

---

## 4. Triggers per counters denormalizzati

Vedi `60_domain_model.md` §"Denormalized counters". Pattern:

```sql
-- Esempio: saved_count su published_routes
CREATE FUNCTION update_saved_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE published_routes SET saved_count = saved_count + 1
    WHERE id = NEW.published_route_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE published_routes SET saved_count = saved_count - 1
    WHERE id = OLD.published_route_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_saved_count
  AFTER INSERT OR DELETE ON saved_routes
  FOR EACH ROW EXECUTE FUNCTION update_saved_count();
```

Counter da implementare:
- `motorcycles.total_km` ← `activities.distance_km`
- `groups.members_count` ← `group_memberships`
- `groups.public_routes_count` ← `published_routes` WHERE scope='public' AND published_to_group_id=g
- `group_rides.confirmed_count` ← `group_ride_rsvps` WHERE value='going'
- `published_routes.saved_count` ← `saved_routes`
- `published_routes.navigated_count` ← RPC dedicata (`increment_navigated_count`)
- `public_events.attendees_count` ← `event_rsvps` WHERE value='going'

---

## 5. RPC functions (alto livello)

Funzioni Postgres esposte via `supabase.rpc()` per operazioni complesse:

```sql
-- Dashboard
home_dashboard(p_user_id uuid) → json
my_routes(p_user_id uuid) → json
group_home_member(p_group_id uuid, p_user_id uuid) → json
story_for_group(p_group_id uuid, p_user_id uuid) → json
classifica(p_sort, p_area, p_also_for_cars, p_limit) → json

-- Mutations complesse
approve_route_proposal(p_proposal_id, p_admin_id, p_ride_fields json) → group_rides
approve_membership_request(p_request_id, p_admin_id) → group_memberships
publish_activity(p_activity_id, p_fields json) → published_routes
toggle_like(p_route_id) → boolean  -- returns new liked state
save_route(p_route_id, p_note text DEFAULT NULL) → saved_routes
increment_navigated_count(p_route_id) → void

-- Lifecycle
end_cordata_session(p_session_id, p_action text) → activities[]
delete_account(p_password text) → void  -- soft-delete + schedule hard-delete

-- Utility
geocode_proxy(p_query text, p_proximity geography DEFAULT NULL) → json
mapbox_directions_proxy(p_origin, p_destination, p_profile) → json
```

---

## 6. Cron jobs (Supabase pg_cron)

```sql
-- Ride status auto-transition
SELECT cron.schedule('ride-confermata-to-in-corso', '* * * * *', $$
  UPDATE group_rides SET status = 'in-corso'
  WHERE status = 'confermata' AND start_at <= now() AND start_at > now() - interval '1 hour';
$$);

-- Stale "in-corso" cleanup (auto-end after 6h)
SELECT cron.schedule('ride-stale-cleanup', '0 * * * *', $$
  UPDATE group_rides SET status = 'completata'
  WHERE status = 'in-corso' AND start_at < now() - interval '6 hours';
$$);

-- Document expiry notifications
SELECT cron.schedule('document-expiry-warn', '0 9 * * *', $$
  -- ogni mattina alle 9 controlla documenti che scadono in 30/7/1 giorni
  INSERT INTO notifications (user_id, kind, title, body, link_entity_id)
  SELECT d.owner_id, 'ride_reminder',
         'Documento in scadenza: ' || d.kind,
         'Scade tra X giorni, controlla.',
         d.id
  FROM documents d
  WHERE d.expires_at BETWEEN now() + interval '1 day' AND now() + interval '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.link_entity_id = d.id AND n.created_at > now() - interval '1 day'
    );
$$);

-- Account hard-delete grace period
SELECT cron.schedule('account-hard-delete', '0 3 * * *', $$
  DELETE FROM profiles WHERE deleted_at < now() - interval '30 days';
$$);
```

---

## 7. Storage buckets

Supabase Storage:

```
moto-lollo-storage/
├── avatars/{userId}.{ext}                # public read, owner write, ≤ 2MB
├── motorcycle-photos/{userId}/{motoId}.{ext}  # public read, owner write, ≤ 5MB
├── activity-media/{userId}/{activityId}/{filename}.{ext}  # public read (se activity public/followers), owner write, ≤ 10MB
└── gpx-uploads/{userId}/{hash}.gpx       # private (only owner), owner write, ≤ 10MB
```

Policies via Supabase Storage RLS:

```sql
-- avatars: anyone can read, owner writes
CREATE POLICY "avatar read public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatar write own"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 8. Realtime (Cordata live)

Pattern Supabase Realtime:

### Postgres CDC channel (per notifiche generiche)

```ts
supabase.channel('public:notifications')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
    (payload) => addToInbox(payload.new))
  .subscribe()
```

### Broadcast channel (per cordata posizioni)

```ts
// Client navigator broadcasts
const channel = supabase.channel(`cordata:${rideId}`, {
  config: { broadcast: { ack: false, self: false } }
})
channel.subscribe(status => {
  if (status === 'SUBSCRIBED') {
    setInterval(() => {
      channel.send({
        type: 'broadcast',
        event: 'position',
        payload: { userId, lat, lon, speed, t: Date.now() }
      })
    }, 5000)
  }
})

// Other clients receive
channel.on('broadcast', { event: 'position' }, ({ payload }) => {
  updateRiderPosition(payload.userId, payload.lat, payload.lon)
})
```

**Channel authorization** via Postgres function (Supabase Realtime authorize):

```sql
CREATE FUNCTION realtime.authorize_cordata_channel(channel text, user_id uuid)
RETURNS boolean AS $$
DECLARE
  ride_id uuid;
BEGIN
  ride_id := (regexp_match(channel, '^cordata:(.+)$'))[1]::uuid;
  RETURN EXISTS (
    SELECT 1 FROM group_rides r
    JOIN group_memberships gm ON gm.group_id = r.group_id
    WHERE r.id = ride_id AND gm.user_id = user_id
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## 9. Mapbox setup

### Token strategy

Due token Mapbox:
1. **Public token** (`pk.*`) per Mapbox GL JS lato browser. Restrict URL: `localhost:*`, `*.vercel.app`, `*.moto-lollo.it`.
2. **Secret token** (`sk.*`) per Edge Functions / RPC che chiamano Directions/Geocoding. Mai esposto client.

Env vars:
```
MAPBOX_PUBLIC_TOKEN=pk.eyJ1Ijoi...
MAPBOX_SECRET_TOKEN=sk.eyJ1Ijoi...
NEXT_PUBLIC_MAPBOX_TOKEN=$MAPBOX_PUBLIC_TOKEN  # esposto al client
```

### Endpoints proxati via Edge Function

```ts
// supabase/functions/mapbox-proxy/index.ts
import { serve } from "https://deno.land/std/http/server.ts"

serve(async (req) => {
  const { endpoint, params } = await req.json()
  const SECRET = Deno.env.get('MAPBOX_SECRET_TOKEN')!

  const url = (() => {
    switch (endpoint) {
      case 'directions':
        return `https://api.mapbox.com/directions/v5/mapbox/driving/${params.coords}?access_token=${SECRET}&geometries=polyline&overview=full`
      case 'geocoding':
        return `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(params.query)}.json?access_token=${SECRET}&proximity=${params.proximity || ''}&limit=5`
      case 'static-image':
        return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${params.overlay}/${params.center}/${params.zoom}/${params.size}@2x?access_token=${SECRET}`
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`)
    }
  })()

  const res = await fetch(url)
  return new Response(await res.text(), {
    headers: { 'Content-Type': 'application/json' },
    status: res.status
  })
})
```

### Rate limit

Edge Function deve rate-limitare per `auth.uid()`:
- 20 geocoding / min
- 60 directions / day (Mapbox free tier 100k/mese)
- 100 static-image / day

---

## 10. Auth setup

### Provider (Fase 1)

- Email + password
- Magic link (passwordless via email)
- (Fase 2) Google OAuth

### Configurazione

```toml
# supabase/config.toml
[auth]
site_url = "https://moto-lollo.vercel.app"
additional_redirect_urls = ["http://localhost:3000"]
jwt_expiry = 3600  # 1 ora
refresh_token_rotation_enabled = true
password_min_length = 8

[auth.email]
enable_signup = true
enable_confirmations = true  # email verification required

[auth.email.template.confirmation]
subject = "Conferma il tuo account Moto-lollo"
content_path = "./supabase/templates/confirm.html"
```

### Profile creation hook

Quando un user fa signup, trigger crea automaticamente Profile row:

```sql
CREATE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, initials)
  VALUES (
    new.id,
    'user_' || substr(new.id::text, 1, 8),  -- placeholder, user changes later
    coalesce(new.raw_user_meta_data->>'display_name', 'Rider'),
    coalesce(new.raw_user_meta_data->>'initials', 'RD')
  );
  INSERT INTO public.user_preferences (user_id) VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

L'utente poi completerà username/displayName nel primo onboarding.

---

## 11. Mapping dalla vecchia spec

Quali file in `docs/sources/spec_bundle.zip/spec/` restano canonici per il back:

| File legacy | Stato | Cosa prendere |
|-------------|-------|---------------|
| `01_data_model.md` | Parzialmente valido | Pattern soft-delete, versioning. Schema specifico → ora in questo file. |
| `02_database_schema.md` | Riferimento | Template RLS, layout colonne. Schema specifico → ora in questo file. |
| `03_local_db.md` | Rilevante se Flutter | Strategia local DB (Drift/SQLite). Per PWA ignorabile (IndexedDB via supabase-js cache). |
| `04_tracking/L0_architecture.md` | **Valido** | Stack tracking GPS lato client. |
| `04_tracking/gps_filters.md` | **Valido** | Kalman filter, accuracy threshold, spike detection. Da implementare lato browser in Fase 1. |
| `04_tracking/state_machine.md` | **Valido** | Running/Paused/Ended state machine. Già rispettata in `40_navigation.md`. |
| `04_tracking/edge_cases.md` | **Valido** | App killed, GPS lost, multi-device. Tradurre in feature requirements per Fase 1. |
| `05_sync/L0_architecture.md` | **Valido** | Pattern offline-first sync. Riusare per IndexedDB queue → Supabase. |
| `05_sync/queue_design.md` | **Valido** | Queue strategy. Implementare service worker queue in Fase 1. |
| `05_sync/idempotency.md` | **Valido** | Idempotency keys per write. Mai duplicare un append track points. |
| `05_sync/ux_feedback.md` | **Valido** | UI per stato sync (cloud icon: synced/syncing/error). Aggiungere in Fase 1. |
| `05_sync/edge_cases.md` | **Valido** | Network drop, conflict resolution. |
| `06_garage/*` | Parzialmente valido | Vedi nuova `13_io_garage.md`. |
| `07_community/*` | Da rivedere | Modello community è cambiato (alsoForCars, scope, savedCount). Usare nuova `30_mondo_feed.md` + `32_mondo_classifica.md`. |
| `08_navigation/*` | **Valido** | Turn-by-turn architecture. Riferimento per Fase 1. |
| `09_safety/L0_architecture.md` | **Valido** | SOS, contatti emergenza, live sharing. Da implementare Fase 5. |
| `09_safety/edge_cases.md` | **Valido** | Battery dead, no signal, false positive crash detection. |
| `10_planning/*` | Da rivedere | GroupRide model è nuovo. Usare `22_gruppo_pianifica.md`. |
| `11_ui_components/*` | Superseded | Design system attuale in `src/components/`. |
| `12_settings_profile/*` | Parzialmente valido | Usare `50_drawer.md` + `13_io_garage.md`. |
| `99_open_questions.md` | Da chiudere | Risolvere le domande aperte lungo Fase 0-1. |

---

## 12. Ordine di implementazione Fase 1

Per la "MVP IO solo" (vedi `docs/ROADMAP.md` Fase 1):

1. **Setup infrastruttura**
   - Supabase project creato (free tier ok per test)
   - Vercel project linked a repo, env vars settate
   - Mapbox token public + secret
   - Domain custom (opzionale, Vercel subdomain ok per test)

2. **Schema migration 001** (auth + profile + preferences)
   - Tabelle: profiles, user_preferences
   - Trigger handle_new_user
   - RLS policies
   - Frontend: schermate auth (login, signup, magic link, password reset)

3. **Schema migration 002** (garage)
   - Tabelle: motorcycles, maintenance_records, documents
   - Trigger one_primary_per_owner, total_km counter
   - Frontend: io.garage wirato

4. **Schema migration 003** (activities + tracking)
   - Tabelle: activities, activity_track_points, activity_media, planned_routes
   - Trigger total_km update
   - Storage bucket activity-media
   - Frontend: io.registra (GPS), io.mappa (archivio)
   - PWA: service worker + manifest + wake lock

5. **Schema migration 004** (notifications + dashboard)
   - Tabella: notifications
   - Cron document-expiry-warn
   - RPC home_dashboard
   - Frontend: io.home wirato

6. **Mapbox integration**
   - Edge function mapbox-proxy
   - Mapbox GL JS dentro pages
   - Directions, geocoding, static images
   - Frontend: navigation overlay, mini-mappe

7. **Drawer + Profile**
   - Frontend: 50_drawer screens (Profilo, Settings, Privacy come placeholder funzionante)
   - exportMyData job + UI
   - requestAccountDeletion flow

8. **PWA finalization**
   - Lighthouse audit
   - Icons (favicon + apple-touch-icon)
   - Splash screen
   - Test su iOS + Android

9. **Deploy + onboarding**
   - Vercel prod
   - Inviti agli amici
   - Hotfix loop

10. **Pre-Fase 2 checkpoint**
    - 4-5 amici lo usano da 1-2 settimane
    - Bug critici fixed
    - Feedback raccolto

---

## 13. Migrations strategy

Useremo Supabase CLI con migration files in `supabase/migrations/`:

```
supabase/migrations/
├── 20260601000000_auth_profile.sql
├── 20260601000001_garage.sql
├── 20260601000002_activities.sql
├── 20260601000003_notifications.sql
├── 20260601000004_groups.sql
├── 20260601000005_community.sql
├── 20260601000006_events_badges.sql
└── 20260601000007_safety_live.sql
```

Comando: `supabase db push` per applicare local → cloud.

Rollback: ogni migration ha sezione `-- DOWN` con DROP corrispondenti, ma non automatico (Supabase non supporta down migrations native — usare cautela).

---

## 14. Testing strategy back-end

Out of scope dettagliato, ma:

- **pgTAP** per test policies RLS critiche (impersonate diversi userId, verify accesso)
- **Supabase local dev** (Docker) per testare migration localmente prima di push
- **Seed data** per E2E test (rispecchia il mock in-memory del prototipo)

---

## 15. Domande aperte (HUMAN-DEFERRED critiche)

Da chiudere prima di Fase 1:

1. **Username modificabile entro 7g?** (vecchia spec F-003) — decidere
2. **Background sync su PWA**: cosa fare quando si perde connessione a metà uscita? Service worker queue verso Supabase quando torna online. Disegnare flow.
3. **Wake Lock denied**: degrade UX. Banner + raccomandazione, ok per testers iniziali.
4. **Mapbox monthly cap**: free tier 50k map loads + 100k geocoding. Sufficiente per 5-50 utenti. Soglia di allarme a 80% del cap (mail/notifica).
5. **GDPR export format**: JSON dump completo (consigliato) o ZIP con CSV multipli + foto?
6. **Email transactional provider**: Supabase SMTP default (rate limited) vs Resend ($20/m, deliverability migliore). Iniziamo con Supabase default e switch quando necessario.

Tutto il resto è tracciato nelle singole spec per-screen sotto sezione HUMAN-DEFERRED.

---

## 16. Stato per ripresa

**Stato 2026-05-14**: Spec back-end disegnato. Pronto a partire Fase 1 — Schema migration 001 (auth + profile) come prima implementation.

Riferimenti chiave:
- `docs/PLAN.md` per cosa è già fatto sul front
- `docs/ROADMAP.md` per le fasi
- `docs/spec/` per il dettaglio per-screen
- Questo file per il back

Quando si apre la prossima chat:
> "Riprendiamo Moto-lollo Fase 1, schema migration 001. Leggi `docs/spec/80_backend_design.md`."
