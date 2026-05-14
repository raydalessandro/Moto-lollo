"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Icon } from "@/components/nav/Icon";
import { useQuery } from "@/mocks/DbProvider";
import {
  listPastGroupRides,
  listUpcomingGroupRides,
  listGroupMembers,
  getActivity,
  getProfile,
} from "@/mocks/queries";
import type { Group, GroupRide } from "@/types/domain";

interface StoriaScreenProps {
  group: Group;
}

/**
 * Storia → Diario lifecycle (PLAN.md §1.4):
 *   - The most recent "completata" ride is the Storia.
 *   - It stays visible until 24h BEFORE the next scheduled ride.
 *   - Hard cap: 30 days from the Storia's own startAt.
 *   - When the deadline passes, the Storia becomes a Diario entry.
 */
function evaluateStory(
  ride: GroupRide,
  nextRide: GroupRide | undefined,
  nowIso: string,
): { active: true; reason: "before-next" | "no-next" } | {
  active: false;
  reason: "after-next" | "too-old";
  deadline: string;
} {
  const startedMs = new Date(ride.startAt).getTime();
  const nowMs = new Date(nowIso).getTime();
  const HARD_CAP_DAYS = 30;
  const hardCapMs = startedMs + HARD_CAP_DAYS * 86_400_000;

  if (nowMs > hardCapMs) {
    return { active: false, reason: "too-old", deadline: new Date(hardCapMs).toISOString() };
  }

  if (!nextRide) {
    return { active: true, reason: "no-next" };
  }

  const nextStartMs = new Date(nextRide.startAt).getTime();
  const switchoverMs = nextStartMs - 24 * 60 * 60 * 1000;

  if (nowMs >= switchoverMs) {
    return { active: false, reason: "after-next", deadline: new Date(switchoverMs).toISOString() };
  }

  return { active: true, reason: "before-next" };
}

export function StoriaScreen({ group }: StoriaScreenProps) {
  const past = useQuery((db, _uid, now) => listPastGroupRides(db, group.id, now));
  const upcoming = useQuery((db, _uid, now) => listUpcomingGroupRides(db, group.id, now));
  const now = useQuery((_db, _uid, now) => now);

  const recent = past.find((r) => r.status === "completata");
  const nextRide = upcoming[0];

  if (!recent) {
    return (
      <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
        <section>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: group.crestColor }}
          >
            ▸ Storia · {group.name}
          </span>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Nessuna storia ancora
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            Quando il gruppo completa una uscita, qui appare la sua storia.
          </p>
        </section>
      </div>
    );
  }

  const status = evaluateStory(recent, nextRide, now);

  if (!status.active) {
    return <StoryClosed group={group} ride={recent} reason={status.reason} />;
  }

  return (
    <ActiveStory
      group={group}
      ride={recent}
      nextRide={nextRide}
      reason={status.reason}
      now={now}
    />
  );
}

// ─── Active Storia (within window) ──────────────────────────────────────────

function ActiveStory({
  group,
  ride,
  nextRide,
  reason,
  now,
}: {
  group: Group;
  ride: GroupRide;
  nextRide: GroupRide | undefined;
  reason: "before-next" | "no-next";
  now: string;
}) {
  const members = useQuery((db) => listGroupMembers(db, group.id));
  const activityId = ride.activityIds[0];
  const activity = useQuery((db) =>
    activityId ? getActivity(db, activityId) : undefined,
  );
  const [draftComment, setDraftComment] = useState("");
  const [comments, setComments] = useState<Array<{ id: string; text: string; authorId: string }>>([
    // A bit of seed for the demo. Real comments would arrive from the DB.
    { id: "sc1", authorId: "u_marco",  text: "Cordata top, ritmo perfetto." },
    { id: "sc2", authorId: "u_giulia", text: "Mando le foto al passo nel pomeriggio." },
    { id: "sc3", authorId: "u_luca",   text: "Caffè a Edolo top, ci torniamo." },
  ]);

  const closesOn = (() => {
    if (reason === "no-next") {
      // 30-day hard cap from ride.startAt
      return new Date(new Date(ride.startAt).getTime() + 30 * 86_400_000);
    }
    // 24h before nextRide.startAt
    return new Date(new Date(nextRide!.startAt).getTime() - 24 * 60 * 60 * 1000);
  })();
  const hoursToClose = Math.max(
    0,
    Math.round((closesOn.getTime() - new Date(now).getTime()) / 3_600_000),
  );

  const partecipanti = members.slice(0, ride.confirmedCount);

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <div className="flex items-baseline justify-between">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: group.crestColor }}
          >
            ▸ Storia · {group.name}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
            chiude tra {hoursToClose}h
          </span>
        </div>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
          {ride.title}
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {new Date(ride.startAt).toLocaleDateString("it-IT", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })}
          {" · "}
          {ride.meetupText}
        </p>
      </section>

      <section>
        <Card>
          <div className="grid grid-cols-3 gap-3">
            <Stat value={ride.distanceKm} unit="km" label="Distanza" />
            <Stat value={Math.floor(ride.estimatedDurationMin / 60)} unit="h" label="Durata" />
            <Stat value={ride.confirmedCount} label="Partecipanti" />
          </div>
        </Card>
      </section>

      {activity && (
        <section>
          <SectionLabel num="01">Replay</SectionLabel>
          <Card>
            <div className="text-[11px] text-ink-dim">
              Tratto da: <span className="text-ink">{activity.title}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {activity.tags.map((t) => (
                <Chip key={t} size="sm">#{t}</Chip>
              ))}
            </div>
            <div
              className="mt-4 flex h-28 items-center justify-center rounded-lg border border-line"
              style={{ background: "linear-gradient(180deg, #120e0a 0%, #060503 100%)" }}
            >
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                replay polyline · animato (drawRoute)
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-[11px]">
              <div>
                <div className="font-mono text-ink">{activity.distanceKm} km</div>
                <div className="text-ink-mute">totali</div>
              </div>
              <div>
                <div className="font-mono text-ink">
                  {Math.round(activity.avgSpeedKmh)} km/h
                </div>
                <div className="text-ink-mute">media</div>
              </div>
              <div>
                <div className="font-mono text-ink">+{activity.elevationGainM ?? 0} m</div>
                <div className="text-ink-mute">dislivello</div>
              </div>
            </div>
          </Card>
        </section>
      )}

      <section>
        <SectionLabel num="02" action="Aggiungi">Foto</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="aspect-square overflow-hidden rounded-lg border border-line"
              style={{
                background: `linear-gradient(135deg, ${group.crestColor}25 0%, var(--panel) 80%)`,
              }}
            >
              <div className="flex h-full items-center justify-center">
                <Icon
                  d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                  size={20}
                  className="text-ink-mute"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel num="03">Chi c&apos;era</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {partecipanti.map(({ profile, role }) =>
            profile ? (
              <div
                key={profile.id}
                className="flex items-center gap-2 rounded-full border border-line bg-panel px-2 py-1"
              >
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold"
                  style={{ background: profile.accentColor, color: "var(--bg)" }}
                >
                  {profile.initials}
                </div>
                <span className="text-[11px]">{profile.displayName}</span>
                {role === "leader" && (
                  <span
                    className="font-mono text-[9px] uppercase tracking-widest"
                    style={{ color: group.crestColor }}
                  >
                    · leader
                  </span>
                )}
              </div>
            ) : null,
          )}
        </div>
      </section>

      <section>
        <SectionLabel num="04">Commenti</SectionLabel>
        <Card>
          <div className="flex flex-col gap-2">
            {comments.map((c) => (
              <CommentRow key={c.id} authorId={c.authorId} text={c.text} />
            ))}
            <div className="mt-2 flex items-center gap-2 border-t border-line pt-3">
              <input
                type="text"
                value={draftComment}
                onChange={(e) => setDraftComment(e.target.value)}
                placeholder="Aggiungi un commento…"
                className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:border-ember/60 focus:outline-none"
              />
              <button
                type="button"
                disabled={!draftComment.trim()}
                onClick={() => {
                  if (!draftComment.trim()) return;
                  setComments((arr) => [
                    ...arr,
                    {
                      id: `local_${Date.now()}`,
                      authorId: "u0",
                      text: draftComment.trim(),
                    },
                  ]);
                  setDraftComment("");
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
        </Card>
      </section>

      <section>
        <div className="rounded-xl border border-dashed border-line bg-panel/60 p-3 text-center font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          ▸ questa storia si chiuderà{" "}
          {reason === "before-next" && nextRide
            ? `24h prima della prossima uscita (${closesOn.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" })})`
            : `dopo 30 giorni dall'inizio (${closesOn.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })})`}
        </div>
      </section>
    </div>
  );
}

function CommentRow({ authorId, text }: { authorId: string; text: string }) {
  const author = useQuery((db) => getProfile(db, authorId));
  return (
    <div className="flex items-start gap-2 text-[12px] leading-relaxed">
      {author && (
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
          style={{ background: author.accentColor, color: "var(--bg)" }}
        >
          {author.initials}
        </div>
      )}
      <div className="flex-1">
        <span className="font-semibold text-ink">{author?.displayName}</span>{" "}
        <span className="text-ink-soft">{text}</span>
      </div>
    </div>
  );
}

// ─── Storia chiusa → pointer al Diario ──────────────────────────────────────

function StoryClosed({
  group,
  ride,
  reason,
}: {
  group: Group;
  ride: GroupRide;
  reason: "after-next" | "too-old";
}) {
  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.28em]"
          style={{ color: group.crestColor }}
        >
          ▸ Storia · {group.name}
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Storia chiusa
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {reason === "too-old"
            ? `Sono passati più di 30 giorni dall'uscita "${ride.title}".`
            : `Si avvicina la prossima uscita di ${group.name}: l'ultima storia è stata archiviata.`}
        </p>
      </section>

      <section>
        <Card>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg border"
              style={{
                background: `${group.crestColor}15`,
                borderColor: `${group.crestColor}55`,
                color: group.crestColor,
              }}
            >
              <Icon
                d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M4 19.5V4a2 2 0 0 1 2-2h14v15 M6.5 17H20v5H6.5a2.5 2.5 0 0 1 0-5z"
                size={18}
              />
            </div>
            <div className="flex-1">
              <div className="font-display text-sm font-semibold">
                Ora vive nel Diario
              </div>
              <div className="text-[11px] text-ink-dim">
                Tutte le foto, i commenti e il replay restano accessibili
                dall&apos;archivio del gruppo.
              </div>
            </div>
            <Icon d="M9 18l6-6-6-6" size={14} className="text-ink-mute" />
          </div>
        </Card>
      </section>

      <section>
        <SectionLabel num="01">Come funziona</SectionLabel>
        <ul className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4 text-sm text-ink-soft">
          {[
            "La Storia mostra l'ultima uscita del gruppo, viva e commentabile.",
            "Resta aperta fino a 24h prima del prossimo evento del gruppo.",
            "Tetto assoluto: 30 giorni dall'inizio dell'uscita.",
            "Dopo, il contenuto passa nel Diario — sola lettura.",
          ].map((b, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="mt-[7px] inline-block h-[5px] w-[5px] shrink-0 rounded-full"
                style={{ background: group.crestColor }}
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
