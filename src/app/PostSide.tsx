import Link from "next/link";
import { GemaraViewer, type GemaraImageView } from "./GemaraViewer";
import { StatusCards } from "./posts/[slug]/StatusCards";
import { ShortPost } from "./posts/[slug]/ShortPost";
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

// The side column, identical on the home page and the post page: status, short post, Gemara pages, previous posts.
export function PostSide({
  post,
  statusCards,
  shortPost,
  images,
  previous,
  postHref,
}: {
  post: { slug: string; title: string; meta: string };
  statusCards: StatusCard[];
  shortPost: StatusCard[];
  images: GemaraImageView[];
  previous: PreviousPost[];
  postHref?: string;
}) {
  return (
    <aside className="post-side">
      {statusCards.length ? <StatusCards cards={statusCards} post={post} postHref={postHref} /> : null}
      {shortPost.length ? <ShortPost cards={shortPost} post={post} /> : null}
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
