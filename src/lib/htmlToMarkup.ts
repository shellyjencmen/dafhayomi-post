/** Converts pasted rich text (Google Docs, Word, web) to the post markup: **bold**, *italic*, [text](url), blank line between paragraphs. Browser only. */
const BLOCK = new Set(["P", "DIV", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "TR"]);

function isBold(el: HTMLElement): boolean {
  const w = el.style.fontWeight;
  return el.tagName === "B" || el.tagName === "STRONG" || w === "bold" || Number(w) >= 600;
}

function isItalic(el: HTMLElement): boolean {
  return el.tagName === "I" || el.tagName === "EM" || el.style.fontStyle === "italic";
}

function wrap(mark: string, text: string): string {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text)!;
  return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : text;
}

function walk(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").replace(/\s*\n\s*/g, " ");
  if (!(node instanceof HTMLElement)) return "";
  if (node.tagName === "BR") return "\n";
  if (["STYLE", "SCRIPT", "META"].includes(node.tagName)) return "";
  let text = Array.from(node.childNodes).map(walk).join("");
  // Google Docs wraps everything in <b style="font-weight:normal">
  if (node.tagName === "B" && node.style.fontWeight === "normal") return text;
  if (node.tagName === "A") {
    const href = node.getAttribute("href") ?? "";
    if (/^https?:\/\//.test(href) && text.trim()) text = `[${text.trim()}](${href})`;
  } else {
    if (isBold(node)) text = wrap("**", text);
    if (isItalic(node)) text = wrap("*", text);
  }
  return BLOCK.has(node.tagName) ? `${text}\n\n` : text;
}

export function htmlToMarkup(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return walk(doc.body)
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
