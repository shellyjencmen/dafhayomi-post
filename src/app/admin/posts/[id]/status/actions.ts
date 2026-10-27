"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sessionClient, getOwner } from "@/lib/supabase-server";
import { loadStatus } from "@/lib/status-admin";
import { MIN_CARDS, StatusAgentError, methodFromEnv, prepareStatusAlternatives, type StatusCard } from "@/lib/status-agent";

function back(postId: string, key: "msg" | "error", text: string, alt?: string): never {
  const q = new URLSearchParams({ [key]: text });
  if (alt) q.set("alt", alt);
  redirect(`/admin/posts/${postId}/status?${q}`);
}

async function ownerContext(postId: string) {
  const owner = await getOwner();
  if (!owner) redirect("/login");
  const db = await sessionClient();
  const state = await loadStatus(db, postId);
  if (!state) back(postId, "error", "הפוסט לא נמצא.");
  if (state.post.publish_state !== "published" || !state.version) back(postId, "error", "אפשר להכין סטטוס רק לפוסט שפורסם.");
  return { owner, db, state };
}

function refreshSite(slug: string) {
  revalidatePath("/");
  revalidatePath(`/posts/${slug}`);
}

/** Prepares two alternatives for the current version. A second press adds nothing. */
export async function prepareStatus(postId: string) {
  const { db, state } = await ownerContext(postId);
  if (state.current) back(postId, "msg", "החלופות לגרסה הזו כבר מוכנות.");
  let alts;
  try {
    alts = await prepareStatusAlternatives({ title: state.version!.title, body: state.version!.body }, methodFromEnv());
  } catch (e) {
    back(postId, "error", e instanceof StatusAgentError ? e.message : "ההכנה נכשלה. נסו שוב.");
  }
  const { data: d, error } = await db
    .from("deliverables")
    .insert({ post_id: postId, post_version_id: state.version!.id, kind: "status" })
    .select("id")
    .single();
  // 23505: prepared at the same moment in another tab. The existing alternatives stay.
  if (error?.code === "23505") back(postId, "msg", "החלופות לגרסה הזו כבר מוכנות.");
  if (error || !d) back(postId, "error", "ההכנה נכשלה. נסו שוב.");
  const { error: altError } = await db.from("alternatives").insert([
    { deliverable_id: d.id, label: "a", cards: alts.a },
    { deliverable_id: d.id, label: "b", cards: alts.b },
  ]);
  if (altError) {
    await db.from("deliverables").delete().eq("id", d.id);
    back(postId, "error", "ההכנה נכשלה. נסו שוב.");
  }
  back(postId, "msg", "הוכנו שתי חלופות. בחרו אחת, תקנו אם צריך, ואשרו את התוכן.");
}

/** "option": next suggested wording (the old one goes to the end, so presses cycle). "move": one place later, last to first. */
export type CardEdit = "option" | "move" | "delete";

/** Fixes a card without free typing: another suggested wording, move, or delete. The change voids earlier approvals. */
export async function editCard(postId: string, altId: string, index: number, edit: CardEdit) {
  const { db, state } = await ownerContext(postId);
  const alt = state.current?.alternatives.find((a) => a.id === altId);
  if (!alt) back(postId, "error", "החלופה לא נמצאה. אולי הפוסט השתנה.");
  const cards: StatusCard[] = alt.cards.map((c) => ({ ...c, options: [...(c.options ?? [])] }));
  const card = cards[index];
  if (!card) back(postId, "error", "הכרטיס לא נמצא.", alt.label);
  if (edit === "option") {
    const [next, ...rest] = card.options;
    if (!next) back(postId, "error", "אין לכרטיס הזה ניסוח אחר מוצע.", alt.label);
    card.options = [...rest, card.text];
    card.text = next;
  } else if (edit === "delete") {
    if (cards.length <= MIN_CARDS) back(postId, "error", `בסטטוס צריכים להישאר לפחות ${MIN_CARDS} כרטיסים.`, alt.label);
    cards.splice(index, 1);
  } else {
    const [moved] = cards.splice(index, 1);
    cards.splice(index === cards.length ? 0 : index + 1, 0, moved);
  }
  const { error } = await db
    .from("alternatives")
    .update({ cards, edited: true, updated_at: new Date().toISOString() })
    .eq("id", altId);
  if (error) back(postId, "error", "השמירה נכשלה. נסו שוב.", alt.label);
  refreshSite(state.post.slug);
  const wasApproved = state.summary.approvedAlternativeId === altId;
  back(postId, "msg", wasApproved ? "התיקון נשמר. האישור בוטל, וצריך לאשר מחדש." : "התיקון נשמר.", alt.label);
}

async function approve(postId: string, altId: string, stage: "content" | "action") {
  const { owner, db, state } = await ownerContext(postId);
  const current = state.current;
  const alt = current?.alternatives.find((a) => a.id === altId);
  if (!current || !alt) back(postId, "error", "החלופה לא נמצאה. אולי הפוסט השתנה.");
  if (stage === "action") {
    const content = state.summary.content === "content_approved" && state.summary.approvedAlternativeId === altId;
    if (!content) back(postId, "error", "קודם מאשרים את התוכן של החלופה הזו.", alt.label);
  }
  // A new choice replaces the live approvals of the other alternative.
  const others = current.approvals.filter((ap) => ap.alternative_id !== altId && !ap.revoked_at).map((ap) => ap.id);
  if (others.length) {
    await db.from("approvals").update({ revoked_at: new Date().toISOString() }).in("id", others);
  }
  const { error } = await db.from("approvals").insert({
    deliverable_id: current.id,
    alternative_id: altId,
    post_version_id: current.post_version_id,
    stage,
    action: stage === "content" ? "אישור התוכן" : "הצגת הסטטוס באתר",
    targets: stage === "content" ? [] : ["site"],
    approved_by: owner.id,
  });
  // 23505: a double press. The first approval already stands.
  if (error && error.code !== "23505") back(postId, "error", "האישור נכשל. נסו שוב.", alt.label);
  if (stage === "action") refreshSite(state.post.slug);
  back(postId, "msg", stage === "content" ? "התוכן אושר. עדיין לא מוצג דבר באתר." : "הפעולה אושרה. הסטטוס מוצג באתר.", alt.label);
}

export async function approveContent(postId: string, altId: string) {
  await approve(postId, altId, "content");
}

export async function approveAction(postId: string, altId: string) {
  await approve(postId, altId, "action");
}

/** Records that the owner uploaded the status to WhatsApp by hand. Once per deliverable. */
export async function markShared(postId: string) {
  const { owner, db, state } = await ownerContext(postId);
  if (state.summary.content !== "action_approved" || !state.current) back(postId, "error", "אפשר לסמן כשותף רק אחרי אישור הפעולה.");
  const { error } = await db
    .from("shares")
    .upsert({ deliverable_id: state.current.id, shared_by: owner.id }, { onConflict: "deliverable_id", ignoreDuplicates: true });
  if (error) back(postId, "error", "הסימון נכשל. נסו שוב.");
  back(postId, "msg", "סומן כשותף.");
}
