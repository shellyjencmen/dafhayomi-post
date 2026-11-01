import test from "node:test";
import assert from "node:assert/strict";
import { summarize, currentStep } from "../src/lib/status-state.ts";

const V1 = "v1";
const alts = [
  { id: "A", label: "a", content_hash: "h1" },
  { id: "B", label: "b", content_hash: "h2" },
];
const ap = (stage, extra = {}) => ({ alternative_id: "A", post_version_id: V1, stage, content_hash: "h1", revoked_at: null, ...extra });
const run = (approvals, more = {}) =>
  summarize({ currentVersionId: V1, current: { alternatives: alts, approvals, shared: false }, hadEarlierApproval: false, sharedEarlier: false, ...more });

test("nothing prepared", () => {
  const s = summarize({ currentVersionId: V1, current: null, hadEarlierApproval: false, sharedEarlier: false });
  assert.equal(s.content, "not_prepared");
  assert.equal(currentStep(s).step, 1);
});

test("prepared, no approval: pending, site waits", () => {
  const s = run([]);
  assert.deepEqual([s.content, s.site], ["pending", "waiting"]);
});

test("content approval alone does not show on the site", () => {
  const s = run([ap("content")]);
  assert.deepEqual([s.content, s.site, s.approvedAlternativeId], ["content_approved", "waiting", "A"]);
  assert.equal(currentStep(s).step, 4);
});

test("action approval shows on the site; sharing moves to the last step", () => {
  const s = run([ap("content"), ap("action")]);
  assert.deepEqual([s.content, s.site], ["action_approved", "shown"]);
  assert.equal(currentStep(s).step, 5);
  const shared = summarize({ currentVersionId: V1, current: { alternatives: alts, approvals: [ap("action")], shared: true }, hadEarlierApproval: false, sharedEarlier: false });
  assert.equal(currentStep(shared).step, 7);
});

test("cards changed after approval: needs review and hidden", () => {
  const s = run([ap("content", { content_hash: "old" }), ap("action", { content_hash: "old" })]);
  assert.deepEqual([s.content, s.site], ["needs_review", "hidden_needs_review"]);
});

test("revoked approval does not count", () => {
  assert.equal(run([ap("action", { revoked_at: "2026-10-27" })]).content, "pending");
});

test("new post version: earlier approval means needs review, earlier share stays shared", () => {
  const s = summarize({ currentVersionId: "v2", current: null, hadEarlierApproval: true, sharedEarlier: true });
  assert.deepEqual([s.content, s.site, s.whatsapp], ["needs_review", "hidden_needs_review", "shared"]);
});

test("approval for another version does not count", () => {
  assert.equal(run([ap("action", { post_version_id: "v0" })]).content, "needs_review");
});
