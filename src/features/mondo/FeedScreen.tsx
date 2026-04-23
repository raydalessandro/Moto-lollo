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
import type { PublishedRoute } from "@/types/domain";

type FeedFilter = "following" | "all";

export function FeedScreen() {
  const [filter, setFilter] = useState<FeedFilter>("following");
  const feed = useQuery((db, userId) => listFeedFor(db, userId, filter));

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
          {feed.length} contenuti · guida tua o di chi segui
        </p>
      </section>

      <div className="flex gap-2">
        <Chip active={filter === "following"} onClick={() => setFilter("following")}>
          Segui
        </Chip>
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          Tutti
        </Chip>
      </div>

      <section>
        <SectionLabel num="01">Ultimi percorsi</SectionLabel>
        <div className="flex flex-col gap-4">
          {feed.map((p) => (
            <FeedCard key={p.id} route={p} />
          ))}
          {feed.length === 0 && (
            <div className="rounded-xl border border-line bg-panel p-6 text-center text-sm text-ink-dim">
              Nessun contenuto. Segui qualcuno o passa a &ldquo;Tutti&rdquo;.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function FeedCard({ route }: { route: PublishedRoute }) {
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

      <div className="mt-4 flex items-center gap-4 text-[11px] text-ink-dim">
        <span>{route.distanceKm} km</span>
        {route.durationMin && (
          <span>{Math.floor(route.durationMin / 60)}h {route.durationMin % 60}m</span>
        )}
        <span className="ml-auto flex gap-1">
          {route.tags.slice(0, 3).map((t) => (
            <Chip key={t} size="sm">#{t}</Chip>
          ))}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-line pt-3 text-sm">
        <button
          type="button"
          onClick={() => toggleLike(route.id)}
          className="flex items-center gap-1.5 transition-colors"
          style={{ color: liked ? "var(--ember)" : "var(--ink-dim)" }}
        >
          <Icon
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            size={16}
          />
          <span className="font-mono text-[11px]">{likes.length}</span>
        </button>
        <div className="flex items-center gap-1.5 text-ink-dim">
          <Icon
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
            size={16}
          />
          <span className="font-mono text-[11px]">{comments.length}</span>
        </div>
        <button type="button" className="ml-auto flex items-center gap-1.5 text-ink-dim">
          <Icon
            d="M4 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M20 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M20 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M8.59 13.51l6.83 3.98 M15.41 6.51l-6.82 3.98"
            size={16}
          />
        </button>
      </div>

      {comments.length > 0 && (
        <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
          {comments.slice(0, 2).map((c) => (
            <CommentRow key={c.id} authorId={c.authorId} text={c.text} />
          ))}
          {comments.length > 2 && (
            <span className="text-[11px] text-ink-mute">+ {comments.length - 2} altri commenti</span>
          )}
        </div>
      )}
    </Card>
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
