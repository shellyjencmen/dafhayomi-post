import { notFound } from "next/navigation";
import { sessionClient } from "@/lib/supabase-server";
import { PostForm } from "../PostForm";
import { GemaraUploader } from "./GemaraUploader";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { id } = await params;
  const { msg, error } = await searchParams;
  const supabase = await sessionClient();
  const { data: post } = await supabase
    .from("posts")
    .select("id, slug, masechet_id, daf, publish_state")
    .eq("id", id)
    .maybeSingle();
  if (!post) notFound();
  const { data: latest } = await supabase
    .from("post_versions")
    .select("title, body, summary")
    .eq("post_id", id)
    .order("version_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: masechtot } = await supabase.from("masechtot").select("id, name").order("sort_order");
  const { data: pages } = await supabase
    .from("gemara_pages")
    .select("id, label, alt_text, image_path")
    .eq("post_id", id)
    .order("sort");
  const imageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gemara`;
  const images = (pages ?? []).map((p: { id: string; label: string | null; alt_text: string | null; image_path: string }) => ({
    id: p.id,
    url: `${imageBase}/${p.image_path}`,
    label: p.label,
    alt: p.alt_text,
  }));
  return (
    <>
    <PostForm
      values={{
        id: post.id,
        masechetId: post.masechet_id,
        daf: post.daf,
        title: latest?.title ?? "",
        body: latest?.body ?? "",
        summary: latest?.summary ?? "",
        state: post.publish_state,
        slug: post.slug,
      }}
      masechtot={masechtot ?? []}
      message={msg}
      error={error}
    />
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 48px" }}>
      <GemaraUploader postId={post.id} images={images} />
    </div>
    </>
  );
}
