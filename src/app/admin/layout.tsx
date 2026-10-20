import { redirect } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { getOwner } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const owner = await getOwner();
  if (!owner) redirect("/login");
  return (
    <>
      <header>
        <form action={signOut}>
          <button type="submit">יציאה</button>
        </form>
      </header>
      {children}
    </>
  );
}
