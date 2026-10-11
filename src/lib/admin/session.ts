import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { sessionSupabase } from "@/lib/supabase/server";

export interface AdminSession {
  supabase: SupabaseClient;
  email: string;
}

export async function requireAdmin(): Promise<AdminSession> {
  const supabase = await sessionSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/admin/login");
  const { data, error } = await supabase.from("admins").select("email").eq("email", user.email).maybeSingle();
  if (error) throw new Error(`Admin lookup failed: ${error.message}`);
  if (!data) redirect("/admin/login?denied=1");
  return { supabase, email: user.email };
}
