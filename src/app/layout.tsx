import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "הדף היומי",
  description: "רעיון אחד מהדף היומי, מדי שבוע",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
