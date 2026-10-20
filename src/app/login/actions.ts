"use server";

import { redirect } from "next/navigation";
import { sessionClient } from "@/lib/supabase-server";

export async function signIn(_prev: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return "יש למלא אימייל וסיסמה.";
  const supabase = await sessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return "האימייל או הסיסמה שגויים.";
  redirect("/admin");
}

export async function signOut() {
  const supabase = await sessionClient();
  await supabase.auth.signOut();
  redirect("/login");
}
