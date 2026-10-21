import Link from "next/link";
import { notFound } from "next/navigation";
import { sessionClient } from "@/lib/supabase-server";
import { deletePost } from "../../actions";
import styles from "../../../admin.module.css";

export const dynamic = "force-dynamic";

export default async function DeletePostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await sessionClient();
  const { data: post } = await supabase.from("posts").select("id").eq("id", id).maybeSingle();
  if (!post) notFound();
  const { data: latest } = await supabase
    .from("post_versions")
    .select("title")
    .eq("post_id", id)
    .order("version_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (
    <main className={styles.page}>
      <h1>מחיקת פוסט</h1>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <p>
        למחוק את <strong>{latest?.title ?? "הפוסט"}</strong>?
      </p>
      <p>המחיקה סופית. היא מוחקת גם את כל הגרסאות, את תמונות הגמרא ואת התגובות. אי אפשר לשחזר.</p>
      <div className={styles.actions}>
        <form action={deletePost.bind(null, id)}>
          <button className={styles.primary}>למחוק סופית</button>
        </form>
        <Link className={styles.secondary} href={`/admin/posts/${id}`}>
          ביטול
        </Link>
      </div>
    </main>
  );
}
