import { NavLink } from "@/app/NavLink";
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
        <NavLink href="/admin" exact>ניהול</NavLink>
        <NavLink href="/admin/posts">פוסטים</NavLink>
        <NavLink href="/admin/comments">תגובות</NavLink>
        <NavLink href="/admin/reports">דוח שימוש</NavLink>
        <form action={signOut}>
          <button type="submit">יציאה</button>
        </form>
      </header>
      {children}
    </>
  );
}
