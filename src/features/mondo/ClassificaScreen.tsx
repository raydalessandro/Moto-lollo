"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useQuery } from "@/mocks/DbProvider";
import {
  listSegments,
  listLeaderboardFor,
  listActiveChallenges,
  listAllBadges,
  listUserBadges,
} from "@/mocks/queries";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}' ${s.toString().padStart(2, "0")}"`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm.toString().padStart(2, "0")}'`;
}

export function ClassificaScreen() {
  const segments = useQuery((db) => listSegments(db));
  const challenges = useQuery((db, _uid, now) => listActiveChallenges(db, now));
  const allBadges = useQuery((db) => listAllBadges(db));
  const myBadges = useQuery((db, userId) => listUserBadges(db, userId));
  const [segmentId, setSegmentId] = useState(segments[0]?.id ?? "");
  const leaderboard = useQuery((db) => (segmentId ? listLeaderboardFor(db, segmentId, 8) : []));
  const segment = segments.find((s) => s.id === segmentId);

  const earnedIds = new Set(myBadges.map((b) => b.badge.id));

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-info">
          ▸ Classifica
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Ti misuri?
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {segments.length} segmenti · {allBadges.length} badge · {challenges.length} sfide attive
        </p>
      </section>

      {challenges.length > 0 && (
        <section>
          <SectionLabel num="01">Sfida del mese</SectionLabel>
          {challenges.map((c) => (
            <Card key={c.id}>
              <div className="flex items-baseline justify-between">
                <div className="font-display text-lg font-semibold">{c.title}</div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-ember">
                  {c.participantsCount} rider
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-dim">{c.description}</p>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-ink-dim">
                <span>
                  {new Date(c.startAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })} →{" "}
                  {new Date(c.endAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                </span>
                {c.targetKm && (
                  <span className="ml-auto">
                    <span className="text-ember">{c.targetKm}</span> km
                  </span>
                )}
              </div>
            </Card>
          ))}
        </section>
      )}

      <section>
        <SectionLabel num="02">Segmenti</SectionLabel>
        <div className="mb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {segments.map((s) => (
            <Chip key={s.id} active={segmentId === s.id} onClick={() => setSegmentId(s.id)}>
              {s.title}
            </Chip>
          ))}
        </div>
        {segment && (
          <Card>
            <div className="mb-3 flex items-baseline justify-between">
              <div>
                <div className="font-display text-base font-semibold">{segment.title}</div>
                <div className="text-[11px] text-ink-dim">{segment.area}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[11px] text-ink">{segment.distanceKm} km</div>
                <div className="font-mono text-[10px] text-ink-mute">+{segment.elevationGainM} m</div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-ink-mute">{segment.surface}</div>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-line/60">
              {leaderboard.map(({ rank, profile, attempt }) => {
                const isMe = profile?.id === "u0";
                return (
                  <div
                    key={attempt.id}
                    className="flex items-center gap-3 py-2"
                    style={{ color: isMe ? "var(--ember)" : "var(--ink)" }}
                  >
                    <span
                      className="w-6 text-right font-mono text-[11px]"
                      style={{
                        color:
                          rank === 1 ? "#c8a24b" :
                          rank === 2 ? "#b8b8b8" :
                          rank === 3 ? "#c88248" :
                          "var(--ink-mute)",
                      }}
                    >
                      {rank}.
                    </span>
                    {profile && (
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold"
                        style={{ background: profile.accentColor, color: "var(--bg)" }}
                      >
                        {profile.initials}
                      </div>
                    )}
                    <span className="flex-1 text-sm">{profile?.displayName}</span>
                    <span className="font-mono text-[11px]">{formatDuration(attempt.durationSeconds)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </section>

      <section>
        <SectionLabel num="03">Badge</SectionLabel>
        <div className="grid grid-cols-4 gap-3">
          {allBadges.map((b) => {
            const earned = earnedIds.has(b.id);
            return (
              <div
                key={b.id}
                className="flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-opacity"
                style={{
                  borderColor: earned ? `${b.accentColor}55` : "var(--line)",
                  background: earned ? `${b.accentColor}15` : "var(--panel)",
                  opacity: earned ? 1 : 0.45,
                }}
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                  style={{ background: earned ? `${b.accentColor}30` : "var(--panel-raised)" }}
                >
                  {b.iconGlyph}
                </div>
                <span className="font-display text-[10px] font-semibold leading-tight">{b.title}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
