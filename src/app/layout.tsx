import type { Metadata } from "next";
import Link from "next/link";
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
          <Link href="/">הדף היומי</Link>
        </header>
        {children}
      </body>
    </html>
  );
}
