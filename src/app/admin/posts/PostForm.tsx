import Link from "next/link";
import { publish, saveDraft, unpublish } from "./actions";
import { BodyField } from "./BodyField";
import { FormKeeper } from "./FormKeeper";
import { formatDaf } from "@/lib/daf";
import styles from "../admin.module.css";

export type FormValues = {
  id: string | null;
  masechetId: number | null;
  daf: number | null;
  title: string;
  body: string;
  summary: string;
  state: string;
  slug: string | null;
};

export function PostForm({
  values,
  masechtot,
  message,
  error,
}: {
  values: FormValues;
  masechtot: { id: number; name: string }[];
  message?: string;
  error?: string;
}) {
  const { id } = values;
  return (
    <main className={styles.page}>
      <h1>{id ? "עריכת פוסט" : "פוסט חדש"}</h1>
      {message && <p className={styles.message} role="status">{message}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <form>
        <FormKeeper formKey={id ?? "new"} restore={!!error} clear={!!message} />
        <div className={styles.field}>
          <label htmlFor="masechet_id">מסכת</label>
          <select id="masechet_id" name="masechet_id" defaultValue={values.masechetId ?? ""} required>
            <option value="" disabled>
              בחרי מסכת
            </option>
            {masechtot.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="daf">דף</label>
          <input id="daf" name="daf" type="text" inputMode="text" placeholder="לדוגמה: ב או 2" defaultValue={formatDaf(values.daf)} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="title">כותרת (עד 200 תווים)</label>
          <input id="title" name="title" maxLength={200} defaultValue={values.title} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="summary">תקציר (לא חובה)</label>
          <input id="summary" name="summary" maxLength={500} defaultValue={values.summary} />
        </div>
        <div className={styles.field}>
          <label htmlFor="body">גוף הפוסט (עד 60,000 תווים, שורה ריקה בין פסקאות; הדבקה מגוגל דוקס שומרת הדגשות)</label>
          <BodyField defaultValue={values.body} />
        </div>
        <div className={styles.actions}>
          <button className={styles.secondary} formAction={saveDraft.bind(null, id)}>
            שמירת טיוטה
          </button>
          <button className={styles.primary} formAction={publish.bind(null, id)}>
            פרסום
          </button>
          {id && (
            <Link className={styles.secondary} href={`/admin/posts/${id}/preview`}>
              תצוגה מקדימה
            </Link>
          )}
        </div>
      </form>
      {id && values.state === "published" && values.slug && (
        <p>
          <Link href={`/posts/${values.slug}`}>לצפייה בפוסט באתר</Link>
        </p>
      )}
      {id && values.state === "published" && (
        <form action={unpublish.bind(null, id)}>
          <button className={styles.secondary}>הסרה מהאתר</button>
        </form>
      )}
      {id && (
        <p>
          <Link href={`/admin/posts/${id}/delete`}>מחיקת הפוסט</Link>
        </p>
      )}
    </main>
  );
}
