import { submitComment } from "./comment-actions";

export type PublicComment = { id: string; author_name: string; body: string; created_at: string };

export function Comments({
  slug,
  comments,
  sent,
  error,
}: {
  slug: string;
  comments: PublicComment[];
  sent: boolean;
  error?: string;
}) {
  return (
    <section id="comments" className="comments" aria-labelledby="comments-title">
      <h2 id="comments-title">תגובות ({comments.length})</h2>
      {comments.length === 0 ? <p className="muted">עדיין אין תגובות. אפשר להיות הראשונים.</p> : null}
      <ul className="comment-list">
        {comments.map((c) => (
          <li key={c.id}>
            <strong>{c.author_name}</strong>
            <p>{c.body}</p>
          </li>
        ))}
      </ul>
      {sent ? (
        <p className="notice" role="status">
          תודה! התגובה נשלחה ותופיע באתר אחרי שאבי יאשר אותה.
        </p>
      ) : null}
      {error ? (
        <p className="notice error" role="alert">
          {error}
        </p>
      ) : null}
      <form action={submitComment.bind(null, slug)} className="comment-form">
        <label htmlFor="c-name">שם</label>
        <input id="c-name" name="name" maxLength={60} required />
        <label htmlFor="c-body">תגובה</label>
        <textarea id="c-body" name="body" maxLength={1000} rows={4} required />
        <div className="hp" aria-hidden="true">
          <label htmlFor="c-web">אל תמלאו שדה זה</label>
          <input id="c-web" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <button type="submit" className="button-link">
          שליחת תגובה
        </button>
        <p className="muted">התגובה תתפרסם רק אחרי אישור של אבי.</p>
      </form>
    </section>
  );
}
