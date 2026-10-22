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
  return { post, version, pages: pages ?? [], previous };
}

async function loadPrevious(publishedOn: string | null, postId: string) {
  if (!publishedOn) return null;
  const db = publicClient();
  const { data: prev } = await db
    .from("posts")
    .select("slug, daf, current_version_id, masechtot(name)")
    .eq("publish_state", "published")
    .not("current_version_id", "is", null)
    .lt("published_on", publishedOn)
    .neq("id", postId)
    .order("published_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!prev) return null;
  const { data: version } = await db.from("post_versions").select("title").eq("id", prev.current_version_id).maybeSingle();
  return { slug: prev.slug as string, daf: prev.daf as number | null, masechtot: prev.masechtot, title: (version?.title as string | undefined) ?? "" };
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
  searchParams: Promise<{ src?: string | string[] }>;
}) {
  const { slug } = await params;
  const found = await loadPost(slug);
  if (!found) notFound();
  const { post, version, pages, previous } = found;
  await recordView(post.id, (await searchParams).src);
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
  const previousName = previous ? masechetName(previous.masechtot) : null;

  return (
    <main className="home">
      <div className="home-grid">
        <article className="home-post post-article">
          <div className="home-meta">
            <Link className="muted back" href="/archive">
              ‹ לארכיון
            </Link>
            {masechet ? <span className="pill">{`${masechet} · דף ${formatDaf(post.daf)}`}</span> : null}
          </div>
          <h1 className="post-title">{version.title}</h1>
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
          <div className="post-body">
            {paragraphs.map((text, i) => (
              <RichParagraph key={i} text={text} />
            ))}
          </div>
          <a className="button-link wide outline" href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noreferrer">
            שיתוף בוואטסאפ
          </a>
          {previous ? (
            <Link className="card" href={`/posts/${previous.slug}`}>
              <span className="muted">
                הפוסט הקודם{previousName ? ` · ${previousName}, דף ${formatDaf(previous.daf)}` : ""}
              </span>
              <span className="card-title">{previous.title}</span>
            </Link>
          ) : null}
        </article>
        {images.length ? (
          <aside className="home-side">
            <GemaraViewer images={images} />
          </aside>
        ) : null}
      </div>
    </main>
  );
}
