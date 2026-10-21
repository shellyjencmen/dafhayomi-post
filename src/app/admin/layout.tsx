import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { getOwner } from "@/lib/supabase-server";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const owner = await getOwner();
  if (!owner) redirect("/login");
  return (
    <>
      <header className={styles.nav}>
        <Link href="/admin">ניהול</Link>
        <Link href="/admin/posts">פוסטים</Link>
        <form action={signOut}>
          <button type="submit">יציאה</button>
        </form>
      </header>
      {children}
    </>
  );
}
