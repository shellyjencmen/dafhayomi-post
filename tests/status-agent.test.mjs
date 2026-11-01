import test from "node:test";
import assert from "node:assert/strict";
import {
  prepareStatusAlternatives,
  rulesMethod,
  claudeMethod,
  cardCount,
  splitSentences,
  StatusAgentError,
} from "../src/lib/status-agent.ts";

const sentences = Array.from({ length: 18 }, (_, i) => `משפט מספר ${i + 1} בפוסט.`);
const post = { title: "ברכות ב", body: `**${sentences[0]}** ${sentences.slice(1, 9).join(" ")}\r\n\r\n${sentences.slice(9).join(" ")}` };

test("rules: two alternatives, 3 to 6 cards, phases opening..closing, b opens with the conclusion", async () => {
  const { a, b } = await prepareStatusAlternatives(post);
  assert.equal(a.length, cardCount(18));
  assert.ok(a.length >= 3 && a.length <= 6);
  assert.equal(a[0].phase, "opening");
  assert.equal(a.at(-1).phase, "closing");
  assert.ok(a.slice(1, -1).every((c) => c.phase === "middle"));
  assert.equal(b[0].phase, "closing");
  assert.equal(b[0].title, "המסקנה");
  assert.deepEqual(b.slice(1).map((c) => c.text), a.slice(0, -1).map((c) => c.text));
});

test("rules: each card has up to 3 sentences, from the post, plus other suggested wordings", async () => {
  const { a } = await rulesMethod(post);
  for (const c of a) {
    assert.ok(splitSentences(c.text).length <= 3);
    for (const s of splitSentences(c.text)) assert.ok(sentences.includes(s), s);
    assert.ok(Array.isArray(c.options));
    assert.ok(!c.options.includes(c.text));
  }
  assert.ok(a.some((c) => c.options.length > 0));
});

test("card count grows with the post and stays within 3 to 6", () => {
  assert.equal(cardCount(4), 3);
  assert.equal(cardCount(20), 4);
  assert.equal(cardCount(200), 6);
});

test("short post gives a Hebrew message and runs no method", async () => {
  let called = false;
  await assert.rejects(
    prepareStatusAlternatives({ title: "קצר", body: "שתי מילים." }, async () => ((called = true), { a: [], b: [] })),
    (e) => e instanceof StatusAgentError && e.code === "too_short" && e.message === "הפוסט קצר מדי לסטטוס.",
  );
  assert.equal(called, false);
});

const card = (phase, text) => ({ phase, title: "כותרת", text, options: [] });
const good = { a: [card("opening", "א."), card("middle", "ב."), card("closing", "ג.")], b: [card("closing", "ג."), card("opening", "א."), card("middle", "ב.")] };

test("claude: valid JSON is accepted and normalized", async () => {
  const alts = await prepareStatusAlternatives(post, claudeMethod(async () => JSON.stringify(good)));
  assert.equal(alts.a.length, 3);
  assert.equal(alts.b[0].phase, "closing");
});

test("claude: one retry after a bad answer, then success", async () => {
  let calls = 0;
  const alts = await prepareStatusAlternatives(post, claudeMethod(async () => (++calls === 1 ? "לא JSON" : JSON.stringify(good))));
  assert.equal(calls, 2);
  assert.equal(alts.a.length, 3);
});

test("claude: too few cards twice gives an error", async () => {
  let calls = 0;
  const bad = async () => (calls++, JSON.stringify({ a: [card("opening", "א.")], b: good.b }));
  await assert.rejects(prepareStatusAlternatives(post, claudeMethod(bad)), (e) => e.code === "invalid");
  assert.equal(calls, 2);
});

test("claude: API failure gives a Hebrew error", async () => {
  const boom = claudeMethod(async () => {
    throw new Error("boom");
  });
  await assert.rejects(prepareStatusAlternatives(post, boom), (e) => e.code === "api" && /נסו שוב/.test(e.message));
});
