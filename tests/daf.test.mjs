import test from "node:test";
import assert from "node:assert/strict";
import { parseDaf } from "../src/lib/daf.ts";

test("accepts letters, digits and the word daf", () => {
  for (const v of ["מא", "דף מא", "דף: מא", " מא ", "41", "מ״א", "מ\"א"]) assert.equal(parseDaf(v), 41, v);
  assert.equal(parseDaf("ב"), 2);
  assert.equal(parseDaf("קכ"), 120);
});

test("rejects values that are not a page", () => {
  for (const v of ["", "   ", "abc", "0", "1000", "דף x"]) assert.equal(parseDaf(v), null, v);
});
