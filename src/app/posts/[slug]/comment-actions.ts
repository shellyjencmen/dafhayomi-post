"use server";

import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase";

const MAX_NAME = 60;
const MAX_BODY = 1000;
const MAX_PENDING_PER_POST = 50;

function back(slug: string, params: Record<string, string>): never {
  redirect(`/posts/${slug}?${new URLSearchParams(params).toString()}#comments`);
}

/** Saves a comment as pending. It is shown to readers only after the owner approves it. */
export async function submitComment(slug: string, formData: FormData) {
  // Hidden field that people leave empty; bots usually fill it. Pretend success.
  if (String(formData.get("website") ?? "").trim()) back(slug, { sent: "1" });

  const name = String(formData.get("name") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!name || !body) back(slug, { cerror: "יש למלא שם ותגובה." });
  if (name.length > MAX_NAME) back(slug, { cerror: `השם ארוך מדי (עד ${MAX_NAME} תווים).` });
  if (body.length > MAX_BODY) back(slug, { cerror: `התגובה ארוכה מדי (עד ${MAX_BODY} תווים).` });

  const db = adminClient();
  const { data: post } = await db.from("posts").select("id").eq("slug", slug).eq("publish_state", "published").maybeSingle();
  if (!post) back(slug, { cerror: "לא ניתן להגיב על הפוסט הזה." });

  const { count } = await db
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", post!.id)
    .eq("status", "pending");
  if ((count ?? 0) >= MAX_PENDING_PER_POST) back(slug, { cerror: "יש כרגע הרבה תגובות שממתינות לאישור. נסו שוב מאוחר יותר." });

  const { error } = await db.from("comments").insert({ post_id: post!.id, author_name: name, body });
  if (error) back(slug, { cerror: "שליחת התגובה נכשלה. נסו שוב." });
  back(slug, { sent: "1" });
}
