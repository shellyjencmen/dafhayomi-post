import type { ReactNode } from "react";

/**
 * Post bodies keep the original formatting as light markup:
 * **bold**, *italic*, [text](https://link), a new line for a line break, a blank line between paragraphs.
 * Rendered as React nodes only, never as raw HTML.
 */
const INLINE = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*/;

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let n = 0;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) {
      out.push(rest);
      break;
    }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    const key = `${keyPrefix}-${n++}`;
    if (m[2]) {
      out.push(
        <a key={key} href={m[2]} target="_blank" rel="noreferrer">
          {inline(m[1], key)}
        </a>,
      );
    } else if (m[3] !== undefined) {
      out.push(<strong key={key}>{inline(m[3], key)}</strong>);
    } else {
      out.push(<em key={key}>{inline(m[4], key)}</em>);
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

export function RichParagraph({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <p>
      {lines.map((line, i) => (
        <span key={i}>
          {i > 0 ? <br /> : null}
          {inline(line, String(i))}
        </span>
      ))}
    </p>
  );
}
