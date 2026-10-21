import type { Metadata } from "next";
import Link from "next/link";
import { NavLink } from "./NavLink";
import "./globals.css";

export const metadata: Metadata = {
  title: "הדף היומי",
  description: "רעיון אחד מהדף היומי, מדי שבוע",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <header className="site-header">
          <Link className="site-title" href="/">
            הדף היומי
          </Link>
          <div className="site-tagline">רעיון אחד על הדף, כל שבוע · אבי יוניצמן</div>
          <nav className="site-nav" aria-label="ניווט ראשי">
            <NavLink href="/" exact>
              השבוע
            </NavLink>
            <NavLink href="/archive">ארכיון</NavLink>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          אבי יוניצמן · הדף היומי · <Link href="/admin">כניסת בעלים</Link>
        </footer>
      </body>
    </html>
  );
}
