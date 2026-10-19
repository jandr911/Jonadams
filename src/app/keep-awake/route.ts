import { connection } from "next/server";
import { publicSupabase } from "@/lib/supabase/public";

export async function GET() {
  await connection();
  const { error } = await publicSupabase().from("links").select("id").limit(1);
  if (error) return Response.json({ awake: false, error: error.message }, { status: 503 });
  return Response.json({ awake: true });
}
