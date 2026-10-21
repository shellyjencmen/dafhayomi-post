import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page state">
      <h1 className="post-title">הפוסט לא נמצא</h1>
      <p>ייתכן שהכתובת שגויה או שהפוסט עדיין לא פורסם.</p>
      <div className="state-actions">
        <Link className="button-link" href="/">לעמוד הבית</Link>
        <Link className="button-link outline" href="/archive">לארכיון</Link>
      </div>
    </main>
  );
}
