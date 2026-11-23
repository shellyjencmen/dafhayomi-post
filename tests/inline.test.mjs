import test from "node:test";
import assert from "node:assert/strict";
import { INLINE } from "../src/lib/inline.ts";

// Same walk as RichText.tsx, rendered to a string so the result is easy to compare.
function render(text) {
  let out = "", rest = text;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) return out + rest;
    out += rest.slice(0, m.index);
    if (m[2]) out += `<a>${render(m[1])}</a>`;
    else if (m[3] !== undefined) out += `<b>${render(m[3])}</b>`;
    else out += `<i>${render(m[4])}</i>`;
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

test("bold and italic together leave no stray asterisks", () => {
  assert.equal(render("ו***מודגש ונטוי***."), "ו<b><i>מודגש ונטוי</i></b>.");
});

test("bold, italic and links still work", () => {
  assert.equal(render("**א** ו*ב*"), "<b>א</b> ו<i>ב</i>");
  assert.equal(render("**א** **ב**"), "<b>א</b> <b>ב</b>");
  assert.equal(render("[קישור](https://example.com/x)"), "<a>קישור</a>");
  assert.equal(render("ללא עיצוב"), "ללא עיצוב");
});
