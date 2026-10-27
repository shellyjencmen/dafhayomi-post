/**
 * Status agent core (MVP4, PRD 3.7): turns a published post into two status alternatives.
 * Cards summarize the idea at three stops (opening, middle, closing). Alternative a follows the
 * post's order, b opens with the conclusion. The method can change without changing the screens:
 * "rules" (default, free) picks and trims sentences from the post; "claude" asks the Claude API.
 * No imports, so tests can run it directly with node.
 */

export const MIN_CARDS = 3;
export const MAX_CARDS = 6;
export const MAX_SENTENCES_PER_CARD = 3;
const MAX_CARD_CHARS = 240;
const MAX_OPTIONS = 3;
const MIN_POST_SENTENCES = MIN_CARDS + 1;
const DEFAULT_MODEL = "claude-sonnet-5-5";

export type Phase = "opening" | "middle" | "closing";
export const PHASE_TITLES: Record<Phase, string> = { opening: "פתיחה", middle: "אמצע", closing: "סיום" };

/** One status card. `options` are other suggested wordings; the owner may swap text for one of them. */
export type StatusCard = { phase: Phase; title: string; text: string; options: string[] };
export type StatusPost = { title: string; body: string };
export type Alternatives = { a: StatusCard[]; b: StatusCard[] };
export type Method = (post: StatusPost) => Promise<Alternatives>;
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
    .split(/\r?\n+/)
    .flatMap((line) => line.split(/(?<=[.!?:])\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** 3 cards for a short post, up to 6 for a long one (about one card per 5 sentences). */
export function cardCount(sentences: number) {
  return Math.min(MAX_CARDS, Math.max(MIN_CARDS, Math.round(sentences / 5)));
}

export function phaseOf(index: number, count: number): Phase {
  if (index === 0) return "opening";
  if (index === count - 1) return "closing";
  return "middle";
}

/** Splits sentences into `count` consecutive chunks of near-equal size. */
function chunks<T>(items: T[], count: number): T[][] {
  return Array.from({ length: count }, (_, i) =>
    items.slice(Math.floor((i * items.length) / count), Math.floor(((i + 1) * items.length) / count)),
  );
}

/** Up to 3 sentences from `start`, within the length limit. Always at least one sentence. */
function wording(sentences: string[], start: number) {
  const out: string[] = [];
  for (let i = start; i < sentences.length && out.length < MAX_SENTENCES_PER_CARD; i++) {
    if (out.length && [...out, sentences[i]].join(" ").length > MAX_CARD_CHARS) break;
    out.push(sentences[i]);
  }
  return squash(out.join(" "));
}

/** A sentence that reads well alone: not an opening for a list or quote, not too short or too long. */
function readsAlone(s: string) {
  return !/[:,\-–]$/.test(s) && !/^[-–"״]/.test(s) && s.length >= 20 && s.length <= 220;
}

function cardFrom(chunk: string[], phase: Phase): StatusCard {
  const good = chunk.filter(readsAlone);
  const pool = good.length ? good : chunk;
  const all = pool.map((_, i) => wording(pool, i)).filter((w, i, arr) => w && arr.indexOf(w) === i);
  return { phase, title: PHASE_TITLES[phase], text: all[0], options: all.slice(1, 1 + MAX_OPTIONS) };
}

/** Free POC method: picks and trims sentences of the post for each stop. No API. */
export const rulesMethod: Method = async (post) => {
  const sentences = splitSentences(post.body);
  const count = cardCount(sentences.length);
  const a = chunks(sentences, count).map((c, i) => cardFrom(c, phaseOf(i, count)));
  const closing = a[a.length - 1];
  const b = [{ ...closing, title: "המסקנה" }, ...a.slice(0, -1)];
  return { a, b };
};

function cardProblems(cards: unknown): string[] {
  if (!Array.isArray(cards) || cards.length < MIN_CARDS || cards.length > MAX_CARDS) {
    return [`צריך בין ${MIN_CARDS} ל-${MAX_CARDS} כרטיסים`];
  }
  const problems: string[] = [];
  for (const card of cards as Partial<StatusCard>[]) {
    if (!card || typeof card.text !== "string" || !card.text.trim()) problems.push("כרטיס ריק");
    else if (splitSentences(card.text).length > MAX_SENTENCES_PER_CARD) problems.push(`יותר מ-${MAX_SENTENCES_PER_CARD} משפטים בכרטיס: ${card.text}`);
    if (!card || !["opening", "middle", "closing"].includes(card.phase as string)) problems.push("כרטיס בלי שלב");
  }
  return problems;
}

function normalize(cards: Partial<StatusCard>[]): StatusCard[] {
  return cards.map((c) => ({
    phase: c.phase as Phase,
    title: squash(c.title || PHASE_TITLES[c.phase as Phase]),
    text: squash(c.text as string),
    options: (Array.isArray(c.options) ? c.options : []).filter((o) => typeof o === "string" && o.trim()).map(squash).slice(0, MAX_OPTIONS),
  }));
}

export function buildPrompt(post: StatusPost, feedback?: string[]) {
  const system =
    "מכינים סטטוס לוואטסאפ מתוך פוסט בדף היומי, למי שלא מעמיק. הכרטיסים מסכמים את הרעיון הכללי בשלוש תחנות: פתיחה, אמצע וסיום, " +
    "בניסוח פשוט. אין להוסיף רעיון שלא מופיע בפוסט. ניקוד וגרשיים נשמרים. " +
    `מחזירים JSON בלבד: {"a":[...],"b":[...]}. בכל חלופה ${MIN_CARDS} עד ${MAX_CARDS} כרטיסים, ` +
    `כל כרטיס {"phase":"opening"|"middle"|"closing","title":"כותרת קצרה","text":"עד ${MAX_SENTENCES_PER_CARD} משפטים","options":["עד ${MAX_OPTIONS} ניסוחים אחרים"]}. ` +
    "חלופה a עוקבת אחרי סדר הפוסט, חלופה b פותחת במסקנה.";
  const retry = feedback?.length ? `\n\nהניסיון הקודם נפסל מהסיבות האלה, תקנו:\n${feedback.join("\n")}` : "";
  return { system, user: `כותרת: ${post.title}\n\nהפוסט:\n${plainText(post.body)}${retry}` };
}

/** Optional method: the Claude API writes the summaries. One retry with the reasons for rejection. */
export function claudeMethod(complete: Complete): Method {
  return async (post) => {
    let feedback: string[] | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      let raw: string;
      try {
        raw = await complete(buildPrompt(post, feedback));
      } catch (e) {
        if (e instanceof StatusAgentError) throw e;
        throw new StatusAgentError("api", "ההכנה נכשלה. נסו שוב בעוד רגע.");
      }
      let parsed: { a?: unknown; b?: unknown } | undefined;
      try {
        parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "");
      } catch {
        feedback = ["התשובה לא הייתה JSON תקין"];
        continue;
      }
      const problems = [...cardProblems(parsed?.a), ...cardProblems(parsed?.b)];
      if (!problems.length) return { a: normalize(parsed!.a as StatusCard[]), b: normalize(parsed!.b as StatusCard[]) };
      feedback = problems;
    }
    throw new StatusAgentError("invalid", "לא הצלחנו להכין חלופות. נסו שוב.");
  };
}

/** Two alternatives, or a StatusAgentError with a Hebrew message. */
export async function prepareStatusAlternatives(post: StatusPost, method: Method = rulesMethod): Promise<Alternatives> {
  if (splitSentences(post.body).length < MIN_POST_SENTENCES) {
    throw new StatusAgentError("too_short", "הפוסט קצר מדי לסטטוס.");
  }
  const alts = await method(post);
  const problems = [...cardProblems(alts.a), ...cardProblems(alts.b)];
  if (problems.length) throw new StatusAgentError("invalid", "לא הצלחנו להכין חלופות. נסו שוב.");
  return alts;
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
        max_tokens: 2000,
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

/** The method the environment asks for: STATUS_METHOD=claude turns on the API; anything else uses the rules. */
export function methodFromEnv(env: Record<string, string | undefined> = process.env): Method {
  return env.STATUS_METHOD === "claude" ? claudeMethod(claudeComplete(env)) : rulesMethod;
}
