import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <h1 className="post-title">הפוסט לא נמצא</h1>
      <p>ייתכן שהכתובת שגויה או שהפוסט עדיין לא פורסם.</p>
      <Link className="button-link" href="/">לעמוד הבית</Link>
    </main>
  );
}
