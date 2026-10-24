"use client";

import { htmlToMarkup } from "@/lib/htmlToMarkup";

/** Body textarea. Pasting formatted text (bold, italic, links) keeps it as post markup. */
export function BodyField({ defaultValue }: { defaultValue: string }) {
  return (
    <textarea
      id="body"
      name="body"
      defaultValue={defaultValue}
      required
      onPaste={(e) => {
        const html = e.clipboardData.getData("text/html");
        if (!html) return;
        const markup = htmlToMarkup(html);
        if (!markup) return;
        e.preventDefault();
        const el = e.currentTarget;
        el.setRangeText(markup, el.selectionStart, el.selectionEnd, "end");
      }}
    />
  );
}
