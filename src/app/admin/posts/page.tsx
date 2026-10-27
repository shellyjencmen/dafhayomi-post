import { formatDaf } from "@/lib/daf";
import { masechetName } from "@/lib/posts";
import Link from "next/link";
import { adminClient } from "@/lib/supabase";
import { sessionClient } from "@/lib/supabase-server";
import { loadStatusSummaries } from "@/lib/status-admin";
import { CONTENT_LABEL, WHATSAPP_LABEL, type StatusSummary } from "@/lib/status-state";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

const STATE_LABEL: Record<string, string> = { draft: "טיוטה", published: "פורסם", unpublished: "הוסר" };
const CHANNEL_LABEL: Record<string, string> = { direct: "ישיר", whatsapp: "וואטסאפ", teaser: "פוסט מקוצר", status: "סטטוס", email: "מייל" };

type Row = {
  id: string;
  daf: number | null;
  publish_state: string;
  current_version_id: string | null;
  masechtot: { name: string } | { name: string }[] | null;
};
type Version = { id: string; post_id: string; version_no: number; title: string };

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const supabase = await sessionClient();
  const [{ data }, { data: versionRows }, { data: viewRows }] = await Promise.all([
    supabase.from("posts").select("id, daf, publish_state, current_version_id, masechtot(name)").order("updated_at", { ascending: false }),
    supabase.from("post_versions").select("id, post_id, version_no, title").order("version_no", { ascending: false }),
    // page_views has no public policies; the admin layout already requires an owner.
    adminClient().from("page_views").select("post_id, channel"),
  ]);
  const rows = (data ?? []) as Row[];
  const statuses = await loadStatusSummaries(supabase, rows);

  const latest = new Map<string, Version>();
  const byId = new Map<string, Version>();
  for (const v of (versionRows ?? []) as Version[]) {
    byId.set(v.id, v);
    if (!latest.has(v.post_id)) latest.set(v.post_id, v);
  }

  const viewsByPost = new Map<string, number>();
  const viewsByChannel = new Map<string, number>();
  for (const v of (viewRows ?? []) as { post_id: string; channel: string }[]) {
    viewsByPost.set(v.post_id, (viewsByPost.get(v.post_id) ?? 0) + 1);
    viewsByChannel.set(v.channel, (viewsByChannel.get(v.channel) ?? 0) + 1);
  }
  const totalViews = [...viewsByPost.values()].reduce((a, b) => a + b, 0);
  const published = rows.filter((p) => p.publish_state === "published").length;

  return (
    <main className={styles.pageWide}>
      <div className={styles.row}>
        <h1>פוסטים</h1>
        <Link className={styles.primary} href="/admin/posts/new">
          פוסט חדש
        </Link>
      </div>
      {msg && <p className={styles.message} role="status">{msg}</p>}
      <div className={styles.split}>
        <section>
          {rows.length === 0 ? (
            <p>אין עדיין פוסטים. לחצי על פוסט חדש כדי להתחיל.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>פוסט</th>
                  <th>מצב</th>
                  <th>גרסה</th>
                  <th>סטטוס</th>
                  <th>צפיות</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const m = masechetName(p.masechtot);
                  const current = p.current_version_id ? byId.get(p.current_version_id) : undefined;
                  const newest = latest.get(p.id);
                  const title = (newest ?? current)?.title;
                  const hasDraft = newest && newest.id !== p.current_version_id;
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/admin/posts/${p.id}`}>
                          <strong>{title || "ללא כותרת"}</strong>
                          <span className="muted">{m ? `מסכת ${m}, דף ${formatDaf(p.daf)}` : "ללא מסכת"}</span>
                        </Link>
                      </td>
                      <td>
                        <span className={styles.state}>{STATE_LABEL[p.publish_state] ?? p.publish_state}</span>
                      </td>
                      <td>
                        {current ? `${current.version_no}` : "-"}
                        {hasDraft ? <span className="muted"> (יש טיוטה חדשה)</span> : null}
                      </td>
                      <td>
                        {p.publish_state === "published" ? (
                          <StatusCell postId={p.id} summary={statuses.get(p.id)?.summary} />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>{viewsByPost.get(p.id) ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
        <aside className={styles.report} aria-label="דוח מקוצר">
          <h2>דוח מקוצר</h2>
          <p>
            <strong>{totalViews}</strong> כניסות ב-{published} פוסטים שפורסמו
          </p>
          <ul>
            {[...viewsByChannel.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => (
              <li key={c}>
                {CHANNEL_LABEL[c] ?? c}: <strong>{n}</strong>
              </li>
            ))}
          </ul>
          <Link href="/admin/reports">לדוח המלא</Link>
        </aside>
      </div>
    </main>
  );
}

function StatusCell({ postId, summary }: { postId: string; summary?: StatusSummary }) {
  const content = summary?.content ?? "not_prepared";
  const action = content === "pending" || content === "needs_review" ? "לאישור" : content === "not_prepared" ? "להכנה" : "לסטטוס";
  return (
    <>
      <span className={styles.state}>{CONTENT_LABEL[content]}</span>
      {summary?.whatsapp === "shared" ? <span className="muted"> · {WHATSAPP_LABEL.shared}</span> : null}
      <br />
      <Link href={`/admin/posts/${postId}/status`}>{action}</Link>
    </>
  );
}
