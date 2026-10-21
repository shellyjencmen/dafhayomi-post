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
  const { data: pages } = await supabase
    .from("gemara_pages")
    .select("id, label, alt_text, image_path")
    .eq("post_id", id)
    .order("sort");
  const imageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gemara`;
  const paragraphs: string[] = String(latest.body).split(/\n{2,}/).filter((p) => p.trim());
  return (
    <main className={`${styles.page} ${styles.preview}`}>
      <p className={styles.message}>תצוגה מקדימה של הגרסה האחרונה שנשמרה. הקוראים רואים רק פוסט שפורסם.</p>
      <h1>{latest.title}</h1>
      {paragraphs.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
      {(pages ?? []).map((page: { id: string; label: string | null; alt_text: string | null; image_path: string }) => (
        <figure key={page.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${imageBase}/${page.image_path}`} alt={page.alt_text ?? page.label ?? "דף גמרא"} style={{ maxWidth: "100%", height: "auto" }} />
          {page.label ? <figcaption>{page.label}</figcaption> : null}
        </figure>
      ))}
      <Link className={styles.secondary} href={`/admin/posts/${id}`}>
        חזרה לעריכה
      </Link>
    </main>
  );
}
