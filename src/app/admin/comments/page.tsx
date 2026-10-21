import { formatDaf } from "@/lib/daf";
import { masechetName } from "@/lib/posts";
import { sessionClient } from "@/lib/supabase-server";
import styles from "../admin.module.css";
import { decideComment } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  author_name: string;
  body: string;
  status: string;
  created_at: string;
  posts: { daf: number | null; slug: string; masechtot: { name: string } | { name: string }[] | null } | null;
};

export default async function CommentsPage() {
  const supabase = await sessionClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, author_name, body, status, created_at, posts(slug, daf, masechtot(name))")
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];
  const pending = rows.filter((r) => r.status === "pending");
  const approved = rows.filter((r) => r.status === "approved");

  const item = (c: Row, actions: { label: string; status: "approved" | "rejected" | "removed"; primary?: boolean }[]) => {
    const m = c.posts ? masechetName(c.posts.masechtot) : null;
    return (
      <li key={c.id} className={styles.commentItem}>
        <span className="muted">{m ? `מסכת ${m}, דף ${formatDaf(c.posts?.daf ?? null)}` : c.posts?.slug}</span>
        <strong>{c.author_name}</strong>
        <p>{c.body}</p>
        <div className={styles.actions}>
          {actions.map((a) => (
            <form key={a.status} action={decideComment.bind(null, c.id, a.status)}>
              <button className={a.primary ? styles.primary : styles.secondary}>{a.label}</button>
            </form>
          ))}
        </div>
      </li>
    );
  };

  return (
    <main className={styles.page}>
      <h1>תגובות</h1>
      <p className={styles.message}>תגובה מופיעה באתר רק אחרי שאישרת אותה.</p>
      {error && <p className={styles.error} role="alert">טעינת התגובות נכשלה.</p>}
      <h2>ממתינות לאישור ({pending.length})</h2>
      {pending.length === 0 ? (
        <p>אין תגובות שממתינות.</p>
      ) : (
        <ul className={styles.list}>
          {pending.map((c) =>
            item(c, [
              { label: "אישור ופרסום", status: "approved", primary: true },
              { label: "דחייה", status: "rejected" },
            ]),
          )}
        </ul>
      )}
      <h2>פורסמו ({approved.length})</h2>
      {approved.length === 0 ? (
        <p>עדיין לא פורסמו תגובות.</p>
      ) : (
        <ul className={styles.list}>{approved.map((c) => item(c, [{ label: "הסרה מהאתר", status: "removed" }]))}</ul>
      )}
    </main>
  );
}
