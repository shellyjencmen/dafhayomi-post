import { formatDaf } from "@/lib/daf";
import { adminClient } from "@/lib/supabase";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

const CHANNEL_LABEL: Record<string, string> = { direct: "ישיר", whatsapp: "וואטסאפ", teaser: "פוסט מקוצר", status: "סטטוס", email: "מייל" };

type View = { post_id: string; channel: string };
type Post = { id: string; slug: string; daf: number | null; masechtot: { name: string } | { name: string }[] | null };

export default async function ReportsPage() {
  // Layout already requires an owner; page_views has no public policies, so read it with the server key.
  const db = adminClient();
  const [{ data: views, error }, { data: posts }, { data: commentRows }] = await Promise.all([
    db.from("page_views").select("post_id, channel"),
    db.from("posts").select("id, slug, daf, masechtot(name)"),
    db.from("comments").select("status"),
  ]);
  const commentCount = (status: string) => (commentRows ?? []).filter((c: { status: string }) => c.status === status).length;
  const rows = (views ?? []) as View[];
  const byPost = new Map<string, Map<string, number>>();
  const byChannel = new Map<string, number>();
  for (const v of rows) {
    const channels = byPost.get(v.post_id) ?? new Map<string, number>();
    channels.set(v.channel, (channels.get(v.channel) ?? 0) + 1);
    byPost.set(v.post_id, channels);
    byChannel.set(v.channel, (byChannel.get(v.channel) ?? 0) + 1);
  }
  const label = (p: Post) => {
    const m = Array.isArray(p.masechtot) ? p.masechtot[0] : p.masechtot;
    return m ? `מסכת ${m.name}, דף ${formatDaf(p.daf)}` : p.slug;
  };
  const postRows = ((posts ?? []) as Post[])
    .map((p) => ({ p, total: [...(byPost.get(p.id)?.values() ?? [])].reduce((a, b) => a + b, 0) }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <main className={styles.page}>
      <h1>דוח שימוש</h1>
      {error && <p className={styles.error} role="alert">טעינת הנתונים נכשלה.</p>}
      <p className={styles.message}>כניסות מצטברות לפי פוסט וערוץ. לא נשמרים עוגיות או פרטים מזהים, וכניסות שלך ושל בוטים לא נספרות.</p>
      <h2>תגובות</h2>
      <p>
        פורסמו: <strong>{commentCount("approved")}</strong> · הוסרו: <strong>{commentCount("removed")}</strong>
      </p>
      <h2>לפי ערוץ</h2>
      <ul className={styles.list}>
        {[...byChannel.entries()].sort((a, b) => b[1] - a[1]).map(([channel, count]) => (
          <li key={channel}>
            <span className={styles.state}>
              <span>{CHANNEL_LABEL[channel] ?? channel}</span> <strong>{count}</strong>
            </span>
          </li>
        ))}
      </ul>
      <h2>לפי פוסט</h2>
      {postRows.length === 0 ? (
        <p>עדיין אין כניסות.</p>
      ) : (
        <ul className={styles.list}>
          {postRows.map(({ p, total }) => (
            <li key={p.id}>
              <span className={styles.state}>
                <span>{label(p)}</span> <strong>{total}</strong>
              </span>
              <span className="muted">
                {[...(byPost.get(p.id) ?? new Map()).entries()].map(([c, n]) => `${CHANNEL_LABEL[c] ?? c}: ${n}`).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
