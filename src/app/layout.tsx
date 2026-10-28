import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { NavLink } from "./NavLink";
import "./globals.css";

const DESCRIPTION = "רעיון אחד מהדף היומי, מדי שבוע";

// Link previews (WhatsApp and others) need absolute URLs, so the base is the host that served the page.
export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("x-forwarded-host") ?? (await headers()).get("host");
  return {
    metadataBase: host ? new URL(`https://${host}`) : undefined,
    title: "הדף היומי",
    description: DESCRIPTION,
    openGraph: {
      type: "website",
      locale: "he_IL",
      siteName: "הדף היומי",
      title: "הדף היומי",
      description: DESCRIPTION,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "הדף היומי" }],
    },
    twitter: { card: "summary_large_image" },
  };
}

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
