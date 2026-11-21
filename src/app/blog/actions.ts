"use server";

import { updateTag } from "next/cache";
import type { FormState } from "@/components/admin/ActionForm";
import { fill } from "@/content/copy";
import { COMMENT_LIMITS } from "@/content/site";
import { commentsTag, getContent } from "@/lib/content";
import { publicSupabase } from "@/lib/supabase/public";

const MIN_FILL_MS = 2500;
const LINK = /(https?:\/\/|www\.)/i;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function postComment(_prev: FormState, formData: FormData): Promise<FormState> {
  const { copy, posts } = await getContent();
  const { COMMENTS } = copy;
  const postId = text(formData, "post");
  const name = text(formData, "name");
  const body = text(formData, "body").replace(/\r\n?/g, "\n");
  const openedAt = Number(text(formData, "opened"));

  if (!posts.some((p) => p.id === postId)) return { ok: false, message: COMMENTS.failed };
  if (text(formData, "website")) return { ok: true, message: COMMENTS.posted };
  if (!name || !body) return { ok: false, message: COMMENTS.missing };
  if (!openedAt || Date.now() - openedAt < MIN_FILL_MS) return { ok: false, message: COMMENTS.tooQuick };
  if (name.length > COMMENT_LIMITS.name) return { ok: false, message: fill(COMMENTS.nameTooLong, { max: COMMENT_LIMITS.name }) };
  if (body.length > COMMENT_LIMITS.body) return { ok: false, message: fill(COMMENTS.tooLong, { max: COMMENT_LIMITS.body }) };
  if (LINK.test(body) || LINK.test(name)) return { ok: false, message: COMMENTS.noLinks };

  const { error } = await publicSupabase().from("comments").insert({ post_id: postId, name, body });
  if (error) {
    console.error(`Saving a comment failed: ${error.message}`);
    return { ok: false, message: COMMENTS.failed };
  }
  updateTag(commentsTag(postId));
  return { ok: true, message: COMMENTS.posted };
}
