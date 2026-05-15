"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Icon } from "@/components/nav/Icon";
import { useDb, useQuery } from "@/mocks/DbProvider";
import {
  listFeedFor,
  getProfile,
  listLikesFor,
  listCommentsFor,
  hasLiked,
} from "@/mocks/queries";
import type { PublishedRoute, FeedMedia } from "@/types/domain";

type FeedFilter = "following" | "all";

export function FeedScreen() {
  const [filter, setFilter] = useState<FeedFilter>("following");
  const [onlyCars, setOnlyCars] = useState(false);
  const feed = useQuery((db, userId) => listFeedFor(db, userId, filter));
  // onlyCars filter: solo i percorsi (route, non post) con alsoForCars=true
  const visible = onlyCars
    ? feed.filter((p) => p.kind === "route" && p.alsoForCars)
    : feed;

  return (
    <div className="screen-enter flex flex-col gap-6 p-5 pb-24">
      <section>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-info">
          ▸ Mondo · community
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Feed
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {visible.length} contenuti · guida tua o di chi segui
        </p>
      </section>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Chip active={filter === "following"} onClick={() => setFilter("following")}>
            Segui
          </Chip>
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            Tutti
          </Chip>
        </div>
        <button
          type="button"
          onClick={() => setOnlyCars((v) => !v)}
          className="flex items-center justify-between rounded-xl border bg-panel px-3 py-2 transition-colors"
          style={{
            borderColor: onlyCars ? "var(--info)" : "var(--line)",
            background: onlyCars ? "rgba(107, 176, 255, 0.08)" : "var(--panel)",
          }}
        >
          <div className="flex items-center gap-2 text-left">
            <Icon
              d="M5 17h14 M5 17l2-7h10l2 7 M7 17v3 M17 17v3 M7 10V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v5"
              size={14}
              className={onlyCars ? "text-info" : "text-ink-dim"}
            />
            <span
              className="text-[12px] font-medium"
              style={{ color: onlyCars ? "var(--info)" : "var(--ink-soft)" }}
            >
              Solo percorsi anche per auto
            </span>
          </div>
          <span
            className="relative inline-block h-5 w-9 rounded-full transition-colors"
            style={{ background: onlyCars ? "var(--info)" : "var(--line)" }}
          >
            <span
              className="absolute top-0.5 block h-4 w-4 rounded-full bg-bg transition-transform"
              style={{ left: onlyCars ? "calc(100% - 18px)" : "2px" }}
            />
          </span>
        </button>
      </div>

      <section>
        <SectionLabel num="01">Ultimi contenuti</SectionLabel>
        <div className="flex flex-col gap-4">
          {visible.map((p) =>
            p.kind === "post" ? (
              <PostCard key={p.id} item={p} />
            ) : (
              <RouteCard key={p.id} route={p} />
            ),
          )}
          {visible.length === 0 && (
            <div className="rounded-xl border border-line bg-panel p-6 text-center text-sm text-ink-dim">
              {onlyCars
                ? "Nessun percorso adatto anche alle auto in questo feed."
                : "Nessun contenuto. Segui qualcuno o passa a “Tutti”."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Card "route" (com'era) ──────────────────────────────────────────────────

function RouteCard({ route }: { route: PublishedRoute }) {
  const { toggleLike } = useDb();
  const author = useQuery((db) => getProfile(db, route.ownerId));
  const likes = useQuery((db) => listLikesFor(db, route.id));
  const comments = useQuery((db) => listCommentsFor(db, route.id));
  const liked = useQuery((db, userId) => hasLiked(db, route.id, userId));

  return (
    <Card>
      <div
        className="relative -mx-4 -mt-4 mb-4 overflow-hidden rounded-t-xl"
        style={{
          background: `linear-gradient(135deg, ${route.heroColor ?? "#ff6a1f"}35 0%, transparent 80%)`,
          borderBottom: `1px solid ${route.heroColor ?? "#ff6a1f"}22`,
        }}
      >
        <div className="flex items-baseline justify-between gap-3 px-4 py-4">
          <div>
            <div className="flex items-center gap-2">
              {author && (
                <>
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold"
                    style={{ background: author.accentColor, color: "var(--bg)" }}
                  >
                    {author.initials}
                  </div>
                  <span className="text-[11px] text-ink">{author.displayName}</span>
                </>
              )}
              <span className="font-mono text-[9px] uppercase tracking-widest text-ink-mute">
                · {route.area}
              </span>
            </div>
            <div className="mt-1 font-display text-lg font-semibold">{route.title}</div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
            {new Date(route.publishedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
          </span>
        </div>
      </div>

      {route.coverText && (
        <p className="text-sm text-ink-soft">&ldquo;{route.coverText}&rdquo;</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-ink-dim">
        <span>{route.distanceKm} km</span>
        {route.durationMin && (
          <span>{Math.floor(route.durationMin / 60)}h {route.durationMin % 60}m</span>
        )}
        {route.alsoForCars && (
          <span className="flex items-center gap-1 text-info">
            <Icon
              d="M5 17h14 M5 17l2-7h10l2 7 M7 17v3 M17 17v3 M7 10V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v5"
              size={11}
            />
            anche auto
          </span>
        )}
        <span className="ml-auto flex gap-1">
          {route.tags.slice(0, 3).map((t) => (
            <Chip key={t} size="sm">#{t}</Chip>
          ))}
        </span>
      </div>

      <ActionBar
        routeId={route.id}
        liked={liked}
        likes={likes.length}
        comments={comments.length}
        onToggleLike={() => toggleLike(route.id)}
      />

      {comments.length > 0 && <CommentsTail comments={comments} />}
    </Card>
  );
}

// ─── Card "post" — text + foto + opzionale percorso linked ──────────────────

function PostCard({ item }: { item: PublishedRoute }) {
  const { toggleLike } = useDb();
  const author = useQuery((db) => getProfile(db, item.ownerId));
  const likes = useQuery((db) => listLikesFor(db, item.id));
  const comments = useQuery((db) => listCommentsFor(db, item.id));
  const liked = useQuery((db, userId) => hasLiked(db, item.id, userId));

  const hasLinkedRoute = !!item.sourceId;

  return (
    <Card>
      {/* Header: autore + data, niente gradient grande */}
      <div className="-mt-1 mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {author && (
            <>
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: author.accentColor, color: "var(--bg)" }}
              >
                {author.initials}
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-medium text-ink">
                  {author.displayName}
                </span>
                {item.area && (
                  <span className="font-mono text-[9px] uppercase tracking-widest text-ink-mute">
                    · {item.area}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          {new Date(item.publishedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
        </span>
      </div>

      {/* Title (opzionale per i post — fa da "subject") */}
      {item.title && (
        <p className="mb-2 font-display text-base font-semibold leading-snug">
          {item.title}
        </p>
      )}

      {/* Body */}
      {item.body && (
        <p className="text-sm leading-relaxed text-ink-soft">{item.body}</p>
      )}

      {/* Photos */}
      {item.media.length > 0 && (
        <div className="mt-3 -mx-4 overflow-hidden">
          <PhotoGrid media={item.media} />
        </div>
      )}

      {/* Linked route chip */}
      {hasLinkedRoute && (
        <button
          type="button"
          className="mt-3 flex w-full items-center gap-3 rounded-lg border border-ember/40 bg-ember/8 px-3 py-2 text-left transition-colors hover:bg-ember/12"
          style={{ background: "rgba(255, 106, 31, 0.06)" }}
        >
          <Icon d="M3 11l19-9-9 19-2-8z" size={14} className="text-ember" />
          <div className="flex-1">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ember">
              Percorso linked
            </p>
            <p className="text-[12px] text-ink">
              {item.distanceKm} km{item.durationMin ? ` · ${Math.floor(item.durationMin / 60)}h ${(item.durationMin % 60).toString().padStart(2, "0")}` : ""}
              {item.area ? ` · ${item.area}` : ""}
            </p>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-ember">
            naviga →
          </span>
        </button>
      )}

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {item.tags.slice(0, 4).map((t) => (
            <Chip key={t} size="sm">#{t}</Chip>
          ))}
        </div>
      )}

      <ActionBar
        routeId={item.id}
        liked={liked}
        likes={likes.length}
        comments={comments.length}
        onToggleLike={() => toggleLike(item.id)}
      />

      {comments.length > 0 && <CommentsTail comments={comments} />}
    </Card>
  );
}

// ─── Photo grid (placeholder via gradient blocks) ────────────────────────────

function PhotoGrid({ media }: { media: FeedMedia[] }) {
  if (media.length === 1) {
    return <PhotoTile media={media[0]} className="aspect-[16/10]" />;
  }
  if (media.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-px bg-line">
        <PhotoTile media={media[0]} className="aspect-square" />
        <PhotoTile media={media[1]} className="aspect-square" />
      </div>
    );
  }
  // 3+
  return (
    <div className="grid grid-cols-3 gap-px bg-line">
      {media.slice(0, 3).map((m, i) => (
        <PhotoTile key={i} media={m} className="aspect-square" />
      ))}
    </div>
  );
}

function PhotoTile({ media, className }: { media: FeedMedia; className: string }) {
  // Parsing "ph:label:#color" — placeholder fino a quando arriva storage vero.
  const parts = media.url.startsWith("ph:") ? media.url.slice(3).split(":") : [];
  const label = parts[0] ?? "foto";
  const color = parts[1] ?? "#ff6a1f";
  return (
    <div
      className={`relative flex items-end ${className}`}
      style={{
        background: `linear-gradient(135deg, ${color}55 0%, ${color}15 60%, #050403 100%)`,
      }}
    >
      <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-bg/40 backdrop-blur-sm">
        <Icon
          d="M23 19V5a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2z M8.5 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M21 15l-5-5L5 21"
          size={11}
          className="text-ink/70"
        />
      </div>
      {media.caption && (
        <p className="relative w-full bg-gradient-to-t from-black/70 to-transparent px-2 pb-1 pt-4 text-[10px] text-ink-soft">
          {media.caption}
        </p>
      )}
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-widest text-ink-mute/60">
        {label}
      </span>
    </div>
  );
}

// ─── Shared action bar + commenti tail ──────────────────────────────────────

function ActionBar({
  liked,
  likes,
  comments,
  onToggleLike,
}: {
  routeId: string;
  liked: boolean;
  likes: number;
  comments: number;
  onToggleLike: () => void;
}) {
  return (
    <div className="mt-4 flex items-center gap-4 border-t border-line pt-3 text-sm">
      <button
        type="button"
        onClick={onToggleLike}
        className="flex items-center gap-1.5 transition-colors"
        style={{ color: liked ? "var(--ember)" : "var(--ink-dim)" }}
      >
        <Icon
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          size={16}
        />
        <span className="font-mono text-[11px]">{likes}</span>
      </button>
      <div className="flex items-center gap-1.5 text-ink-dim">
        <Icon
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
          size={16}
        />
        <span className="font-mono text-[11px]">{comments}</span>
      </div>
      <button type="button" className="ml-auto flex items-center gap-1.5 text-ink-dim">
        <Icon
          d="M4 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M20 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M20 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M8.59 13.51l6.83 3.98 M15.41 6.51l-6.82 3.98"
          size={16}
        />
      </button>
    </div>
  );
}

function CommentsTail({
  comments,
}: {
  comments: Array<{ id: string; authorId: string; text: string }>;
}) {
  return (
    <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
      {comments.slice(0, 2).map((c) => (
        <CommentRow key={c.id} authorId={c.authorId} text={c.text} />
      ))}
      {comments.length > 2 && (
        <span className="text-[11px] text-ink-mute">+ {comments.length - 2} altri commenti</span>
      )}
    </div>
  );
}

function CommentRow({ authorId, text }: { authorId: string; text: string }) {
  const author = useQuery((db) => getProfile(db, authorId));
  return (
    <div className="text-[12px] leading-relaxed">
      <span className="font-semibold text-ink">{author?.displayName}</span>{" "}
      <span className="text-ink-soft">{text}</span>
    </div>
  );
}
