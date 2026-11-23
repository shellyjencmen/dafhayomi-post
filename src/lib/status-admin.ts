import type { SupabaseClient } from "@supabase/supabase-js";
import type { StatusCard } from "./status-agent";
import { summarize, type AlternativeRow, type ApprovalRow, type StatusSummary } from "./status-state";

export type AdminAlternative = AlternativeRow & { cards: StatusCard[] };
export type AdminDeliverable = {
  id: string;
  post_version_id: string;
  alternatives: AdminAlternative[];
  approvals: (ApprovalRow & { id: string; approved_at: string; approved_by: string | null; action: string })[];
  shares: { shared_at: string } | { shared_at: string }[] | null;
};

const DELIVERABLE_COLUMNS =
  "id, post_version_id, created_at, alternatives(id, label, cards, content_hash), approvals(id, alternative_id, post_version_id, stage, content_hash, revoked_at, approved_at, approved_by, action), shares(shared_at)";

function sharedAt(d: AdminDeliverable) {
  const s = Array.isArray(d.shares) ? d.shares[0] : d.shares;
  return s?.shared_at ?? null;
}

export function summarizeDeliverables(currentVersionId: string | null, all: AdminDeliverable[]) {
  const current = all.find((d) => d.post_version_id === currentVersionId) ?? null;
  const earlier = all.filter((d) => d !== current);
  const summary: StatusSummary = summarize({
    currentVersionId,
    current: current
      ? { alternatives: current.alternatives, approvals: current.approvals, shared: !!sharedAt(current) }
      : null,
    hadEarlierApproval: earlier.some((d) => d.approvals.some((a) => a.stage === "action" && !a.revoked_at)),
    sharedEarlier: earlier.some((d) => !!sharedAt(d)),
  });
  return { current, summary, sharedAt: current ? sharedAt(current) : null };
}

/** Everything the status screen needs for one post. Owners only (RLS). */
export async function loadStatus(db: SupabaseClient, postId: string) {
  const { data: post } = await db
    .from("posts")
    .select("id, slug, publish_state, current_version_id, masechtot(name), daf")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return null;
  const [{ data: version }, { data: deliverables }] = await Promise.all([
    post.current_version_id
      ? db.from("post_versions").select("id, version_no, title, body").eq("id", post.current_version_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from("deliverables").select(DELIVERABLE_COLUMNS).eq("post_id", postId).eq("kind", "status").order("created_at"),
  ]);
  const all = (deliverables ?? []) as unknown as AdminDeliverable[];
  for (const d of all) d.alternatives.sort((x, y) => x.label.localeCompare(y.label));
  return { post, version: version as { id: string; version_no: number; title: string; body: string } | null, ...summarizeDeliverables(post.current_version_id, all) };
}

/** Status summary for every post, for the posts list. */
export async function loadStatusSummaries(db: SupabaseClient, posts: { id: string; current_version_id: string | null }[]) {
  const { data } = await db.from("deliverables").select(`post_id, ${DELIVERABLE_COLUMNS}`).eq("kind", "status");
  const byPost = new Map<string, AdminDeliverable[]>();
  for (const d of (data ?? []) as unknown as (AdminDeliverable & { post_id: string })[]) {
    byPost.set(d.post_id, [...(byPost.get(d.post_id) ?? []), d]);
  }
  return new Map(posts.map((p) => [p.id, summarizeDeliverables(p.current_version_id, byPost.get(p.id) ?? [])]));
}
