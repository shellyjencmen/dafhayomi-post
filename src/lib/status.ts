import type { SupabaseClient } from "@supabase/supabase-js";

export type StatusCard = { title: string; text: string };

// Cards of the approved status for the current version of a published post. RLS hides it otherwise.
// A card is { title, text }; plain strings (older data) are shown as text only.
export function loadStatusCards(db: SupabaseClient, postId: string): Promise<StatusCard[]> {
  return loadApprovedCards(db, postId, "status");
}

// The approved short post: the opening (a card without a title) and titled sections, drawn as one image.
export function loadShortPost(db: SupabaseClient, postId: string): Promise<StatusCard[]> {
  return loadApprovedCards(db, postId, "short_post");
}

async function loadApprovedCards(db: SupabaseClient, postId: string, kind: "status" | "short_post"): Promise<StatusCard[]> {
  const { data } = await db
    .from("deliverables")
    .select("alternatives(cards)")
    .eq("post_id", postId)
    .eq("kind", kind)
    .limit(1);
  const alt = (data?.[0]?.alternatives as { cards: unknown }[] | undefined)?.[0];
  if (!Array.isArray(alt?.cards)) return [];
  return (alt.cards as (string | { title?: string; text: string })[]).map((c) =>
    typeof c === "string" ? { title: "", text: c } : { title: c.title ?? "", text: c.text },
  );
}
