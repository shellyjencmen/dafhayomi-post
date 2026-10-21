import type { Metadata } from "next";
import Link from "next/link";
import { publicClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ארכיון" };

type Masechet = { id: number; name: string };
type PostRow = {
  slug: string;
  daf: number | null;
  published_on: string | null;
  current_version_id: string;
  masechtot: { name: string } | { name: string }[] | null;
};

function masechetName(m: PostRow["masechtot"]) {
  return Array.isArray(m) ? m[0]?.name : m?.name;
}

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ masechet?: string }> }) {
  const { masechet } = await searchParams;
  const masechetId = Number(masechet);
  const db = publicClient();

  let query = db
    .from("posts")
    .select("slug, daf, published_on, current_version_id, masechtot(name)")
    .eq("publish_state", "published")
    .not("current_version_id", "is", null)
    .order("published_on", { ascending: false, nullsFirst: false });
  if (Number.isInteger(masechetId) && masechetId > 0) query = query.eq("masechet_id", masechetId);

  const [{ data: posts, error: postsError }, { data: masechtot }] = await Promise.all([
    query,
    db.from("masechtot").select("id, name").order("sort_order"),
  ]);
  if (postsError) console.error("archive: posts query failed", postsError);
  const rows = (posts ?? []) as PostRow[];

  const { data: versions } = rows.length
    ? await db.from("post_versions").select("id, title").in("id", rows.map((p) => p.current_version_id))
    : { data: [] as { id: string; title: string }[] };
  const titles = new Map((versions ?? []).map((v: { id: string; title: string }) => [v.id, v.title]));

  return (
    <main className="page">
      <h1 className="post-title">ארכיון</h1>
      <form method="get" className="filter">
        <label htmlFor="masechet" className="muted">
          סינון לפי מסכת
        </label>
        <select id="masechet" name="masechet" defaultValue={Number.isInteger(masechetId) ? String(masechetId) : ""}>
          <option value="">כל המסכתות</option>
          {((masechtot ?? []) as Masechet[]).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <button type="submit" className="button-link">
          סינון
        </button>
        {masechet ? <Link href="/archive">ניקוי הסינון</Link> : null}
      </form>
      {postsError ? (
        <p role="alert">טעינת הפוסטים נכשלה. נסי לרענן, ואם זה חוזר יש לפנות אליי.</p>
      ) : rows.length === 0 ? (
        <p>לא נמצאו פוסטים.</p>
      ) : (
        <ul className="archive-list">
          {rows.map((p) => (
            <li key={p.slug}>
              <Link href={`/posts/${p.slug}`}>
                <strong>
                  {masechetName(p.masechtot) ? `מסכת ${masechetName(p.masechtot)}, דף ${p.daf}` : p.slug}
                </strong>
                <span className="muted">{titles.get(p.current_version_id)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
