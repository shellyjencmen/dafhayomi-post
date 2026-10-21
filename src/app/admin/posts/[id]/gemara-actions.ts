"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { adminClient } from "@/lib/supabase";
import { getOwner } from "@/lib/supabase-server";

const ORIGINALS = "gemara-originals";
const PUBLIC = "gemara";
const MAX_IMAGES = 12;
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

type Result<T = object> = ({ error: string } | ({ error?: undefined } & T));

export async function prepareUpload(postId: string, type: string, size: number): Promise<Result<{ path: string; token: string }>> {
  if (!(await getOwner())) return { error: "נדרשת כניסה." };
  const ext = TYPES[type];
  if (!ext) return { error: "אפשר להעלות רק תמונות מסוג PNG, JPG או WebP." };
  if (size > MAX_BYTES) return { error: "הקובץ גדול מדי (עד 10MB)." };
  const db = adminClient();
  const { count } = await db.from("gemara_pages").select("id", { count: "exact", head: true }).eq("post_id", postId);
  if ((count ?? 0) >= MAX_IMAGES) return { error: `אפשר להעלות עד ${MAX_IMAGES} תמונות לפוסט.` };
  const path = `${postId}/${randomUUID()}.${ext}`;
  const { data, error } = await db.storage.from(ORIGINALS).createSignedUploadUrl(path);
  if (error || !data) return { error: "ההעלאה נכשלה. נסי שוב." };
  return { path, token: data.token };
}

export async function finishUpload(postId: string, path: string, label: string, altText: string): Promise<Result> {
  if (!(await getOwner())) return { error: "נדרשת כניסה." };
  if (!path.startsWith(`${postId}/`)) return { error: "ההעלאה נכשלה. נסי שוב." };
  const db = adminClient();
  try {
    const { data: file, error: downloadError } = await db.storage.from(ORIGINALS).download(path);
    if (downloadError || !file) return { error: "ההעלאה נכשלה. נסי שוב." };
    let webp: Buffer;
    try {
      webp = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } catch {
      await db.storage.from(ORIGINALS).remove([path]);
      return { error: "הקובץ אינו תמונה תקינה." };
    }
    const imagePath = `${postId}/${randomUUID()}.webp`;
    const { error: uploadError } = await db.storage.from(PUBLIC).upload(imagePath, webp, { contentType: "image/webp" });
    if (uploadError) return { error: "ההעלאה נכשלה. נסי שוב." };

    const { data: last } = await db
      .from("gemara_pages")
      .select("sort")
      .eq("post_id", postId)
      .order("sort", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error: insertError } = await db.from("gemara_pages").insert({
      post_id: postId,
      sort: (last?.sort ?? 0) + 1,
      label: label.trim() || null,
      alt_text: altText.trim() || null,
      image_path: imagePath,
      original_path: path,
    });
    if (insertError) {
      await db.storage.from(PUBLIC).remove([imagePath]);
      return { error: "השמירה נכשלה. נסי שוב." };
    }
  } catch (error) {
    console.error("finishUpload failed", error);
    return { error: "ההעלאה נכשלה. נסי שוב." };
  }
  revalidatePath(`/admin/posts/${postId}`);
  return {};
}

export async function moveImage(postId: string, imageId: string, direction: "up" | "down"): Promise<Result> {
  if (!(await getOwner())) return { error: "נדרשת כניסה." };
  const db = adminClient();
  const { data: rows } = await db.from("gemara_pages").select("id, sort").eq("post_id", postId).order("sort");
  const list = (rows ?? []) as { id: string; sort: number }[];
  const i = list.findIndex((r) => r.id === imageId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return {};
  const [a, b] = [list[i], list[j]];
  const steps = [
    db.from("gemara_pages").update({ sort: 0 }).eq("id", a.id),
    db.from("gemara_pages").update({ sort: a.sort }).eq("id", b.id),
    db.from("gemara_pages").update({ sort: b.sort }).eq("id", a.id),
  ];
  for (const step of steps) {
    const { error } = await step;
    if (error) return { error: "הסידור נכשל. נסי שוב." };
  }
  revalidatePath(`/admin/posts/${postId}`);
  return {};
}

export async function deleteImage(postId: string, imageId: string): Promise<Result> {
  if (!(await getOwner())) return { error: "נדרשת כניסה." };
  const db = adminClient();
  const { data: row } = await db
    .from("gemara_pages")
    .select("image_path, original_path")
    .eq("id", imageId)
    .eq("post_id", postId)
    .maybeSingle();
  if (!row) return {};
  const { error } = await db.from("gemara_pages").delete().eq("id", imageId);
  if (error) return { error: "המחיקה נכשלה. נסי שוב." };
  await db.storage.from(PUBLIC).remove([row.image_path]);
  if (row.original_path) await db.storage.from(ORIGINALS).remove([row.original_path]);
  revalidatePath(`/admin/posts/${postId}`);
  return {};
}
