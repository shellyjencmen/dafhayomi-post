/**
 * Status agent core (MVP4): turns a published post into two status alternatives.
 * Every card is made of sentences copied from the post as they are. The model only chooses;
 * the code checks that each sentence exists in the post and drops any alternative that fails.
 * No imports, so tests can run it directly with node.
 */

export const CARDS_PER_ALTERNATIVE = 3;
export const MAX_SENTENCES_PER_CARD = 3;
const MIN_POST_SENTENCES = CARDS_PER_ALTERNATIVE + 1;
const DEFAULT_MODEL = "claude-sonnet-5-5";

export type StatusPost = { title: string; body: string };
export type Alternatives = { a: string[]; b: string[] };
export type Complete = (prompt: { system: string; user: string }) => Promise<string>;

export class StatusAgentError extends Error {
  code: "too_short" | "api" | "invalid";
  constructor(code: "too_short" | "api" | "invalid", message: string) {
    super(message);
    this.code = code;
  }
}

/** Post body without the markup of RichText (bold, italic, links). */
export function plainText(body: string) {
  return String(body)
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)\s]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/[ \t]+/g, " ");
}

export function splitSentences(body: string): string[] {
  return plainText(body)
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?:])\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** Sentences of one card that are not found in the post. Empty array means the card is faithful. */
export function unfaithfulSentences(card: string, post: StatusPost): string[] {
  const source = squash(plainText(post.body));
  return splitSentences(card).filter((s) => !source.includes(squash(s)));
}

function cardProblems(cards: unknown, post: StatusPost): string[] {
  if (!Array.isArray(cards) || cards.length !== CARDS_PER_ALTERNATIVE) {
    return [`צריך בדיוק ${CARDS_PER_ALTERNATIVE} כרטיסים`];
  }
  const problems: string[] = [];
  for (const card of cards) {
    if (typeof card !== "string" || !card.trim()) {
      problems.push("כרטיס ריק");
      continue;
    }
    if (splitSentences(card).length > MAX_SENTENCES_PER_CARD) problems.push(`יותר מ-${MAX_SENTENCES_PER_CARD} משפטים בכרטיס: ${card}`);
    problems.push(...unfaithfulSentences(card, post).map((s) => `משפט שלא בפוסט: ${s}`));
  }
  return problems;
}

export function buildPrompt(post: StatusPost, feedback?: string[]) {
  const system =
    "את/ה מכין/ה סטטוס קצר לוואטסאפ מתוך פוסט בדף היומי. אסור לשכתב, לקצר או להמציא. " +
    "בוחרים משפטים מהפוסט כפי שהם, תו בתו, כולל ניקוד וגרשיים. " +
    `מחזירים JSON בלבד: {"a":[...],"b":[...]}. בכל חלופה בדיוק ${CARDS_PER_ALTERNATIVE} כרטיסים, ` +
    `כל כרטיס הוא מחרוזת של עד ${MAX_SENTENCES_PER_CARD} משפטים מהפוסט, ברצף או לא. ` +
    "שתי החלופות צריכות להיות שונות זו מזו. הכרטיסים נותנים את הרעיון המרכזי בכללותו, למי שלא מעמיק.";
  const retry = feedback?.length ? `\n\nהניסיון הקודם נפסל מהסיבות האלה, תקנו:\n${feedback.join("\n")}` : "";
  const user = `כותרת: ${post.title}\n\nהפוסט:\n${plainText(post.body)}${retry}`;
  return { system, user };
}

function parse(raw: string): { a: unknown; b: unknown } {
  const json = raw.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new StatusAgentError("invalid", "התשובה לא הייתה במבנה הצפוי.");
  try {
    return JSON.parse(json);
  } catch {
    throw new StatusAgentError("invalid", "התשובה לא הייתה במבנה הצפוי.");
  }
}

/** Two alternatives, or a StatusAgentError with a Hebrew message. One retry with the reasons for rejection. */
export async function prepareStatusAlternatives(post: StatusPost, complete: Complete): Promise<Alternatives> {
  if (splitSentences(post.body).length < MIN_POST_SENTENCES) {
    throw new StatusAgentError("too_short", "הפוסט קצר מדי לסטטוס.");
  }
  let feedback: string[] | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    let raw: string;
    try {
      raw = await complete(buildPrompt(post, feedback));
    } catch (e) {
      if (e instanceof StatusAgentError) throw e;
      throw new StatusAgentError("api", "ההכנה נכשלה. נסו שוב בעוד רגע.");
    }
    let parsed;
    try {
      parsed = parse(raw);
    } catch (e) {
      feedback = ["התשובה לא הייתה JSON תקין"];
      if (attempt === 1) throw e;
      continue;
    }
    const problems = [...cardProblems(parsed.a, post), ...cardProblems(parsed.b, post)];
    if (!problems.length && JSON.stringify(parsed.a) === JSON.stringify(parsed.b)) problems.push("שתי החלופות זהות");
    if (!problems.length) return { a: (parsed.a as string[]).map(squash), b: (parsed.b as string[]).map(squash) };
    feedback = problems;
  }
  throw new StatusAgentError("invalid", "לא הצלחנו להכין חלופות נאמנות לפוסט. נסו שוב.");
}

/** Real call to the Claude API. The key stays on the server (ANTHROPIC_API_KEY). */
export function claudeComplete(env: Record<string, string | undefined> = process.env): Complete {
  return async ({ system, user }) => {
    if (!env.ANTHROPIC_API_KEY) throw new StatusAgentError("api", "חסר מפתח Claude API בסביבה הזו.");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 1500,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(50_000),
    });
    if (!res.ok) throw new StatusAgentError("api", "ההכנה נכשלה. נסו שוב בעוד רגע.");
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    return data.content?.find((c) => c.type === "text")?.text ?? "";
  };
}

/** Deterministic stand-in with no API: spreads sentences over the cards. For fixtures and tests. */
export const mockComplete: Complete = async ({ user }) => {
  const body = user.split("\nהפוסט:\n")[1] ?? "";
  const sentences = splitSentences(body.split("\n\nהניסיון הקודם")[0]);
  const pick = (offset: number) =>
    Array.from({ length: CARDS_PER_ALTERNATIVE }, (_, i) => sentences[(i * 2 + offset) % sentences.length]);
  return JSON.stringify({ a: pick(0), b: pick(1) });
};
