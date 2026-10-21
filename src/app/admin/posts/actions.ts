"use server";

import { redirect } from "next/navigation";
import { sessionClient, getOwner } from "@/lib/supabase-server";

const MAX_TITLE = 200;
const MAX_BODY = 60000;
const MAX_SUMMARY = 500;

type Fields = {
  masechetId: number;
  daf: number;
  title: string;
  body: string;
  summary: string | null;
};

function back(id: string | null, key: "error" | "msg", text: string): never {
  const base = id ? `/admin/posts/${id}` : "/admin/posts/new";
  redirect(`${base}?${key}=${encodeURIComponent(text)}`);
}

function readFields(formData: FormData, id: string | null): Fields {
  const masechetId = Number(formData.get("masechet_id"));
  const daf = Number(formData.get("daf"));
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  const summary = String(formData.get("summary") ?? "").trim() || null;
  if (!Number.isInteger(masechetId) || masechetId < 1) back(id, "error", "יש לבחור מסכת.");
  if (!Number.isInteger(daf) || daf < 1) back(id, "error", "יש להזין מספר דף.");
  if (!title) back(id, "error", "יש להזין כותרת.");
  if (title.length > MAX_TITLE) back(id, "error", `הכותרת ארוכה מדי (עד ${MAX_TITLE} תווים).`);
  if (!body.trim()) back(id, "error", "יש להזין את גוף הפוסט.");
  if (body.length > MAX_BODY) back(id, "error", "גוף הפוסט ארוך מדי.");
  if (summary && summary.length > MAX_SUMMARY) back(id, "error", `התקציר ארוך מדי (עד ${MAX_SUMMARY} תווים).`);
  return { masechetId, daf, title, body, summary };
}

/**
 * Draft rule: a post's newest version row is its working draft whenever it is newer than
 * current_version_id. Saving edits that row, or adds a new one when the newest row is the one
 * readers currently see. Readers only ever see current_version_id of a published post.
 */
async function saveVersion(id: string | null, f: Fields) {
  const supabase = await sessionClient();
  let postId = id;

  if (!postId) {
    const base = `${f.masechetId}-${f.daf}`;
    for (let n = 0; n < 20 && !postId; n++) {
      const slug = n === 0 ? base : `${base}-${n + 1}`;
      const { data, error } = await supabase
        .from("posts")
        .insert({ slug, masechet_id: f.masechetId, daf: f.daf })
        .select("id")
        .single();
      if (data) postId = data.id;
      else if (error?.code !== "23505") back(null, "error", "השמירה נכשלה. נסי שוב.");
    }
    if (!postId) back(null, "error", "השמירה נכשלה. נסי שוב.");
  } else {
    await supabase.from("posts").update({ masechet_id: f.masechetId, daf: f.daf, updated_at: new Date().toISOString() }).eq("id", postId);
  }

  const { data: post } = await supabase.from("posts").select("current_version_id").eq("id", postId!).single();
  const { data: latest } = await supabase
    .from("post_versions")
    .select("id, version_no")
    .eq("post_id", postId!)
    .order("version_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  const content = { title: f.title, body: f.body, summary: f.summary };
  let versionId: string;
  if (latest && latest.id !== post?.current_version_id) {
    const { error } = await supabase.from("post_versions").update(content).eq("id", latest.id);
    if (error) back(postId, "error", "השמירה נכשלה. נסי שוב.");
    versionId = latest.id;
  } else {
    const { data, error } = await supabase
      .from("post_versions")
      .insert({ post_id: postId, version_no: (latest?.version_no ?? 0) + 1, ...content })
      .select("id")
      .single();
    if (error || !data) back(postId, "error", "השמירה נכשלה. נסי שוב.");
    versionId = data!.id;
  }
  return { postId: postId!, versionId };
}

export async function saveDraft(id: string | null, formData: FormData) {
  if (!(await getOwner())) redirect("/login");
  const f = readFields(formData, id);
  const { postId } = await saveVersion(id, f);
  redirect(`/admin/posts/${postId}?msg=${encodeURIComponent("הטיוטה נשמרה.")}`);
}

export async function publish(id: string | null, formData: FormData) {
  if (!(await getOwner())) redirect("/login");
  const f = readFields(formData, id);
  const { postId, versionId } = await saveVersion(id, f);
  const supabase = await sessionClient();
  const { data: post } = await supabase.from("posts").select("published_on").eq("id", postId).single();
  const { error } = await supabase
    .from("posts")
    .update({
      publish_state: "published",
      current_version_id: versionId,
      published_on: post?.published_on ?? new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);
  if (error) back(postId, "error", "הפרסום נכשל. נסי שוב.");
  redirect(`/admin/posts/${postId}?msg=${encodeURIComponent("הפוסט פורסם.")}`);
}

export async function unpublish(id: string) {
  if (!(await getOwner())) redirect("/login");
  const supabase = await sessionClient();
  await supabase.from("posts").update({ publish_state: "unpublished" }).eq("id", id);
  redirect(`/admin/posts/${id}?msg=${encodeURIComponent("הפוסט הוסר מהאתר. הגרסאות נשמרו.")}`);
}
