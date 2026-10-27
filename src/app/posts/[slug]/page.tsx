import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GemaraViewer } from "@/app/GemaraViewer";
import { formatDaf } from "@/lib/daf";
import { masechetName, formatPublishedOn, paragraphsOf, readingMinutes } from "@/lib/posts";
import { publicClient } from "@/lib/supabase";
import { RichParagraph } from "@/lib/RichText";
import { recordView } from "@/lib/views";
import { Comments } from "./Comments";
import { StatusCards } from "./StatusCards";
import { PostBody } from "./PostBody";
import { Shortcuts } from "@/app/Shortcuts";
import { loadStatusCards } from "@/lib/status";

export const dynamic = "force-dynamic";

const GEMARA_BUCKET = "gemara";

async function loadPost(slug: string) {
  const db = publicClient();
  const { data: post } = await db
    .from("posts")
    .select("id, slug, daf, published_on, current_version_id, masechtot(name)")
    .eq("slug", slug)
    .eq("publish_state", "published")
    .maybeSingle();
  if (!post?.current_version_id) return null;

  const [{ data: version }, { data: pages }, previous] = await Promise.all([
    db
      .from("post_versions")
      .select("title, body, summary")
      .eq("id", post.current_version_id)
      .maybeSingle(),
    db
      .from("gemara_pages")
      .select("id, label, alt_text, image_path")
      .eq("post_id", post.id)
      .order("sort"),
    loadPrevious(post.published_on, post.id),
  ]);
  if (!version) return null;
  const statusCards = await loadStatusCards(db, post.id);
  const { data: comments } = await db
    .from("comments")
    .select("id, author_name, body, created_at")
    .eq("post_id", post.id)
    .eq("status", "approved")
    .order("created_at");
  return { post, version, pages: pages ?? [], previous, comments: comments ?? [], statusCards };
}

async function loadPrevious(publishedOn: string | null, postId: string) {
  if (!publishedOn) return [];
  const db = publicClient();
  const { data: rows } = await db
    .from("posts")
    .select("slug, daf, published_on, current_version_id, masechtot(name)")
    .eq("publish_state", "published")
    .not("current_version_id", "is", null)
    .lt("published_on", publishedOn)
    .neq("id", postId)
    .order("published_on", { ascending: false })
    .limit(3);
  if (!rows?.length) return [];
  const { data: versions } = await db
    .from("post_versions")
    .select("id, title")
    .in("id", rows.map((r) => r.current_version_id));
  const titles = new Map((versions ?? []).map((v: { id: string; title: string }) => [v.id, v.title]));
  return rows.map((r) => ({
    slug: r.slug as string,
    daf: r.daf as number | null,
    publishedOn: r.published_on as string | null,
    masechtot: r.masechtot,
    title: titles.get(r.current_version_id as string) ?? "",
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const found = await loadPost((await params).slug);
  if (!found) return { title: "לא נמצא" };
  return { title: found.version.title, description: found.version.summary ?? undefined };
}

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ src?: string | string[]; sent?: string; cerror?: string }>;
}) {
  const { slug } = await params;
  const found = await loadPost(slug);
  if (!found) notFound();
  const { post, version, pages, previous, comments, statusCards } = found;
  const query = await searchParams;
  // The redirect after sending a comment is not a new visit.
  if (!query.sent && !query.cerror) await recordView(post.id, query.src);
  const masechet = masechetName(post.masechtot);
  const paragraphs = paragraphsOf(version.body);
  const imageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${GEMARA_BUCKET}`;
  const images = (pages as { id: string; label: string | null; alt_text: string | null; image_path: string }[]).map((p) => ({
    id: p.id,
    url: `${imageBase}/${p.image_path}`,
    label: p.label,
    alt: p.alt_text,
  }));

  const host = (await headers()).get("x-forwarded-host") ?? (await headers()).get("host");
  const shareUrl = host ? `https://${host}/posts/${post.slug}?src=whatsapp` : "";
  const shareText = encodeURIComponent(shareUrl ? `${version.title}\n${shareUrl}` : version.title);
  const intro = paragraphs.slice(0, 2);
  const rest = paragraphs.slice(2);
  const shortcuts = [
    ...(statusCards.length ? [{ href: "#status", title: "הרעיון בקצרה", sub: `${statusCards.length} כרטיסים · דקה` }] : []),
    ...(images.length ? [{ href: "#gemara", title: "דפי הגמרא", sub: "המקור לעיון" }] : []),
    ...(previous.length ? [{ href: "#previous", title: "פוסטים קודמים", sub: "וכל הארכיון" }] : []),
  ];

  return (
    <main className="home">
      <div className="post-layout">
        <article className="post-main post-article">
          <div className="home-meta">
            <Link className="muted back" href="/archive">
              ‹ לארכיון
            </Link>
            {masechet ? <span className="pill">{`${masechet} · דף ${formatDaf(post.daf)}`}</span> : null}
          </div>
          <h1 id="post-top" className="post-title">{version.title}</h1>
          <div className="byline">
            <span className="avatar" aria-hidden="true">
              א
            </span>
            <span>
              <strong>אבי יוניצמן</strong>
              <span className="muted">
                {" "}
                · {formatPublishedOn(post.published_on)} · {readingMinutes(version.body)} דקות קריאה
              </span>
            </span>
          </div>
          <PostBody
            intro={intro.map((text, i) => (
              <RichParagraph key={i} text={text} />
            ))}
            rest={
              rest.length
                ? rest.map((text, i) => <RichParagraph key={i} text={text} />)
                : null
            }
            restMinutes={readingMinutes(rest.join(" "))}
          />
          <Shortcuts items={shortcuts} className="mobile-only" />
        </article>
        <aside className="post-side">
          {images.length ? (
            <div id="gemara">
              <GemaraViewer images={images} />
            </div>
          ) : null}
          {statusCards.length ? <StatusCards cards={statusCards} /> : null}
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
        <div className="post-rest">
          <a className="button-link wide outline" href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noreferrer">
            שיתוף בוואטסאפ
          </a>
          <Comments slug={post.slug} comments={comments} sent={query.sent === "1"} error={query.cerror} />
        </div>
      </div>
    </main>
  );
}
