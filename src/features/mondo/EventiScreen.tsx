"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useQuery } from "@/mocks/DbProvider";
import { listEvents, getProfile, getMyEventRSVP } from "@/mocks/queries";
import type { EventKind, PublicEvent } from "@/types/domain";

const KINDS: Array<{ k: "all" | EventKind; label: string }> = [
  { k: "all",       label: "Tutti" },
  { k: "raduno",    label: "Raduni" },
  { k: "track_day", label: "Track day" },
  { k: "viaggio",   label: "Viaggi" },
  { k: "corso",     label: "Corsi" },
  { k: "fiera",     label: "Fiere" },
];

export function EventiScreen() {
  const [kind, setKind] = useState<"all" | EventKind>("all");
  const events = useQuery((db, _uid, now) => listEvents(db, { nowIso: now, timeframe: "upcoming" }));
  const past = useQuery((db, _uid, now) => listEvents(db, { nowIso: now, timeframe: "past" }));

  const filtered = kind === "all" ? events : events.filter((e) => e.kind === kind);

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-info">
          ▸ Eventi
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          In giro, aperti
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {filtered.length} in programma · {past.length} passati
        </p>
      </section>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {KINDS.map((k) => (
          <Chip key={k.k} active={kind === k.k} onClick={() => setKind(k.k)}>
            {k.label}
          </Chip>
        ))}
      </div>

      <section>
        <SectionLabel num="01">Prossimi</SectionLabel>
        <div className="flex flex-col gap-3">
          {filtered.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-line bg-panel p-6 text-center text-sm text-ink-dim">
              Nessun evento in programma di questo tipo.
            </div>
          )}
        </div>
      </section>

      {past.length > 0 && (
        <section>
          <SectionLabel num="02">Passati recenti</SectionLabel>
          <div className="flex flex-col gap-2">
            {past.slice(0, 3).map((e) => (
              <div key={e.id} className="rounded-xl border border-line bg-panel/60 p-3 opacity-80">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-sm font-semibold">{e.title}</span>
                  <span className="font-mono text-[10px] text-ink-mute">
                    {new Date(e.startAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                  </span>
                </div>
                <div className="text-[11px] text-ink-dim">{e.location}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EventCard({ event }: { event: PublicEvent }) {
  const organizer = useQuery((db) => getProfile(db, event.organizerId));
  const myRsvp = useQuery((db, userId) => getMyEventRSVP(db, event.id, userId));
  const cover = `hsl(${event.coverHue} 60% 35%)`;

  const kindLabel: Record<EventKind, string> = {
    raduno: "Raduno",
    track_day: "Track day",
    viaggio: "Viaggio",
    corso: "Corso",
    fiera: "Fiera",
  };

  const duration =
    event.endAt && event.endAt !== event.startAt
      ? `${Math.max(
          1,
          Math.round(
            (new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / 86_400_000,
          ),
        )} gg`
      : "1 g";

  return (
    <Card>
      <div
        className="relative -mx-4 -mt-4 mb-3 h-20 overflow-hidden rounded-t-xl"
        style={{
          background: `linear-gradient(135deg, ${cover} 0%, #050403 100%)`,
        }}
      >
        <div className="absolute inset-0 px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.22em]"
              style={{ color: `hsl(${event.coverHue} 80% 75%)` }}
            >
              {kindLabel[event.kind]}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
              {duration}
            </span>
          </div>
          <div className="mt-1 font-display text-lg font-semibold">{event.title}</div>
        </div>
      </div>

      <p className="text-sm text-ink-dim">{event.description}</p>

      <div className="mt-3 flex items-center justify-between text-[11px]">
        <div>
          <div className="font-mono uppercase tracking-widest text-ink-mute">
            {new Date(event.startAt).toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" })}
          </div>
          <div className="text-ink-dim">{event.location}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-sm text-ink">{event.attendeesCount}</div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-ink-mute">partecipanti</div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <span className="mr-auto text-[11px] text-ink-dim">
          org. <span className="text-ink">{organizer?.displayName}</span>
        </span>
        <Chip size="sm" active={myRsvp?.value === "interested"}>Interessato</Chip>
        <Chip size="sm" active={myRsvp?.value === "going"}>Vado</Chip>
      </div>
    </Card>
  );
}
