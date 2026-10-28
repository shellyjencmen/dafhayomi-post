import Link from "next/link";
import { GemaraViewer, type GemaraImageView } from "./GemaraViewer";
import { StatusCards } from "./posts/[slug]/StatusCards";
import { formatDaf } from "@/lib/daf";
import { masechetName, formatPublishedOn } from "@/lib/posts";
import type { StatusCard } from "@/lib/status";

export type PreviousPost = {
  slug: string;
  daf: number | null;
  publishedOn: string | null;
  masechtot: { name: string } | { name: string }[] | null;
  title: string;
};

// The side column, identical on the home page and the post page: status, Gemara pages, previous posts.
export function PostSide({
  post,
  statusCards,
  images,
  previous,
  postHref,
}: {
  post: { slug: string; title: string };
  statusCards: StatusCard[];
  images: GemaraImageView[];
  previous: PreviousPost[];
  postHref?: string;
}) {
  return (
    <aside className="post-side">
      {statusCards.length ? <StatusCards cards={statusCards} post={post} postHref={postHref} /> : null}
      {images.length ? (
        <div id="gemara">
          <GemaraViewer images={images} />
        </div>
      ) : null}
      {previous.length ? (
        <section id="previous" className="side-previous">
          <div className="row-between">
            <strong>פוסטים קודמים</strong>
            <Link href="/archive">לכל הארכיון</Link>
          </div>
          {previous.map((p) => {
            const name = masechetName(p.masechtot);
            return (
              <Link key={p.slug} className="card" href={`/posts/${p.slug}`}>
                <span className="muted">
                  {name ? `${name} · דף ${formatDaf(p.daf)} · ` : ""}
                  {formatPublishedOn(p.publishedOn)}
                </span>
                <span className="card-title">{p.title}</span>
              </Link>
            );
          })}
        </section>
      ) : null}
    </aside>
  );
}
