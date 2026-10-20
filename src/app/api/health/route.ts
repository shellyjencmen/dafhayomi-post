import { missingEnv, publicClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const missing = missingEnv();
  if (missing.length > 0) {
    return Response.json({ ok: false, missingEnv: missing }, { status: 503 });
  }
  const { error } = await publicClient().from("masechtot").select("id").limit(1);
  if (error) {
    return Response.json({ ok: false, db: false, error: error.message }, { status: 503 });
  }
  return Response.json({ ok: true, db: true, time: new Date().toISOString() });
}
