import Link from "next/link";
import { GemaraViewer } from "./GemaraViewer";
import { formatDaf } from "@/lib/daf";
import { masechetName, paragraphsOf, readingMinutes, formatPublishedOn } from "@/lib/posts";
import { RichParagraph } from "@/lib/RichText";
import { loadStatusCards } from "@/lib/status";
import { publicClient } from "@/lib/supabase";
import { StatusCards } from "./posts/[slug]/StatusCards";

export const dynamic = "force-dynamic";

const GEMARA_BUCKET = "gemara";

type PostRow = {
  id: string;
  slug: string;
  daf: number | null;
  published_on: string | null;
  current_version_id: string;
  masechtot: { name: string } | { name: string }[] | null;
};
type GemaraRow = { id: string; label: string | null; alt_text: string | null; image_path: string };

function tag(p: PostRow) {
  const name = masechetName(p.masechtot);
  return name ? `${name} · דף ${formatDaf(p.daf)}` : p.slug;
}

export default async function Home({ searchParams }: { searchParams: Promise<{ src?: string | string[] }> }) {
  const src = (await searchParams).src;
  const channel = typeof src === "string" && /^[a-z0-9_-]{1,32}$/.test(src) ? `?src=${src}` : "";
  const db = publicClient();

  const { data: posts, error } = await db
    .from("posts")
    .select("id, slug, daf, published_on, current_version_id, masechtot(name)")
    .eq("publish_state", "published")
    .not("current_version_id", "is", null)
    .order("published_on", { ascending: false, nullsFirst: false })
    .limit(4);
  if (error) console.error("home: posts query failed", error);
  const rows = (posts ?? []) as PostRow[];
  const [latest, ...previous] = rows;

  if (!latest) {
    return (
      <main className="page">
        <p>{error ? "טעינת הפוסט נכשלה. נסי לרענן." : "עדיין לא פורסם פוסט. כאן יופיע הפוסט השבועי."}</p>
      </main>
    );
  }

  const [{ data: versions }, { data: pages }, statusCards] = await Promise.all([
    db.from("post_versions").select("id, title, body").in("id", rows.map((p) => p.current_version_id)),
    db.from("gemara_pages").select("id, label, alt_text, image_path").eq("post_id", latest.id).order("sort"),
    loadStatusCards(db, latest.id),
  ]);
  const byId = new Map((versions ?? []).map((v: { id: string; title: string; body: string }) => [v.id, v]));
  const main = byId.get(latest.current_version_id);
  const allParagraphs = main ? paragraphsOf(main.body) : [];
  const intro = allParagraphs.slice(0, 2);
  const truncated = allParagraphs.length > intro.length;
  const imageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${GEMARA_BUCKET}`;
  const gemara = (pages ?? []) as GemaraRow[];

  return (
    <main className="home">
      <div className="home-grid">
        <section className="home-post">
          <div className="home-meta">
            <span className="pill">{tag(latest)}</span>
            <span className="muted">הפוסט של השבוע</span>
          </div>
          <h1 className="post-title">{main?.title}</h1>
          <div className="byline">
            <span className="avatar" aria-hidden="true">
              א
            </span>
            <span>
              <strong>אבי יוניצמן</strong>
              <span className="muted">
                {" "}
                · {formatPublishedOn(latest.published_on)} · {readingMinutes(main?.body ?? "")} דקות קריאה
              </span>
            </span>
          </div>
          <div className={truncated ? "post-body fade" : "post-body"}>
            {intro.map((text, i) => (
              <RichParagraph key={i} text={text} />
            ))}
          </div>
          <Link className="button-link wide" href={`/posts/${latest.slug}${channel}`}>
            להמשך הקריאה ולתגובות
          </Link>
          {statusCards.length ? <StatusCards cards={statusCards} postHref={`/posts/${latest.slug}${channel}`} /> : null}
        </section>
        {gemara.length ? (
          <aside className="home-side">
            <GemaraViewer
              images={gemara.map((page) => ({
                id: page.id,
                url: `${imageBase}/${page.image_path}`,
                label: page.label,
                alt: page.alt_text,
              }))}
            />
          </aside>
        ) : null}
      </div>
      {previous.length ? (
        <section className="home-previous">
          <div className="row-between">
            <h2>פוסטים קודמים</h2>
            <Link href="/archive">לכל הארכיון</Link>
          </div>
          <div className="cards">
            {previous.map((p) => (
              <Link key={p.id} className="card" href={`/posts/${p.slug}`}>
                <span className="pill">{tag(p)}</span>
                <span className="card-title">{byId.get(p.current_version_id)?.title}</span>
                <span className="muted">{formatPublishedOn(p.published_on)}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
