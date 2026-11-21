import "server-only";
import type { Post } from "@/content/site";
import { POST_COLUMNS, toPost, type PostRow } from "@/lib/content";
import { requireAdmin } from "./session";

export async function adminPosts(): Promise<Post[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("posts").select(POST_COLUMNS).order("published_on", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw new Error(`Supabase read of posts failed: ${error.message}`);
  return ((data ?? []) as PostRow[]).map(toPost);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function adminPost(id: string): Promise<Post | undefined> {
  if (!UUID.test(id)) return undefined;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("posts").select(POST_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Supabase read of posts failed: ${error.message}`);
  return data ? toPost(data as PostRow) : undefined;
}
