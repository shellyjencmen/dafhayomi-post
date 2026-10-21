import { formatDaf } from "@/lib/daf";
import Link from "next/link";
import { sessionClient } from "@/lib/supabase-server";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

const STATE_LABEL: Record<string, string> = { draft: "טיוטה", published: "פורסם", unpublished: "הוסר" };

type Row = {
  id: string;
  daf: number | null;
  publish_state: string;
  updated_at: string;
  masechtot: { name: string } | { name: string }[] | null;
};

export default async function PostsPage() {
  const supabase = await sessionClient();
  const { data } = await supabase
    .from("posts")
    .select("id, daf, publish_state, updated_at, masechtot(name)")
    .order("updated_at", { ascending: false });
  const rows = (data ?? []) as Row[];
  return (
    <main className={styles.page}>
      <div className={styles.row}>
        <h1>פוסטים</h1>
        <Link className={styles.primary} href="/admin/posts/new">
          פוסט חדש
        </Link>
      </div>
      {rows.length === 0 ? (
        <p>אין עדיין פוסטים.</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((p) => {
            const m = Array.isArray(p.masechtot) ? p.masechtot[0] : p.masechtot;
            return (
              <li key={p.id}>
                <Link href={`/admin/posts/${p.id}`}>
                  <span>{m ? `מסכת ${m.name}, דף ${formatDaf(p.daf)}` : "ללא מסכת"}</span>
                  <span className={styles.state}>{STATE_LABEL[p.publish_state] ?? p.publish_state}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
