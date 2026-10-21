"use server";

import { revalidatePath } from "next/cache";
import { getOwner, sessionClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

type Decision = "approved" | "rejected" | "removed";

export async function decideComment(id: string, status: Decision) {
  if (!(await getOwner())) redirect("/login");
  const supabase = await sessionClient();
  await supabase.from("comments").update({ status, decided_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/comments");
}
