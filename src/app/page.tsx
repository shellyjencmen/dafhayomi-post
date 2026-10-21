import Link from "next/link";
import { formatDaf } from "@/lib/daf";
import { masechetName, paragraphsOf, readingMinutes, formatPublishedOn } from "@/lib/posts";
import { publicClient } from "@/lib/supabase";

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

  const [{ data: versions }, { data: pages }] = await Promise.all([
    db.from("post_versions").select("id, title, body").in("id", rows.map((p) => p.current_version_id)),
    db.from("gemara_pages").select("id, label, alt_text, image_path").eq("post_id", latest.id).order("sort"),
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
              <p key={i}>{text}</p>
            ))}
          </div>
          <Link className="button-link wide" href={`/posts/${latest.slug}${channel}`}>
            להמשך הקריאה ולתגובות
          </Link>
        </section>
        {gemara.length ? (
          <aside className="home-side">
            <div className="side-title">
              <strong>דף הגמרא לעיון</strong>
              <span className="muted">רפרנס לטקסט</span>
            </div>
            {gemara.map((page) => (
              <figure key={page.id} className="gemara-page">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${imageBase}/${page.image_path}`} alt={page.alt_text ?? page.label ?? "דף גמרא"} />
                {page.label ? <figcaption className="muted">{page.label}</figcaption> : null}
              </figure>
            ))}
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
