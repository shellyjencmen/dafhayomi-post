const LETTERS: [string, number][] = [
  ["ק", 100], ["צ", 90], ["פ", 80], ["ע", 70], ["ס", 60], ["נ", 50], ["מ", 40], ["ל", 30], ["כ", 20],
  ["י", 10], ["ט", 9], ["ח", 8], ["ז", 7], ["ו", 6], ["ה", 5], ["ד", 4], ["ג", 3], ["ב", 2], ["א", 1],
];

const FINAL_FORMS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

// Accepts digits ("12") or Hebrew letters ("יב", "קכ", "י״ב"), also with the word "דף" ("דף מא"). Returns null when invalid.
export function parseDaf(input: string): number | null {
  const text = input
    .trim()
    .replace(/^דף[\s:]+/, "")
    .replace(/\s+/g, "")
    .replace(/[׳״"'׳״]/g, "");
  if (/^\d+$/.test(text)) {
    const n = Number(text);
    return n >= 1 && n <= 999 ? n : null;
  }
  let total = 0;
  for (const ch of text) {
    const letter = FINAL_FORMS[ch] ?? ch;
    const value = LETTERS.find(([l]) => l === letter)?.[1];
    if (!value) return null;
    total += value;
  }
  return total >= 1 && total <= 999 ? total : null;
}

// 2 -> "ב", 15 -> "טו", 120 -> "קכ"
export function formatDaf(n: number | null | undefined): string {
  if (!n || n < 1) return "";
  let rest = n;
  let out = "";
  for (const [letter, value] of LETTERS) {
    while (rest >= value) {
      out += letter;
      rest -= value;
    }
  }
  return out.replace(/יה$/, "טו").replace(/יו$/, "טז");
}
