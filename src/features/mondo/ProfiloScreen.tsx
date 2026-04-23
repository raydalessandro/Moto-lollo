"use client";

import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useQuery } from "@/mocks/DbProvider";
import {
  getProfile,
  listMyMotorcycles,
  listMyActivities,
  listFollowers,
  listFollowing,
  listUserBadges,
} from "@/mocks/queries";

export function ProfiloScreen() {
  const me = useQuery((db, userId) => getProfile(db, userId));
  const bikes = useQuery((db, userId) => listMyMotorcycles(db, userId));
  const activities = useQuery((db, userId) => listMyActivities(db, userId));
  const followers = useQuery((db, userId) => listFollowers(db, userId));
  const following = useQuery((db, userId) => listFollowing(db, userId));
  const badges = useQuery((db, userId) => listUserBadges(db, userId));

  if (!me) return null;

  const totalKm = activities.reduce((acc, a) => acc + a.distanceKm, 0);
  const totalHours = activities.reduce((acc, a) => acc + a.durationSeconds / 3600, 0);

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section className="flex flex-col items-center gap-3 pt-4 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full border-2 text-2xl font-bold"
          style={{ background: me.accentColor, color: "var(--bg)", borderColor: me.accentColor }}
        >
          {me.initials}
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold">{me.displayName}</h1>
          <div className="font-mono text-[11px] uppercase tracking-widest text-ink-mute">
            @{me.username}{me.city && ` · ${me.city}`}
          </div>
        </div>
        {me.bio && <p className="max-w-xs text-sm text-ink-dim">{me.bio}</p>}
        <div className="mt-1 flex items-center gap-6 text-[11px] text-ink-dim">
          <span><span className="text-ink">{followers.length}</span> follower</span>
          <span><span className="text-ink">{following.length}</span> segui</span>
        </div>
      </section>

      <section>
        <SectionLabel num="01">Statistiche</SectionLabel>
        <Card>
          <div className="grid grid-cols-3 gap-3">
            <Stat value={activities.length} label="Uscite" />
            <Stat value={totalKm.toFixed(0)} unit="km" label="Percorsi" />
            <Stat value={Math.round(totalHours)} unit="h" label="In sella" />
          </div>
        </Card>
      </section>

      {badges.length > 0 && (
        <section>
          <SectionLabel num="02" action="Tutti">Badge</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {badges.map(({ badge, earnedAt }) => (
              <Card key={badge.id}>
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-lg"
                    style={{
                      background: `${badge.accentColor}22`,
                      borderColor: `${badge.accentColor}55`,
                    }}
                  >
                    {badge.iconGlyph}
                  </div>
                  <div>
                    <div className="font-display text-sm font-semibold">{badge.title}</div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-ink-mute">
                      {new Date(earnedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionLabel num="03" action="Garage">Moto</SectionLabel>
        <Card>
          <div className="flex flex-col gap-1">
            {bikes.map((m) => (
              <div key={m.id} className="flex items-baseline justify-between">
                <span className="text-sm">
                  {m.brand} {m.model}
                  {m.isPrimary && <span className="ml-2 text-[10px] uppercase text-ember">· primaria</span>}
                </span>
                <span className="font-mono text-[11px] text-ink-dim">
                  {m.totalKm.toLocaleString("it-IT")} km
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <SectionLabel num="04">Impostazioni &amp; sicurezza</SectionLabel>
        <ul className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4">
          {[
            "Modifica profilo (nome, bio, avatar)",
            "Preferenze: tema, lingua, unità di misura",
            "Privacy: visibilità attività, chi può commentare",
            "Safety: contatti emergenza, SOS, live sharing",
            "Integrazioni (Strava, Komoot, calendario)",
            "Abbonamento / premium",
            "Cancellazione account",
          ].map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-ink-soft">
              <span className="mt-[7px] inline-block h-[5px] w-[5px] shrink-0 rounded-full bg-ember" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
