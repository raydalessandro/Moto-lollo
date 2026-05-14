"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Icon } from "@/components/nav/Icon";
import { useQuery } from "@/mocks/DbProvider";
import {
  isAdminOfGroup,
  listUpcomingGroupRides,
  listRouteProposals,
  listMembershipRequests,
  listMyPlannedRoutes,
  listBoardComments,
  getProfile,
  getPlannedRoute,
} from "@/mocks/queries";
import type { Group, GroupRide } from "@/types/domain";

interface PianificaScreenProps {
  group: Group;
  isMember: boolean;
}

export function PianificaScreen({ group, isMember }: PianificaScreenProps) {
  const amAdmin = useQuery((db, userId) => isAdminOfGroup(db, userId, group.id));
  const upcoming = useQuery((db, _uid, now) => listUpcomingGroupRides(db, group.id, now));

  if (!isMember) {
    return (
      <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
        <section>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: group.crestColor }}
          >
            ▸ Pianifica
          </span>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            {group.name}
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            La bacheca eventi è visibile ai soli membri. Iscriviti per vedere
            la pianificazione del gruppo.
          </p>
        </section>
        <div className="rounded-xl border border-dashed border-line bg-panel/60 p-6 text-center text-sm text-ink-dim">
          Sei ospite di {group.name}. Torna su <span className="text-ink">Gruppo</span>{" "}
          per richiedere l&apos;iscrizione.
        </div>
      </div>
    );
  }

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <div className="flex items-baseline justify-between">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: group.crestColor }}
          >
            ▸ Pianifica {amAdmin && "· admin"}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
            {upcoming.length} in bacheca
          </span>
        </div>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
          Eventi {group.name}
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {amAdmin
            ? "Da qui crei eventi, validi i percorsi proposti e gestisci le richieste di iscrizione."
            : "Conferma la presenza alle uscite, commenta in bacheca e proponi percorsi all'admin."}
        </p>
      </section>

      {amAdmin && <AdminQueues group={group} />}
      {!amAdmin && <ProposeRouteCard group={group} />}

      <section>
        <SectionLabel num={amAdmin ? "03" : "02"} action={amAdmin ? "Nuovo evento" : undefined}>
          Bacheca eventi
        </SectionLabel>
        <div className="flex flex-col gap-4">
          {upcoming.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-panel/60 p-6 text-center text-sm text-ink-dim">
              Nessun evento in programma.
            </div>
          ) : (
            upcoming.map((r) => (
              <RideBoardCard key={r.id} ride={r} group={group} amAdmin={amAdmin} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Admin queues ───────────────────────────────────────────────────────────

function AdminQueues({ group }: { group: Group }) {
  const [tab, setTab] = useState<"proposte" | "richieste">("proposte");
  const proposals = useQuery((db) => listRouteProposals(db, group.id, "pending"));
  const requests = useQuery((db) => listMembershipRequests(db, group.id, "pending"));

  if (proposals.length === 0 && requests.length === 0) return null;

  return (
    <section>
      <SectionLabel num="01">Code di moderazione</SectionLabel>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("proposte")}
            className="flex items-center gap-2 rounded-full border px-3 py-1.5"
            style={{
              borderColor: tab === "proposte" ? group.crestColor : "var(--line)",
              background: tab === "proposte" ? `${group.crestColor}15` : "var(--panel)",
              color: tab === "proposte" ? group.crestColor : "var(--ink-dim)",
            }}
          >
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Proposte percorsi
            </span>
            {proposals.length > 0 && (
              <span
                className="rounded-full px-1.5 font-mono text-[10px] font-bold"
                style={{
                  background: tab === "proposte" ? group.crestColor : "var(--line)",
                  color: tab === "proposte" ? "var(--bg)" : "var(--ink-soft)",
                }}
              >
                {proposals.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("richieste")}
            className="flex items-center gap-2 rounded-full border px-3 py-1.5"
            style={{
              borderColor: tab === "richieste" ? group.crestColor : "var(--line)",
              background: tab === "richieste" ? `${group.crestColor}15` : "var(--panel)",
              color: tab === "richieste" ? group.crestColor : "var(--ink-dim)",
            }}
          >
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Iscrizioni
            </span>
            {requests.length > 0 && (
              <span
                className="rounded-full px-1.5 font-mono text-[10px] font-bold"
                style={{
                  background: tab === "richieste" ? group.crestColor : "var(--line)",
                  color: tab === "richieste" ? "var(--bg)" : "var(--ink-soft)",
                }}
              >
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {tab === "proposte" && (
          <div className="flex flex-col gap-2">
            {proposals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-panel/60 p-4 text-center text-sm text-ink-dim">
                Nessuna proposta in attesa.
              </div>
            ) : (
              proposals.map((p) => (
                <ProposalRow key={p.id} proposal={p} group={group} />
              ))
            )}
          </div>
        )}

        {tab === "richieste" && (
          <div className="flex flex-col gap-2">
            {requests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-panel/60 p-4 text-center text-sm text-ink-dim">
                Nessuna richiesta di iscrizione in attesa.
              </div>
            ) : (
              requests.map((r) => (
                <MembershipRequestRow
                  key={r.id}
                  request={r}
                  group={group}
                />
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function ProposalRow({
  proposal,
  group,
}: {
  proposal: { id: string; proposedBy: string; plannedRouteId: string; note?: string; createdAt: string };
  group: Group;
}) {
  const author = useQuery((db) => getProfile(db, proposal.proposedBy));
  const route = useQuery((db) => getPlannedRoute(db, proposal.plannedRouteId));
  const [decision, setDecision] = useState<"pending" | "approved" | "rejected">("pending");

  return (
    <Card>
      <div className="flex items-start gap-3">
        {author && (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: author.accentColor, color: "var(--bg)" }}
          >
            {author.initials}
          </div>
        )}
        <div className="flex-1">
          <div className="font-display text-sm font-semibold">
            {author?.displayName} propone{" "}
            <span style={{ color: group.crestColor }}>{route?.title ?? "—"}</span>
          </div>
          {proposal.note && (
            <p className="mt-1 text-[12px] text-ink-dim">&ldquo;{proposal.note}&rdquo;</p>
          )}
          {route && (
            <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-dim">
              <span>{route.distanceKm} km</span>
              <span>
                {Math.floor(route.estimatedDurationMin / 60)}h {route.estimatedDurationMin % 60}m
              </span>
              <span>{route.waypoints.length} waypoint</span>
            </div>
          )}
        </div>
      </div>

      {decision === "pending" ? (
        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setDecision("rejected")}
            className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-soft hover:border-danger hover:text-danger"
          >
            Rifiuta
          </button>
          <button
            type="button"
            onClick={() => setDecision("approved")}
            className="flex-1 rounded-lg border px-3 py-2 font-mono text-[11px] uppercase tracking-wider"
            style={{
              borderColor: group.crestColor,
              background: `${group.crestColor}15`,
              color: group.crestColor,
            }}
          >
            Approva → evento
          </button>
        </div>
      ) : (
        <div
          className="mt-3 border-t border-line pt-3 font-mono text-[11px] uppercase tracking-wider"
          style={{ color: decision === "approved" ? group.crestColor : "var(--danger)" }}
        >
          {decision === "approved"
            ? `✓ approvata · diventerà evento`
            : `✗ rifiutata`}
        </div>
      )}
    </Card>
  );
}

function MembershipRequestRow({
  request,
  group,
}: {
  request: { id: string; userId: string; createdAt: string };
  group: Group;
}) {
  const user = useQuery((db) => getProfile(db, request.userId));
  const [decision, setDecision] = useState<"pending" | "approved" | "rejected">("pending");

  if (!user) return null;

  return (
    <Card>
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ background: user.accentColor, color: "var(--bg)" }}
        >
          {user.initials}
        </div>
        <div className="flex-1">
          <div className="font-display text-sm font-semibold">{user.displayName}</div>
          <div className="text-[11px] text-ink-dim">
            @{user.username}{user.city && ` · ${user.city}`}
          </div>
          {user.bio && (
            <div className="mt-0.5 text-[11px] text-ink-soft">{user.bio}</div>
          )}
        </div>
      </div>

      {decision === "pending" ? (
        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setDecision("rejected")}
            className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-soft hover:border-danger hover:text-danger"
          >
            Rifiuta
          </button>
          <button
            type="button"
            onClick={() => setDecision("approved")}
            className="flex-1 rounded-lg border px-3 py-2 font-mono text-[11px] uppercase tracking-wider"
            style={{
              borderColor: group.crestColor,
              background: `${group.crestColor}15`,
              color: group.crestColor,
            }}
          >
            Accetta nel gruppo
          </button>
        </div>
      ) : (
        <div
          className="mt-3 border-t border-line pt-3 font-mono text-[11px] uppercase tracking-wider"
          style={{ color: decision === "approved" ? group.crestColor : "var(--danger)" }}
        >
          {decision === "approved" ? "✓ accettata" : "✗ rifiutata"}
        </div>
      )}
    </Card>
  );
}

// ─── Member: propose route ──────────────────────────────────────────────────

function ProposeRouteCard({ group }: { group: Group }) {
  const myRoutes = useQuery((db, userId) => listMyPlannedRoutes(db, userId));
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <section>
        <Card>
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg border"
              style={{
                background: `${group.crestColor}15`,
                borderColor: `${group.crestColor}55`,
                color: group.crestColor,
              }}
            >
              ✓
            </div>
            <div>
              <div className="font-display text-sm font-semibold">
                Proposta inviata
              </div>
              <div className="text-[11px] text-ink-dim">
                Un admin di {group.name} valuterà nelle prossime ore.
              </div>
            </div>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <SectionLabel num="01">Proponi un percorso</SectionLabel>
      <Card>
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex w-full items-center justify-between"
          >
            <div className="text-left">
              <div className="font-display text-sm font-semibold">
                Hai un&apos;idea per un&apos;uscita?
              </div>
              <div className="text-[11px] text-ink-dim">
                Scegli uno dei tuoi percorsi e mandalo all&apos;admin. Se approvato
                diventa un evento del gruppo.
              </div>
            </div>
            <Icon d="M12 5v14 M5 12h14" size={16} className="text-ember" />
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="font-display text-sm font-semibold">
              Quale percorso?
            </div>
            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto scrollbar-hide">
              {myRoutes.map((r) => {
                const isSel = selected === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelected(r.id)}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors"
                    style={{
                      borderColor: isSel ? group.crestColor : "var(--line)",
                      background: isSel ? `${group.crestColor}15` : "var(--panel)",
                    }}
                  >
                    <div>
                      <div className="text-sm font-medium">{r.title}</div>
                      <div className="text-[10px] text-ink-dim">
                        {r.distanceKm} km · {Math.floor(r.estimatedDurationMin / 60)}h{" "}
                        {r.estimatedDurationMin % 60}m
                      </div>
                    </div>
                    {isSel && (
                      <span
                        className="font-mono text-[10px] uppercase tracking-widest"
                        style={{ color: group.crestColor }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota per l'admin (es. perché ti piace, quando lo faresti…)"
              rows={3}
              className="resize-none rounded-lg border border-line bg-bg p-3 text-sm focus:border-ember/60 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSelected(null);
                  setNote("");
                }}
                className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-soft"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={!selected}
                onClick={() => setSubmitted(true)}
                className="flex-1 rounded-lg border px-3 py-2 font-mono text-[11px] uppercase tracking-wider disabled:opacity-40"
                style={{
                  borderColor: group.crestColor,
                  background: `${group.crestColor}20`,
                  color: group.crestColor,
                }}
              >
                Invia all&apos;admin
              </button>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}

// ─── Ride board card with bacheca comments ──────────────────────────────────

function RideBoardCard({
  ride,
  group,
  amAdmin,
}: {
  ride: GroupRide;
  group: Group;
  amAdmin: boolean;
}) {
  const comments = useQuery((db) => listBoardComments(db, ride.id));
  const [boardOpen, setBoardOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [posted, setPosted] = useState<Array<{ id: string; text: string }>>([]);

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="font-display text-base font-semibold">{ride.title}</div>
          <div className="text-sm text-ink-dim">{ride.meetupText}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm">
            {new Date(ride.startAt).toLocaleDateString("it-IT", { weekday: "short", day: "2-digit" })}
          </div>
          <div
            className="font-mono text-[11px]"
            style={{ color: group.crestColor }}
          >
            {new Date(ride.startAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-ink-dim">
        <span>
          {ride.distanceKm > 0
            ? `${ride.distanceKm} km · ${Math.floor(ride.estimatedDurationMin / 60)}h`
            : "Pista"}
        </span>
        <span>
          <span style={{ color: group.crestColor }}>{ride.confirmedCount}</span>/
          {ride.invitedCount} confermati
        </span>
        <Chip size="sm" active={ride.status === "confermata"}>
          {ride.status}
        </Chip>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <button
          type="button"
          className="flex-1 rounded-lg border px-3 py-2 font-mono text-[11px] uppercase tracking-wider"
          style={{
            borderColor: group.crestColor,
            background: `${group.crestColor}15`,
            color: group.crestColor,
          }}
        >
          Confermo presenza
        </button>
        <button
          type="button"
          onClick={() => setBoardOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-soft hover:border-line-soft"
        >
          <Icon
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
            size={12}
          />
          {comments.length + posted.length}
        </button>
        {amAdmin && (
          <button
            type="button"
            className="rounded-lg border border-line bg-panel px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-soft hover:border-line-soft"
            title="Modifica evento"
          >
            …
          </button>
        )}
      </div>

      {boardOpen && (
        <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
            ▸ bacheca
          </div>
          <div className="flex flex-col gap-1.5">
            {comments.map((c) => (
              <BoardCommentRow key={c.id} authorId={c.authorId} text={c.text} />
            ))}
            {posted.map((p) => (
              <BoardCommentRow key={p.id} authorId="u0" text={p.text} />
            ))}
            {comments.length === 0 && posted.length === 0 && (
              <div className="text-[11px] text-ink-dim">Nessun commento ancora.</div>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Scrivi in bacheca…"
              className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:border-ember/60 focus:outline-none"
            />
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={() => {
                if (!draft.trim()) return;
                setPosted((arr) => [
                  ...arr,
                  { id: `local_${Date.now()}`, text: draft.trim() },
                ]);
                setDraft("");
              }}
              className="rounded-lg border px-3 py-2 font-mono text-[11px] uppercase tracking-wider disabled:opacity-40"
              style={{
                borderColor: group.crestColor,
                background: `${group.crestColor}15`,
                color: group.crestColor,
              }}
            >
              invia
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function BoardCommentRow({
  authorId,
  text,
}: {
  authorId: string;
  text: string;
}) {
  const author = useQuery((db) => getProfile(db, authorId));
  return (
    <div className="flex items-start gap-2 text-[12px] leading-relaxed">
      {author && (
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold"
          style={{ background: author.accentColor, color: "var(--bg)" }}
        >
          {author.initials}
        </div>
      )}
      <div>
        <span className="font-semibold text-ink">{author?.displayName}</span>{" "}
        <span className="text-ink-soft">{text}</span>
      </div>
    </div>
  );
}
