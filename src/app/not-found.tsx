import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page state">
      <h1 className="post-title">העמוד לא נמצא</h1>
      <p>הכתובת שגויה או שהעמוד הוסר.</p>
      <div className="state-actions">
        <Link className="button-link" href="/">לעמוד הבית</Link>
        <Link className="button-link outline" href="/archive">לארכיון</Link>
      </div>
    </main>
  );
}
