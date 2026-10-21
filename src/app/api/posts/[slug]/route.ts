import { publicClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Agent seam: returns a published post with its current version and Gemara pages.
 * Public by design: row level security exposes only published posts and their current version,
 * the same content the public site shows. Drafts are never returned.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = publicClient();

  const { data: post, error } = await supabase
    .from("posts")
    .select("id, slug, masechet_id, daf, published_on, current_version_id")
    .eq("slug", slug)
    .eq("publish_state", "published")
    .maybeSingle();
  if (error) return Response.json({ error: "lookup_failed" }, { status: 500 });
  if (!post || !post.current_version_id) return Response.json({ error: "not_found" }, { status: 404 });

  const [version, pages] = await Promise.all([
    supabase
      .from("post_versions")
      .select("id, version_no, title, body, summary")
      .eq("id", post.current_version_id)
      .maybeSingle(),
    supabase
      .from("gemara_pages")
      .select("id, sort, label, alt_text, image_path")
      .eq("post_id", post.id)
      .order("sort"),
  ]);
  if (version.error || pages.error) return Response.json({ error: "lookup_failed" }, { status: 500 });
  if (!version.data) return Response.json({ error: "not_found" }, { status: 404 });

  return Response.json({
    id: post.id,
    slug: post.slug,
    masechet_id: post.masechet_id,
    daf: post.daf,
    published_on: post.published_on,
    post_version_id: version.data.id,
    version_no: version.data.version_no,
    title: version.data.title,
    body: version.data.body,
    summary: version.data.summary,
    gemara_pages: pages.data,
  });
}
