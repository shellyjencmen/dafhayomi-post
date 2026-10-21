import { formatDaf } from "@/lib/daf";
import { formatPublishedOn, masechetName, readingMinutes } from "@/lib/posts";
import type { Metadata } from "next";
import Link from "next/link";
import { publicClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ארכיון" };

type Masechet = { id: number; name: string };
type PostRow = {
  slug: string;
  daf: number | null;
  masechet_id: number | null;
  published_on: string | null;
  current_version_id: string;
  masechtot: { name: string } | { name: string }[] | null;
};
type VersionRow = { id: string; title: string; summary: string | null; body: string };

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ masechet?: string }> }) {
  const { masechet } = await searchParams;
  const selectedId = Number(masechet);
  const filtering = Number.isInteger(selectedId) && selectedId > 0;
  const db = publicClient();

  const [{ data: posts, error: postsError }, { data: masechtot }] = await Promise.all([
    db
      .from("posts")
      .select("slug, daf, masechet_id, published_on, current_version_id, masechtot(name)")
      .eq("publish_state", "published")
      .not("current_version_id", "is", null)
      .order("published_on", { ascending: false, nullsFirst: false }),
    db.from("masechtot").select("id, name").order("sort_order"),
  ]);
  if (postsError) console.error("archive: posts query failed", postsError);
  const all = (posts ?? []) as PostRow[];

  // Tags show only masechtot that have published posts; counts always cover all published posts.
  const counts = new Map<number, number>();
  for (const p of all) if (p.masechet_id) counts.set(p.masechet_id, (counts.get(p.masechet_id) ?? 0) + 1);
  const tags = ((masechtot ?? []) as Masechet[]).filter((m) => counts.has(m.id));
  const selectedName = ((masechtot ?? []) as Masechet[]).find((m) => m.id === selectedId)?.name;

  const rows = filtering ? all.filter((p) => p.masechet_id === selectedId) : all;

  const { data: versions } = rows.length
    ? await db.from("post_versions").select("id, title, summary, body").in("id", rows.map((p) => p.current_version_id))
    : { data: [] as VersionRow[] };
  const byId = new Map(((versions ?? []) as VersionRow[]).map((v) => [v.id, v]));

  return (
    <main className="page">
      <h1 className="post-title">ארכיון</h1>
      <p className="muted">{all.length} פוסטים שפורסמו</p>
      <nav className="tags" aria-label="סינון לפי מסכת">
        <Link href="/archive" className={`chip${filtering ? "" : " chip-on"}`} aria-current={filtering ? undefined : "true"}>
          הכול ({all.length})
        </Link>
        {tags.map((m) => (
          <Link
            key={m.id}
            href={`/archive?masechet=${m.id}`}
            className={`chip${selectedId === m.id ? " chip-on" : ""}`}
            aria-current={selectedId === m.id ? "true" : undefined}
          >
            {m.name} ({counts.get(m.id)})
          </Link>
        ))}
      </nav>
      {postsError ? (
        <p role="alert">טעינת הפוסטים נכשלה. נסי לרענן, ואם זה חוזר יש לפנות אליי.</p>
      ) : rows.length === 0 ? (
        <div className="empty">
          <p>{filtering && selectedName ? `עדיין אין פוסטים במסכת ${selectedName}.` : "עדיין אין פוסטים שפורסמו."}</p>
          {filtering ? <Link href="/archive">חזרה לכל הפוסטים</Link> : null}
        </div>
      ) : (
        <ul className="archive-list">
          {rows.map((p) => {
            const v = byId.get(p.current_version_id);
            const name = masechetName(p.masechtot);
            return (
              <li key={p.slug}>
                <Link href={`/posts/${p.slug}`}>
                  <span className="archive-meta">
                    {name ? <span className="pill">{`מסכת ${name}, דף ${formatDaf(p.daf)}`}</span> : null}
                    <span className="muted">{formatPublishedOn(p.published_on)}</span>
                    {v ? <span className="muted">{readingMinutes(v.body)} דקות קריאה</span> : null}
                  </span>
                  <strong className="card-title">{v?.title ?? p.slug}</strong>
                  {v?.summary ? <span className="muted">{v.summary}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
