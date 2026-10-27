import test from "node:test";
import assert from "node:assert/strict";
import { prepareStatusAlternatives, unfaithfulSentences, mockComplete, StatusAgentError } from "../src/lib/status-agent.ts";

const post = {
  title: "ברכות ב",
  body: "**פתיחה** חשובה. משפט שני עם [קישור](https://a.co) כאן.\n\nמשפט שלישי בפסקה אחרת! האם זה רביעי? כן, זה חמישי. ושישי גם כן.",
};

test("mock alternatives are two, each with three faithful cards", async () => {
  const alts = await prepareStatusAlternatives(post, mockComplete);
  assert.equal(alts.a.length, 3);
  assert.equal(alts.b.length, 3);
  assert.notDeepEqual(alts.a, alts.b);
  for (const c of [...alts.a, ...alts.b]) assert.deepEqual(unfaithfulSentences(c, post), []);
});

test("a sentence that is not in the post rejects the alternative; one retry, then an error", async () => {
  let calls = 0;
  const liar = async () => {
    calls++;
    return JSON.stringify({ a: ["משפט מומצא.", "משפט שלישי בפסקה אחרת!", "כן, זה חמישי."], b: ["פתיחה חשובה.", "ושישי גם כן.", "האם זה רביעי?"] });
  };
  await assert.rejects(prepareStatusAlternatives(post, liar), (e) => e instanceof StatusAgentError && e.code === "invalid");
  assert.equal(calls, 2);
});

test("second attempt can succeed", async () => {
  const good = JSON.parse(await mockComplete({ system: "", user: `כותרת: x\n\nהפוסט:\n${post.body}` }));
  let calls = 0;
  const flaky = async () => (++calls === 1 ? "לא JSON" : JSON.stringify(good));
  const alts = await prepareStatusAlternatives(post, flaky);
  assert.equal(calls, 2);
  assert.equal(alts.a.length, 3);
});

test("short post gives a Hebrew message and no API call", async () => {
  let called = false;
  await assert.rejects(
    prepareStatusAlternatives({ title: "קצר", body: "שתי מילים." }, async () => ((called = true), "{}")),
    (e) => e.code === "too_short" && e.message === "הפוסט קצר מדי לסטטוס.",
  );
  assert.equal(called, false);
});

test("API failure gives a Hebrew error", async () => {
  await assert.rejects(
    prepareStatusAlternatives(post, async () => {
      throw new Error("boom");
    }),
    (e) => e.code === "api" && /נסו שוב/.test(e.message),
  );
});

test("too many sentences in a card is rejected", async () => {
  const many = async () =>
    JSON.stringify({
      a: ["פתיחה חשובה. משפט שני עם קישור כאן. משפט שלישי בפסקה אחרת! האם זה רביעי?", "כן, זה חמישי.", "ושישי גם כן."],
      b: ["פתיחה חשובה.", "ושישי גם כן.", "האם זה רביעי?"],
    });
  await assert.rejects(prepareStatusAlternatives(post, many), (e) => e.code === "invalid");
});
