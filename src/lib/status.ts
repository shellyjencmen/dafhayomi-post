import type { SupabaseClient } from "@supabase/supabase-js";

export type StatusCard = { title: string; text: string };

// Cards of the approved status for the current version of a published post. RLS hides it otherwise.
// A card is { title, text }; plain strings (older data) are shown as text only.
export async function loadStatusCards(db: SupabaseClient, postId: string): Promise<StatusCard[]> {
  const { data } = await db
    .from("deliverables")
    .select("alternatives(cards)")
    .eq("post_id", postId)
    .eq("kind", "status")
    .limit(1);
  const alt = (data?.[0]?.alternatives as { cards: unknown }[] | undefined)?.[0];
  if (!Array.isArray(alt?.cards)) return [];
  return (alt.cards as (string | { title?: string; text: string })[]).map((c) =>
    typeof c === "string" ? { title: "", text: c } : { title: c.title ?? "", text: c.text },
  );
}
