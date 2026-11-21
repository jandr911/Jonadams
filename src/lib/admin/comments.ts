import "server-only";
import type { PostComment } from "@/content/site";
import { COMMENT_COLUMNS, toComment, type CommentRow } from "@/lib/content";
import { requireAdmin } from "./session";

export async function adminComments(): Promise<PostComment[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("comments").select(COMMENT_COLUMNS).order("created_at", { ascending: false });
  if (error) throw new Error(`Supabase read of comments failed: ${error.message}`);
  return ((data ?? []) as CommentRow[]).map(toComment);
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function commentsThisWeek(): Promise<number> {
  const { supabase } = await requireAdmin();
  const since = new Date(Date.now() - WEEK_MS).toISOString();
  const { count, error } = await supabase.from("comments").select("id", { count: "exact", head: true }).gte("created_at", since);
  if (error) throw new Error(`Supabase count of comments failed: ${error.message}`);
  return count ?? 0;
}
