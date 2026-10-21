import { notFound } from "next/navigation";
import { sessionClient } from "@/lib/supabase-server";
import { PostForm } from "../PostForm";

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
  return (
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
  );
}
