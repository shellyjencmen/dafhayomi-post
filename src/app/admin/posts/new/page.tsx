import { sessionClient } from "@/lib/supabase-server";
import { PostForm } from "../PostForm";

export const dynamic = "force-dynamic";

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await sessionClient();
  const { data: masechtot } = await supabase.from("masechtot").select("id, name").order("sort_order");
  return (
    <PostForm
      values={{ id: null, masechetId: null, daf: null, title: "", body: "", summary: "", state: "draft", slug: null }}
      masechtot={masechtot ?? []}
      error={error}
    />
  );
}
