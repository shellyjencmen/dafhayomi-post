// One-time copy of the imported posts (Issue #18) from the test project to production.
// The test project is the source of truth: bodies there already carry the light markup.
// Copies only posts whose masechet and daf appear in posts.json / posts2.json (the 68 imported posts),
// the current version of each as version 1, and its Gemara images (both buckets, new random paths).
// A post whose slug already exists in production is skipped, so the script can be run again safely.
//
// Run from the repo root (needs node_modules for supabase-js). Without --run it only prints what it would do:
//   TEST_SUPABASE_URL=... TEST_SUPABASE_SECRET_KEY=... PROD_SUPABASE_URL=... PROD_SUPABASE_SECRET_KEY=... \
//   node docs/runbook/import/copy-posts-test-to-prod.mjs <posts.json> <posts2.json> [--run] [--publish]
// Posts land as drafts unless --publish is given.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(join(process.cwd(), "package.json"));
const { createClient } = require("@supabase/supabase-js");

const args = process.argv.slice(2);
const files = args.filter((a) => !a.startsWith("--"));
const run = args.includes("--run");
const state = args.includes("--publish") ? "published" : "draft";
const env = process.env;
if (files.length !== 2 || !env.TEST_SUPABASE_URL || !env.TEST_SUPABASE_SECRET_KEY || !env.PROD_SUPABASE_URL || !env.PROD_SUPABASE_SECRET_KEY)
  throw new Error("usage: see header");
if (env.TEST_SUPABASE_URL === env.PROD_SUPABASE_URL) throw new Error("source and target are the same project");

const opts = { auth: { persistSession: false } };
const src = createClient(env.TEST_SUPABASE_URL, env.TEST_SUPABASE_SECRET_KEY, opts);
const dst = createClient(env.PROD_SUPABASE_URL, env.PROD_SUPABASE_SECRET_KEY, opts);
const must = ({ data, error }) => { if (error) throw error; return data; };

const imported = new Set(files.flatMap((f) => JSON.parse(readFileSync(f, "utf8"))).map((p) => `${p.masechet}|${p.daf}`));

// Slugs carry the masechet id, so both projects must have the same seed (0003).
const srcM = must(await src.from("masechtot").select("id, name").order("id"));
const dstM = must(await dst.from("masechtot").select("id, name").order("id"));
if (JSON.stringify(srcM) !== JSON.stringify(dstM)) throw new Error("masechtot differ between test and production; run 0003 in production first");
const masechet = Object.fromEntries(srcM.map((m) => [m.id, m.name]));

const posts = must(await src.from("posts").select("id, slug, masechet_id, daf, published_on, current_version_id").order("published_on"))
  .filter((p) => imported.has(`${masechet[p.masechet_id]}|${p.daf}`));
if (posts.length !== imported.size) throw new Error(`expected ${imported.size} posts in test, found ${posts.length}`);
const existing = new Set(must(await dst.from("posts").select("slug")).map((p) => p.slug));

let copied = 0, skipped = 0, images = 0;
for (const p of posts) {
  if (existing.has(p.slug)) { skipped++; console.log(`skip ${p.slug} (exists)`); continue; }
  const v = must(await src.from("post_versions").select("title, body, summary").eq("id", p.current_version_id).single());
  const pages = must(await src.from("gemara_pages").select("sort, label, alt_text, image_path, original_path").eq("post_id", p.id).order("sort"));
  console.log(`${run ? "copy" : "dry"} ${p.slug} ${masechet[p.masechet_id]} ${p.daf} "${v.title}" images=${pages.length}`);
  if (!run) { copied++; images += pages.length; continue; }

  const post = must(await dst.from("posts").insert({
    slug: p.slug, masechet_id: p.masechet_id, daf: p.daf, published_on: p.published_on, publish_state: state,
  }).select("id").single());
  const ver = must(await dst.from("post_versions").insert({ post_id: post.id, version_no: 1, ...v }).select("id").single());
  must(await dst.from("posts").update({ current_version_id: ver.id }).eq("id", post.id));

  for (const g of pages) {
    const image = `${post.id}/${randomUUID()}.webp`;
    const webp = must(await src.storage.from("gemara").download(g.image_path));
    must(await dst.storage.from("gemara").upload(image, webp, { contentType: "image/webp" }));
    let original = null;
    if (g.original_path) {
      const buf = must(await src.storage.from("gemara-originals").download(g.original_path));
      original = `${post.id}/${randomUUID()}.${g.original_path.split(".").pop()}`;
      must(await dst.storage.from("gemara-originals").upload(original, buf, { contentType: buf.type }));
    }
    must(await dst.from("gemara_pages").insert({
      post_id: post.id, sort: g.sort, label: g.label, alt_text: g.alt_text, image_path: image, original_path: original,
    }));
    images++;
  }
  copied++;
}
console.log(`${run ? "copied" : "would copy"} ${copied} posts as ${state}, ${images} images; skipped ${skipped}`);
