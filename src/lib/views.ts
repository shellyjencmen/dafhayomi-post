import { headers } from "next/headers";
import { adminClient } from "@/lib/supabase";
import { getOwner } from "@/lib/supabase-server";

const CHANNEL_PATTERN = /^[a-z0-9_-]{1,32}$/;
// Link-preview fetchers and crawlers would otherwise count as readers.
const NON_READER_AGENTS = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|headless/i;

// "teaser" is the short post's older name; both are shown as one row.
export const CHANNEL_LABEL: Record<string, string> = { direct: "ישיר", whatsapp: "וואטסאפ", short: "פוסט מקוצר", status: "סטטוס", email: "מייל" };
export const reportChannel = (channel: string) => (channel === "teaser" ? "short" : channel);

export function channelFrom(src: string | string[] | undefined) {
  const value = (Array.isArray(src) ? src[0] : src)?.toLowerCase();
  return value && CHANNEL_PATTERN.test(value) ? value : "direct";
}

/** Aggregate counting only: a row per view, no cookies, no IP, no user agent stored. Never throws. */
export async function recordView(postId: string, src: string | string[] | undefined) {
  try {
    const agent = (await headers()).get("user-agent") ?? "";
    if (!agent || NON_READER_AGENTS.test(agent)) return;
    if (await getOwner()) return;
    await adminClient().from("page_views").insert({ post_id: postId, channel: channelFrom(src) });
  } catch (error) {
    console.error("recordView failed", error);
  }
}
