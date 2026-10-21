import Link from "next/link";
import { notFound } from "next/navigation";
import { sessionClient } from "@/lib/supabase-server";
import styles from "../../../admin.module.css";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await sessionClient();
  const { data: latest } = await supabase
    .from("post_versions")
    .select("title, body")
    .eq("post_id", id)
    .order("version_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) notFound();
  const paragraphs: string[] = String(latest.body).split(/\n{2,}/).filter((p) => p.trim());
  return (
    <main className={`${styles.page} ${styles.preview}`}>
      <p className={styles.message}>תצוגה מקדימה של הגרסה האחרונה שנשמרה. הקוראים רואים רק פוסט שפורסם.</p>
      <h1>{latest.title}</h1>
      {paragraphs.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
      <Link className={styles.secondary} href={`/admin/posts/${id}`}>
        חזרה לעריכה
      </Link>
    </main>
  );
}
