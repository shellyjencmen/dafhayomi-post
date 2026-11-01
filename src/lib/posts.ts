/** Shared helpers for showing posts to readers. */

import { formatDaf } from "./daf";

export function masechetName(m: { name: string } | { name: string }[] | null | undefined) {
  return Array.isArray(m) ? m[0]?.name : m?.name;
}

/** The line under the brand on the status and short post images, e.g. "בכורות, דף ל"א". No author name (Shelly, 29.10.2026). */
export function shortPostMeta(m: { name: string } | { name: string }[] | null | undefined, daf: number | null) {
  const name = masechetName(m);
  return name ? `${name}, דף ${formatDaf(daf)}` : "";
}

/** Suggestion only (about 200 words per minute); shown as "N דקות קריאה". */
export function readingMinutes(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatPublishedOn(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("he-IL", { day: "numeric", month: "long", timeZone: "UTC" });
}

export function paragraphsOf(body: string): string[] {
  // Bodies pasted from Windows keep \r\n line endings; normalize before splitting into paragraphs.
  return String(body).replace(/\r\n?/g, "\n").split(/\n{2,}/).filter((p) => p.trim());
}
