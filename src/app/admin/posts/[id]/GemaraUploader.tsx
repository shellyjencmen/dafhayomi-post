"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "../../admin.module.css";
import { deleteImage, finishUpload, moveImage, prepareUpload } from "./gemara-actions";

export type GemaraImage = { id: string; url: string; label: string | null; alt: string | null };

export function GemaraUploader({ postId, images }: { postId: string; images: GemaraImage[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) return setError("יש לבחור קובץ תמונה.");
    setBusy(true);
    setError(null);
    try {
      const prepared = await prepareUpload(postId, file.type, file.size);
      if (!("path" in prepared)) return setError(prepared.error);
      const browser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const { error: uploadError } = await browser.storage
        .from("gemara-originals")
        .uploadToSignedUrl(prepared.path, prepared.token, file);
      if (uploadError) return setError("ההעלאה נכשלה. נסי שוב.");
      const done = await finishUpload(postId, prepared.path, String(data.get("label") ?? ""), String(data.get("alt") ?? ""));
      if (done.error) return setError(done.error);
      form.reset();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <section>
      <h2>דפי גמרא</h2>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {images.length === 0 ? (
        <p>עדיין לא הועלו תמונות.</p>
      ) : (
        <ul className={styles.list}>
          {images.map((image, i) => (
            <li key={image.id}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", padding: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.alt ?? image.label ?? "דף גמרא"} width={72} height={96} style={{ objectFit: "cover", borderRadius: 4 }} />
                <span style={{ flex: 1 }}>{image.label ?? `תמונה ${i + 1}`}</span>
                <button type="button" className={styles.secondary} disabled={pending || i === 0} onClick={() => run(() => moveImage(postId, image.id, "up"))}>
                  למעלה
                </button>
                <button type="button" className={styles.secondary} disabled={pending || i === images.length - 1} onClick={() => run(() => moveImage(postId, image.id, "down"))}>
                  למטה
                </button>
                <button type="button" className={styles.secondary} disabled={pending} onClick={() => confirm("למחוק את התמונה?") && run(() => deleteImage(postId, image.id))}>
                  מחיקה
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onSubmit}>
        <div className={styles.field}>
          <label htmlFor="file">תמונת דף גמרא (PNG, JPG או WebP, עד 10MB)</label>
          <input id="file" name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
        </div>
        <div className={styles.field}>
          <label htmlFor="label">כיתוב (לא חובה)</label>
          <input id="label" name="label" maxLength={100} />
        </div>
        <div className={styles.field}>
          <label htmlFor="alt">תיאור לקורא מסך (לא חובה)</label>
          <input id="alt" name="alt" maxLength={200} />
        </div>
        <button className={styles.primary} disabled={busy}>
          {busy ? "מעלה..." : "העלאת תמונה"}
        </button>
      </form>
    </section>
  );
}
