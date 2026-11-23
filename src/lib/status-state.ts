/**
 * Status flow states for owners (PRD 3.7, "מצבי הסטטוס"). Pure, so tests can run it with node.
 * An approval counts only while it is not revoked, is for the post's current version, and its
 * signature still matches the cards of its alternative.
 */

export type ApprovalRow = {
  alternative_id: string;
  post_version_id: string;
  stage: "content" | "action";
  content_hash: string;
  revoked_at: string | null;
};
export type AlternativeRow = { id: string; label: "a" | "b"; content_hash: string };

export type ContentState = "not_prepared" | "pending" | "content_approved" | "action_approved" | "needs_review";
export type SiteState = "waiting" | "shown" | "hidden_needs_review";
export type WhatsappState = "not_shared" | "shared";

export type StatusSummary = {
  content: ContentState;
  site: SiteState;
  whatsapp: WhatsappState;
  /** The alternative with a live content or action approval, if any. */
  approvedAlternativeId: string | null;
};

export const CONTENT_LABEL: Record<ContentState, string> = {
  not_prepared: "לא הוכן",
  pending: "מוכן לאישור",
  content_approved: "התוכן אושר",
  action_approved: "מוצג באתר",
  needs_review: "נדרשת בדיקה",
};
export const SITE_LABEL: Record<SiteState, string> = {
  waiting: "לא מוצג (ממתין לאישור פעולה)",
  shown: "מוצג באתר",
  hidden_needs_review: "מוסתר עד אישור מחדש",
};
export const WHATSAPP_LABEL: Record<WhatsappState, string> = { not_shared: "לא שותף", shared: "שותף" };

export function isLive(ap: ApprovalRow, currentVersionId: string | null, alternatives: AlternativeRow[]) {
  const alt = alternatives.find((a) => a.id === ap.alternative_id);
  return !ap.revoked_at && ap.post_version_id === currentVersionId && !!alt && alt.content_hash === ap.content_hash;
}

/**
 * current: the deliverable for the post's current version (null if none was prepared for it).
 * hadEarlier: an earlier version had a status, so a new version means "needs review".
 */
export function summarize(input: {
  currentVersionId: string | null;
  current: { alternatives: AlternativeRow[]; approvals: ApprovalRow[]; shared: boolean } | null;
  hadEarlierApproval: boolean;
  sharedEarlier: boolean;
}): StatusSummary {
  const { currentVersionId, current } = input;
  if (!current) {
    return {
      content: input.hadEarlierApproval ? "needs_review" : "not_prepared",
      site: input.hadEarlierApproval ? "hidden_needs_review" : "waiting",
      whatsapp: input.sharedEarlier ? "shared" : "not_shared",
      approvedAlternativeId: null,
    };
  }
  const live = current.approvals.filter((ap) => isLive(ap, currentVersionId, current.alternatives));
  const action = live.find((ap) => ap.stage === "action");
  const content = live.find((ap) => ap.stage === "content");
  // An approval that stopped matching (cards changed after approval) means the owner must look again.
  const voided = current.approvals.some((ap) => !ap.revoked_at && !isLive(ap, currentVersionId, current.alternatives));
  const whatsapp: WhatsappState = current.shared || input.sharedEarlier ? "shared" : "not_shared";
  if (action) return { content: "action_approved", site: "shown", whatsapp, approvedAlternativeId: action.alternative_id };
  if (content) return { content: "content_approved", site: "waiting", whatsapp, approvedAlternativeId: content.alternative_id };
  if (voided || input.hadEarlierApproval) {
    return { content: "needs_review", site: "hidden_needs_review", whatsapp, approvedAlternativeId: null };
  }
  return { content: "pending", site: "waiting", whatsapp, approvedAlternativeId: null };
}

/** Steps of the stepper at the top of the status screen (PRD 3.7, step 8). */
export const STEPS = ["הפוסט פורסם", "בחירת חלופה", "תיקון", "אישור התוכן", "אישור הפעולה", "וואטסאפ", "סימון כשותף"] as const;

/** Index of the current step, and the one-line "next step" text. */
export function currentStep(s: StatusSummary): { step: number; next: string } {
  switch (s.content) {
    case "not_prepared":
      return { step: 1, next: "להכין שתי חלופות לסטטוס." };
    case "needs_review":
      return { step: 1, next: "הפוסט או הסטטוס השתנו. להכין מחדש ולאשר שוב." };
    case "pending":
      return { step: 1, next: "לבחור חלופה, לתקן אם צריך, ולאשר את התוכן." };
    case "content_approved":
      return { step: 4, next: "לאשר את הפעולה: הצגת הסטטוס באתר." };
    case "action_approved":
      return s.whatsapp === "shared"
        ? { step: 7, next: "הסטטוס מוצג באתר וסומן כשותף. אין צעד נוסף." }
        : { step: 5, next: "להוריד את הכרטיסים כתמונות או להעתיק, להעלות לסטטוס בוואטסאפ, ולסמן כשותף." };
  }
}
