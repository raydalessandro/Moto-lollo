# PLAN — Allineamento Front alla visione utente

Documento di riferimento per il refactor del front secondo la struttura definita insieme. Auto-sufficiente: se il context si compatta, basta rileggere questo file.

**Ultimo aggiornamento decisioni:** sessione del check-point post-README, 13 punti chiariti con l'utente (Ray).

**Stato refactor (2026-05-14):** Step 1–15 ✅ chiusi. Build verde su `main`. Resta solo §6 — riallineare Excel/E2E alla nuova struttura.

---

## 0. Stato di partenza

- Branch di lavoro: `main` (push diretti).
- Front Next.js 16 + React 19 + TS + Tailwind 4 con 13 screen wired al DB in-memory.
- Pillars attuali: `IO {Home · Mappa · Crea · Garage}` + `GRUPPO {Gruppo · Pianifica · Cordata · Storia · Diario}` + `MONDO {Feed · Eventi · Classifica · Profilo}`.
- DB mock con 26 tabelle seedate (vedi README sezione "Data layer").
- Ray (`u0`) è membro normale di tutti i 4 gruppi.

## 1. Decisioni confermate

| # | Topic | Decisione |
|---|---|---|
| 1 | **Filtro veicolo nel Feed** | NON un enum `VehicleKind`. È un **flag booleano `alsoForCars`** sui percorsi pubblicati. Il filtro Feed mostra solo percorsi con `alsoForCars = true` quando il toggle è attivo. |
| 2 | **Tasto Naviga** | Vive **dentro `io.registra`** come 4ª opzione del hub. Non in Home. |
| 3 | **Ray admin** | Diventa `admin` del gruppo Moto Garda (g1). Aggiungere commento `// HUMAN-DEFERRED: admin model — see PLAN.md §1.3` sulle righe seed/queries modificate, perché la promozione operativa di admin (validare percorsi, pubblicare in Mondo) richiederà una migration al DB reale. |
| 4 | **Storia → Diario** | La Storia di un gruppo resta viva fino a **24 h prima** dell'inizio del **prossimo evento** del gruppo. Tetto assoluto: **30 giorni**. Oltre → diventa Diario. |
| 5 | **HOME** | Ricostruita dal layout del prototipo HTML originale (`docs/sources/prototype.html`). |
| 6 | **MAPPA (IO)** | NON è più la mappa interattiva. Diventa **archivio percorsi personali**: percorsi creati + percorsi salvati da Feed Mondo/Gruppo. Da qui si pubblica su Mondo. |
| 7 | **CREA → REGISTRA** | Rinominata `io.crea` → `io.registra`. Hub a 4 vie: (a) crea percorso a mano su mappa, (b) registra mentre guidi (GPS tracking), (c) importa GPX, (d) Naviga (inserisci destinazione, tipo Maps, app traccia). Più navigazione libera (senza destinazione). |
| 8 | **Mappa di navigazione** | NON è una tab. È fullscreen, si apre **solo** quando l'utente avvia un percorso o una navigazione. |
| 9 | **GRUPPI = privati moderati** | Admin crea il gruppo. Admin accetta/rifiuta partecipanti. Admin decide quali percorsi pubblicati nel gruppo passano a Mondo. Membri possono proporre percorsi: admin valida/rifiuta. |
| 10 | **Lista Gruppi** | Per non-membri: vedo feed di profili gruppi pubblici (numero membri, zona, ≥3 percorsi pubblici). Per membri: in alto i miei gruppi, sotto gli altri. Tap su gruppo → profilo del gruppo (membri, prossima uscita, percorsi proposti). |
| 11 | **Pianifica (gruppo)** | Admin: edita eventi, valida percorsi proposti. Membro: sola lettura, può confermare presenza, commentare in bacheca, proporre percorsi. |
| 12 | **Cordata** | Layout HTML del prototipo originale. Pre-partenza: chi ha confermato. Durante: 1 solo "navigatore fisso" designato dall'admin con turn-by-turn Mapbox; gli altri vedono la schermata cordata (non navigazione). |
| 13 | **MONDO restructure** | Tab a 3: `Feed · Eventi · Classifica`. **Profilo rimosso** da Mondo. Classifica diventa **classifica di percorsi** (non di utenti). Eventi = solo eventi curati da noi (EICMA, raduni big). |
| 14 | **Hamburger menu** | In alto a sinistra nell'Header. Contiene: Profilo utente, Impostazioni, Privacy/Policy, eventuale Logout. |

---

## 2. Modello dati — modifiche necessarie

Tutte additive, non rotture.

### Nuovi tipi in `src/types/domain.ts`

```ts
// Sotto Community
export interface SavedRoute {
  id: UUID;
  ownerId: UUID;
  publishedRouteId: UUID;
  savedAt: ISODate;
  // Opzionale: nota personale dell'utente
  note?: string;
}

// Sotto Groups
export type RouteProposalStatus = "pending" | "approved" | "rejected";

export interface RouteProposal {
  id: UUID;
  groupId: UUID;
  proposedBy: UUID;       // userId
  plannedRouteId: UUID;   // riferimento al percorso proposto
  status: RouteProposalStatus;
  reviewedBy?: UUID;      // admin che ha deciso
  reviewedAt?: ISODate;
  note?: string;          // motivo rifiuto / nota proposta
  createdAt: ISODate;
}

export interface GroupMembershipRequest {
  id: UUID;
  groupId: UUID;
  userId: UUID;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: UUID;
  reviewedAt?: ISODate;
  createdAt: ISODate;
}

// Sotto Groups — bacheca commenti su un evento
export interface RideBoardComment {
  id: UUID;
  groupRideId: UUID;
  authorId: UUID;
  text: string;
  createdAt: ISODate;
}
```

### Campi nuovi su entità esistenti

```ts
// Group
export interface Group {
  // ...campi esistenti
  isPrivate: boolean;          // sempre true in MVP, ma esplicito
  area?: string;               // zona geografica visibile ai non-membri
  publicRoutesCount: number;   // counter derivato per preview
}

// GroupMembership: nessuna modifica struttura, ma Ray viene
// promosso admin di g1 (vedi seed, §1.3 PLAN)

// PublishedRoute
export interface PublishedRoute {
  // ...campi esistenti
  alsoForCars: boolean;        // flag filtro veicolo (default false)
  scope: "public" | "group";   // "public" = visibile in MONDO, "group" = solo nel gruppo
  publishedToGroupId?: UUID;   // se scope = "group"
  savedCount: number;          // counter denormalizzato
  navigatedCount: number;      // counter per classifica
}

// GroupRide
export interface GroupRide {
  // ...campi esistenti
  navigatorUserId?: UUID;      // chi guida (navigator fisso designato)
}
```

### Eventi/Segments — cosa accade

- `PublicEvent` resta come è (eventi curati big). Nessuna modifica.
- `Segment`, `SegmentAttempt` restano nel codice ma **non più usati** nel pillar MONDO. Spostano in legacy area perché la nuova Classifica è **per percorso**, non per segmento. **Non li cancello** finché non confermi, magari serviranno per "tratti cronometrati" intra-percorso. Documentato qui.

### Indicatori per classifica percorsi

Necessari su `PublishedRoute`:
- `likesCount` (già derivabile da `RouteLike`)
- `savedCount` (da `SavedRoute`)
- `navigatedCount` (incrementato a ogni Naviga)
- `commentsCount` (derivabile)

Per il prototipo li seediamo come campi denormalizzati. Sul DB reale saranno trigger o view materializzata.

---

## 3. Mappa nuova della navigazione

```
┌─ HEADER ──────────────────────────────────────────────┐
│  [☰ hamburger]  ▸ Moto_App   01 · PILLAR        [Ray] │
└───────────────────────────────────────────────────────┘
[hamburger drawer]
  • Profilo utente
  • Impostazioni
  • Privacy / Policy
  • Logout

PILLAR IO (4 tab)
  io.home       → dashboard tipo prototipo HTML
  io.mappa      → archivio percorsi personali (creati + salvati)
  io.registra   → hub 4 vie: crea / GPS / GPX / Naviga
  io.garage     → moto + manutenzione + scadenze

PILLAR GRUPPO (5 tab, contesto = gruppo corrente)
  gruppo.lista     → [nuovo] elenco gruppi (miei + altri pubblici)
                     (tap → entra nel contesto del gruppo)
  gruppo.home      → dashboard del gruppo (membri, next ride, percorsi)
  gruppo.pianifica → bacheca eventi (admin edita, membro legge+propone)
  gruppo.cordata   → live session, pre/durante
  gruppo.storia    → ultima uscita + foto + commenti (24h prima next)
  gruppo.diario    → archivio cristallizzato

  Nota: 5 tab nel BottomNav diventano scomode. Decisione: la lista
  gruppi è gestita SOPRA il pillar (group switcher chip strip che
  già c'è oggi). Quindi pillar GRUPPO mantiene 5 tab "interne"
  + chip strip con "altri gruppi" cliccabili per esplorare.
  Quando entro in un gruppo a cui non appartengo → schermata
  "profilo gruppo" + tasto "richiedi iscrizione".

PILLAR MONDO (3 tab)
  mondo.feed       → percorsi pubblici, filtro alsoForCars, tag, area
  mondo.eventi     → solo eventi curati big (EICMA, raduni)
  mondo.classifica → classifica PERCORSI (per likes/saves/nav)

FULLSCREEN (fuori bottom nav)
  navigation.live  → mapbox-like, si apre da:
                     - io.registra > Naviga
                     - io.registra > GPS tracking
                     - io.registra > "Avvia da percorso salvato"
                     - gruppo.cordata > "Sono il navigatore"
```

---

## 4. Step di implementazione (in ordine)

Ogni step = un commit. Cerco di mantenere il front sempre buildabile.

| # | Titolo | Tocca | Effort | Stato |
|---|---|---|---|---|
| **1** | Header + hamburger drawer | `Header.tsx`, nuovo `HamburgerDrawer.tsx`, `AppShell.tsx` | S | ✅ |
| **2** | MONDO da 4 → 3 tab (rimuovo Profilo da bottom nav, sposto in drawer) | `pillars.ts`, `AppShell.tsx`, `FeedScreen.tsx` etc. invariate | S | ✅ |
| **3** | Rinomina `io.crea` → `io.registra`, hub a 4 vie + FAB "Naviga" (placeholder fullscreen) | `pillars.ts`, `CreaScreen.tsx` → `RegistraScreen.tsx` (nuova), il vecchio `RegistraScreen.tsx` viene assorbito | M | ✅ |
| **4** | `io.mappa` → archivio percorsi personali (lista PlannedRoute + saved + "pubblica" CTA) | `MappaScreen.tsx` (riscrittura), aggiungo `SavedRoute` type + seed + queries | M | ✅ |
| **5** | `io.home` fedele a HTML prototipo (stats, moto, ultima uscita con mini-mappa, promemoria, notifiche) | `HomeScreen.tsx` (riscrittura) | M | ✅ |
| **6** | Estendo `domain.ts`: nuovi tipi (RouteProposal, GroupMembershipRequest, RideBoardComment, SavedRoute) + campi (alsoForCars, scope, navigatorUserId, isPrivate, area, publicRoutesCount, counters). Seed minimo per ciascuno. | `domain.ts`, `seed/*.ts`, `queries.ts` | M | ✅ |
| **7** | Ray = admin di Garda + commenti `HUMAN-DEFERRED` | `seed/gruppi.ts`, `queries.ts` | S | ✅ |
| **8** | Nuova `GruppoListScreen` (elenco gruppi pubblici) e refactor `GruppoHomeScreen` con tab "profilo gruppo" per non-membri | nuovo file + refactor | M | ✅ |
| **9** | `gruppo.pianifica` split admin / member, bacheca commenti, propose route | `PianificaScreen.tsx`, mutazione `proposeRoute`, `submitBoardComment` | M | ✅ |
| **10** | `gruppo.cordata` fedele a HTML prototipo, navigatore designato dall'admin | `CordataScreen.tsx` | M | ✅ |
| **11** | `gruppo.storia` con timer 24h+30g, transizione visibile → Diario | `StoriaScreen.tsx`, helper `isStoryStillActive(group, now)` | M | ✅ |
| **12** | `mondo.classifica` da utenti a **percorsi** (sorting likes/saves/nav, filtri) | `ClassificaScreen.tsx` (riscrittura) | M | ✅ |
| **13** | `mondo.feed` filtro "anche per auto" + filtro area + filtro tag | `FeedScreen.tsx` | S | ✅ (alsoForCars; area/tag deferred) |
| **14** | Fullscreen `navigation.live` (placeholder Mapbox con simulazione, no token reale) | nuovo `app/navigation/page.tsx` o state fullscreen in AppShell | L | ✅ |
| **15** | Profilo accessibile da drawer (riusa ProfiloScreen, niente nav) | routing client-side dentro AppShell | S | ✅ |

Dopo Step 15 → review visivo su Vercel insieme → eventuali fix. **Punto raggiunto.**

---

## 5. Cosa NON facciamo in questo refactor (parking lot)

- ❌ Autenticazione reale (login/signup/recovery): la sessione resta mockata su Ray.
- ❌ Mapbox vero con token: la `navigation.live` è una simulazione visuale.
- ❌ GPX import reale: bottone esiste ma il parse è simulato.
- ❌ Meteo reale: card meteo in Home è statica/mock.
- ❌ Notifiche push reali: bell icon + drawer con lista lette/non lette, niente FCM.
- ❌ Admin operations DB-level (cancellazione gruppo, ban utenti): le UI ci sono, le mutations sono client-only.

---

## 6. Dopo il refactor — sincronizzazione Excel

Quando i 15 step sono done e Ray ha visto/approvato:

1. **Creare nuovo Excel** `docs/sources/spec_v2.xlsx` (o aggiornare l'esistente).
2. Allineare i 9 fogli per area alla nuova struttura:
   - HOME: funzioni dal prototipo HTML + Excel originale che hanno senso ora
   - IO/MAPPA: archivio percorsi (semantica nuova)
   - IO/REGISTRA: 4 sotto-flussi
   - GRUPPO/*: politiche admin, proposte, bacheca, navigatore designato, Storia 24h+30g
   - MONDO/CLASSIFICA: classifica percorsi (criteri di ranking)
   - MONDO/FEED: filtri (alsoForCars, area, tag)
   - eccetera.
3. Scrivere/aggiornare il foglio `21_Flussi_E2E.md` (e tutti i Test Cases) per coprire:
   - Onboarding rider
   - Crea percorso a mano → pubblica su Mondo
   - Tracking GPS → salva activity → pubblica
   - Naviga verso destinazione (con tracking sotto)
   - Importa GPX → archivia
   - Richiedi iscrizione gruppo → admin accetta
   - Membro propone percorso → admin valida → diventa evento
   - Evento → conferme presenza → cordata → storia → diario
   - Salva percorso da Feed → archivio personale
   - Hamburger → impostazioni privacy

4. Lo schema Backend (Supabase) si scrive **dal nuovo Excel**, non da quello vecchio.

---

## 7. Stato dei file di sessione (per reset rapido)

- `docs/INCONSISTENCIES.md` — divergenze attuali, 6 voci. **F-001 ancora aperta** (l'Excel aveva 8 aree flat, ora il nostro modello è 3 pillars con sotto-aree; la nuova versione dell'Excel allineerà). **F-006 risolta** (3 pillars adottati).
- `docs/PLAN.md` — questo file, fonte di verità del refactor in corso.
- `docs/GAP_ANALYSIS.md` — non creato. Sostituito da questo PLAN.md perché abbiamo scelto un approccio di restructure invece che gap-fill puntuale.
