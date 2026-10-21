import { formatDaf } from "@/lib/daf";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicClient } from "@/lib/supabase";
import { recordView } from "@/lib/views";

export const dynamic = "force-dynamic";

const GEMARA_BUCKET = "gemara";

async function loadPost(slug: string) {
  const db = publicClient();
  const { data: post } = await db
    .from("posts")
    .select("id, slug, daf, published_on, current_version_id, masechtot(name)")
    .eq("slug", slug)
    .eq("publish_state", "published")
    .maybeSingle();
  if (!post?.current_version_id) return null;

  const [{ data: version }, { data: pages }] = await Promise.all([
    db
      .from("post_versions")
      .select("title, body, summary")
      .eq("id", post.current_version_id)
      .maybeSingle(),
    db
      .from("gemara_pages")
      .select("id, label, alt_text, image_path")
      .eq("post_id", post.id)
      .order("sort"),
  ]);
  if (!version) return null;
  return { post, version, pages: pages ?? [] };
}

function masechetName(post: { masechtot: unknown }) {
  const m = post.masechtot as { name: string } | { name: string }[] | null;
  return Array.isArray(m) ? m[0]?.name : m?.name;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const found = await loadPost((await params).slug);
  if (!found) return { title: "לא נמצא" };
  return { title: found.version.title, description: found.version.summary ?? undefined };
}

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ src?: string | string[] }>;
}) {
  const found = await loadPost((await params).slug);
  if (!found) notFound();
  const { post, version, pages } = found;
  await recordView(post.id, (await searchParams).src);
  const masechet = masechetName(post);
  const paragraphs: string[] = String(version.body).split(/\n{2,}/).filter((p) => p.trim());
  const imageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${GEMARA_BUCKET}`;

  return (
    <main className="page">
      <p className="muted">{masechet ? `מסכת ${masechet}, דף ${formatDaf(post.daf)}` : ""}</p>
      <h1 className="post-title">{version.title}</h1>
      <article className="post-body">
        {paragraphs.map((text, i) => (
          <p key={i}>{text}</p>
        ))}
      </article>
      {pages.map((page: { id: string; label: string | null; alt_text: string | null; image_path: string }) => (
        <figure key={page.id} className="gemara-page">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${imageBase}/${page.image_path}`} alt={page.alt_text ?? page.label ?? "דף גמרא"} />
          {page.label ? <figcaption className="muted">{page.label}</figcaption> : null}
        </figure>
      ))}
    </main>
  );
}
