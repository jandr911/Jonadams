"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { updateTag } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import type { FormState } from "@/components/admin/ActionForm";
import { youtubeIdFrom } from "@/components/youtube";
import { DEFAULT_COPY, isCopyKey, type CopySection } from "@/content/copy";
import { MERCH_KINDS, MERCH_SIZES, VIDEO_KINDS, type MerchKind, type MerchSize, type PostBlock, type VideoKind } from "@/content/site";
import { requireAdmin } from "@/lib/admin/session";
import { CONTENT_TAG } from "@/lib/content";
import { MEDIA_BUCKET } from "@/lib/supabase/env";
import { storedPath } from "@/lib/supabase/media";
import { sessionSupabase } from "@/lib/supabase/server";

const SAVED: FormState = { ok: true, message: "Saved. The site is updated." };

class FormError extends Error {}

async function run(work: (db: SupabaseClient) => Promise<void>, done: FormState = SAVED): Promise<FormState> {
  try {
    const { supabase } = await requireAdmin();
    await work(supabase);
    updateTag(CONTENT_TAG);
    return done;
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof FormError) return { ok: false, message: error.message };
    throw error;
  }
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function must(formData: FormData, name: string, label: string): string {
  const value = text(formData, name);
  if (!value) throw new FormError(`Please fill in ${label}.`);
  return value;
}

function check(error: { message: string } | null) {
  if (error) throw new FormError(`Could not save: ${error.message}`);
}

function youtubeId(input: string): string {
  if (!input.trim()) return "";
  const id = youtubeIdFrom(input);
  if (id) return id;
  throw new FormError("That does not look like a YouTube link. Paste the link from the YouTube share button.");
}

function videoKind(value: string): VideoKind {
  return (VIDEO_KINDS as string[]).includes(value) ? (value as VideoKind) : "video";
}

function room(value: string): "listen" | "watch" {
  if (value === "listen" || value === "watch") return value;
  throw new FormError("Unknown room.");
}

async function dropStored(db: SupabaseClient, previous: string, next: string) {
  const path = storedPath(previous);
  if (!path || previous === next) return;
  const { error } = await db.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) throw new FormError(`Could not remove the old file: ${error.message}`);
}

function slugify(name: string, fallback: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || fallback;
}

async function uniqueSlug(db: SupabaseClient, table: "creatives" | "posts", name: string): Promise<string> {
  const base = slugify(name, table === "posts" ? "post" : "creative");
  const { data, error } = await db.from(table).select("slug").like("slug", `${base}%`);
  check(error);
  const taken = new Set((data ?? []).map((r) => r.slug as string));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

async function nextPosition(db: SupabaseClient, table: string, filter?: { column: string; value: string }): Promise<number> {
  let query = db.from(table).select("position").order("position", { ascending: false }).limit(1);
  if (filter) query = query.eq(filter.column, filter.value);
  const { data, error } = await query;
  check(error);
  return (data?.[0]?.position ?? -1) + 1;
}

async function move(db: SupabaseClient, table: string, id: string, direction: string, filter?: { column: string; value: string }) {
  let query = db.from(table).select("id, position").order("position").order("id");
  if (filter) query = query.eq(filter.column, filter.value);
  const { data, error } = await query;
  check(error);
  const rows = (data ?? []) as { id: string; position: number }[];
  const index = rows.findIndex((r) => r.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= rows.length) return;
  const a = rows[index];
  const b = rows[target];
  const [posA, posB] = a.position === b.position ? [target, index] : [b.position, a.position];
  check((await db.from(table).update({ position: posA }).eq("id", a.id)).error);
  check((await db.from(table).update({ position: posB }).eq("id", b.id)).error);
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email");
  const password = formData.get("password");
  if (typeof password !== "string") return { ok: false, message: "Enter your email and password." };
  if (!email || !password) return { ok: false, message: "Enter your email and password." };
  const supabase = await sessionSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: "That email or password is not right." };
  redirect("/admin");
}

export async function signOut(): Promise<void> {
  const supabase = await sessionSupabase();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function saveVideo(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(async (db) => {
    const id = text(formData, "id");
    const values = {
      title: must(formData, "title", "the title"),
      youtube_id: youtubeId(text(formData, "youtube")),
      kind: videoKind(text(formData, "kind")),
    };
    if (id) check((await db.from("videos").update(values).eq("id", id)).error);
    else {
      const where = room(text(formData, "room"));
      const position = await nextPosition(db, "videos", { column: "room", value: where });
      check((await db.from("videos").insert({ ...values, room: where, position })).error);
    }
  });
}

export async function moveVideo(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(async (db) => {
    await move(db, "videos", must(formData, "id", "the video"), text(formData, "direction"), { column: "room", value: room(text(formData, "room")) });
  }, null);
}

export async function removeVideo(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(async (db) => {
    check((await db.from("videos").delete().eq("id", must(formData, "id", "the video"))).error);
  }, { ok: true, message: "Removed." });
}

export async function saveCreative(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "id");
  let created = "";
  const result = await run(async (db) => {
    const name = must(formData, "name", "the name");
    const links = [1, 2, 3, 4]
      .map((n) => ({ label: text(formData, `linkLabel${n}`), href: text(formData, `linkHref${n}`) }))
      .filter((l) => l.href)
      .map((l) => ({ label: l.label || "Website", href: l.href }));
    const values = {
      name,
      craft: text(formData, "craft"),
      city: text(formData, "city"),
      bio: text(formData, "bio"),
      youtube: text(formData, "youtube"),
      photo: text(formData, "photo"),
      links,
    };
    if (id) {
      const { data: before, error } = await db.from("creatives").select("photo").eq("id", id).single();
      check(error);
      check((await db.from("creatives").update(values).eq("id", id)).error);
      await dropStored(db, before?.photo ?? "", values.photo);
    }
    else {
      const position = await nextPosition(db, "creatives");
      const slug = await uniqueSlug(db, "creatives", name);
      const { data, error } = await db.from("creatives").insert({ ...values, slug, position }).select("id").single();
      check(error);
      created = data?.id ?? "";
    }
  });
  if (created) redirect(`/admin/creatives/${created}`);
  return result;
}

export async function moveCreative(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(async (db) => {
    await move(db, "creatives", must(formData, "id", "the creative"), text(formData, "direction"));
  }, null);
}

export async function removeCreative(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await run(async (db) => {
    const id = must(formData, "id", "the creative");
    const { data: before, error } = await db.from("creatives").select("photo").eq("id", id).single();
    check(error);
    check((await db.from("creatives").delete().eq("id", id)).error);
    await dropStored(db, before?.photo ?? "", "");
  });
  if (result?.ok) redirect("/admin/creatives");
  return result;
}

function merchKind(value: string): MerchKind {
  return (MERCH_KINDS as string[]).includes(value) ? (value as MerchKind) : "other";
}

const STARTER_SIZES: MerchSize[] = ["S", "M", "L", "XL"].map((size) => ({ size, soldOut: false }));

function merchSizes(formData: FormData): MerchSize[] {
  return MERCH_SIZES.flatMap((size) => {
    const stock = text(formData, `size${size}`);
    return stock === "in" || stock === "out" ? [{ size, soldOut: stock === "out" }] : [];
  });
}

export async function saveMerch(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "id");
  let created = "";
  const result = await run(async (db) => {
    const kind = merchKind(text(formData, "kind"));
    const values = {
      name: must(formData, "name", "the name"),
      kind,
      price: must(formData, "price", "the price"),
      note: text(formData, "note"),
      photo: text(formData, "photo"),
      sizes: id ? merchSizes(formData) : kind === "other" ? [] : STARTER_SIZES,
    };
    if (id) {
      const { data: before, error } = await db.from("merch").select("photo").eq("id", id).single();
      check(error);
      check((await db.from("merch").update(values).eq("id", id)).error);
      await dropStored(db, before?.photo ?? "", values.photo);
    } else {
      const position = await nextPosition(db, "merch");
      const { data, error } = await db.from("merch").insert({ ...values, position }).select("id").single();
      check(error);
      created = data?.id ?? "";
    }
  });
  if (created) redirect(`/admin/merch/${created}`);
  return result;
}

export async function moveMerch(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(async (db) => {
    await move(db, "merch", must(formData, "id", "the item"), text(formData, "direction"));
  }, null);
}

export async function removeMerch(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await run(async (db) => {
    const id = must(formData, "id", "the item");
    const { data: before, error } = await db.from("merch").select("photo").eq("id", id).single();
    check(error);
    check((await db.from("merch").delete().eq("id", id)).error);
    await dropStored(db, before?.photo ?? "", "");
  });
  if (result?.ok) redirect("/admin/merch");
  return result;
}

export async function saveLink(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(async (db) => {
    const id = text(formData, "id");
    const values = { label: must(formData, "label", "the name"), href: text(formData, "href") };
    if (id) check((await db.from("links").update(values).eq("id", id)).error);
    else check((await db.from("links").insert({ ...values, position: await nextPosition(db, "links") })).error);
  });
}

export async function moveLink(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(async (db) => {
    await move(db, "links", must(formData, "id", "the link"), text(formData, "direction"));
  }, null);
}

export async function removeLink(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(async (db) => {
    check((await db.from("links").delete().eq("id", must(formData, "id", "the link"))).error);
  }, { ok: true, message: "Removed." });
}

const POST_DATE = /^\d{4}-\d{2}-\d{2}$/;

function postBlocks(formData: FormData): PostBlock[] {
  let order: unknown;
  try {
    order = JSON.parse(text(formData, "blocks") || "[]");
  } catch {
    throw new FormError("The post body could not be read. Reload the page and try again.");
  }
  if (!Array.isArray(order)) throw new FormError("The post body could not be read. Reload the page and try again.");
  return order.flatMap((item, index): PostBlock[] => {
    if (typeof item !== "object" || item === null) return [];
    const { key, kind } = item as Record<string, unknown>;
    if (typeof key !== "string") return [];
    const part = (name: string) => text(formData, `${key}.${name}`);
    switch (kind) {
      case "heading":
      case "text":
        return part("text") ? [{ kind, text: part("text") }] : [];
      case "photo":
        return part("src") ? [{ kind: "photo", src: imageLink(part("src"), `the photo in block ${index + 1}`), caption: part("caption") }] : [];
      case "video":
        return part("youtube") ? [{ kind: "video", youtube: blockYoutubeId(part("youtube"), index), caption: part("caption") }] : [];
      default:
        return [];
    }
  });
}

function imageLink(value: string, label: string): string {
  if (/^(https?:\/\/|\/)/.test(value)) return value;
  throw new FormError(`The link for ${label} should start with https://. Upload the file, or paste its full web address.`);
}

function blockYoutubeId(value: string, index: number): string {
  try {
    return youtubeId(value);
  } catch (error) {
    if (error instanceof FormError) throw new FormError(`Block ${index + 1}: ${error.message}`);
    throw error;
  }
}

function postFiles(cover: string, blocks: unknown): string[] {
  const photos = Array.isArray(blocks) ? blocks.flatMap((b) => (typeof b === "object" && b !== null && typeof (b as Record<string, unknown>).src === "string" ? [(b as Record<string, string>).src] : [])) : [];
  return [cover, ...photos].filter(Boolean);
}

async function dropUnused(db: SupabaseClient, before: string[], after: string[]) {
  for (const file of before) if (!after.includes(file)) await dropStored(db, file, "");
}

export async function savePost(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "id");
  let created = "";
  const result = await run(async (db) => {
    const title = must(formData, "title", "the title");
    if (!id) {
      const slug = await uniqueSlug(db, "posts", title);
      const { data, error } = await db.from("posts").insert({ title, slug }).select("id").single();
      check(error);
      created = data?.id ?? "";
      return;
    }
    const date = text(formData, "date");
    if (!POST_DATE.test(date)) throw new FormError("Please pick the date for the post.");
    const published = text(formData, "status") === "published";
    const summary = text(formData, "summary");
    if (published && !summary) throw new FormError("Please write a short summary before publishing. Google and share previews show it under the title.");
    const values = {
      title,
      published_on: date,
      published,
      summary,
      cover: text(formData, "cover") && imageLink(text(formData, "cover"), "the cover photo"),
      blocks: postBlocks(formData),
    };
    const { data: before, error } = await db.from("posts").select("cover, blocks").eq("id", id).single();
    check(error);
    check((await db.from("posts").update(values).eq("id", id)).error);
    updateTag(CONTENT_TAG);
    await dropUnused(db, postFiles(before?.cover ?? "", before?.blocks), postFiles(values.cover, values.blocks));
  });
  if (created) redirect(`/admin/blog/${created}`);
  return result;
}

export async function removePost(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await run(async (db) => {
    const id = must(formData, "id", "the post");
    const { data: before, error } = await db.from("posts").select("cover, blocks").eq("id", id).single();
    check(error);
    check((await db.from("posts").delete().eq("id", id)).error);
    updateTag(CONTENT_TAG);
    await dropUnused(db, postFiles(before?.cover ?? "", before?.blocks), []);
  });
  if (result?.ok) redirect("/admin/blog");
  return result;
}

async function writeCopy(db: SupabaseClient, rows: { key: string; value: string }[]) {
  const toDelete = rows.filter((r) => r.value === defaultFor(r.key)).map((r) => r.key);
  const toUpsert = rows.filter((r) => r.value !== defaultFor(r.key));
  if (toDelete.length) check((await db.from("site_copy").delete().in("key", toDelete)).error);
  if (toUpsert.length) {
    const stamped = toUpsert.map((r) => ({ ...r, updated_at: new Date().toISOString() }));
    check((await db.from("site_copy").upsert(stamped)).error);
  }
}

function defaultFor(key: string): string | undefined {
  let node: unknown = DEFAULT_COPY;
  for (const part of key.split(".")) node = typeof node === "object" && node !== null ? (node as Record<string, unknown>)[part] : undefined;
  return typeof node === "string" ? node : undefined;
}

export async function saveSong(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(async (db) => {
    const src = text(formData, "src");
    const { data: before, error } = await db.from("site_copy").select("value").eq("key", "MUSIC.src").maybeSingle();
    check(error);
    await writeCopy(db, [
      { key: "MUSIC.src", value: src },
      { key: "MUSIC.title", value: text(formData, "title") },
    ]);
    if (before) await dropStored(db, before.value, src);
  });
}

export async function saveWording(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(async (db) => {
    const rows: { key: string; value: string }[] = [];
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && isCopyKey(key)) rows.push({ key, value: value.trim() });
    }
    if (!rows.length) throw new FormError("Nothing to save.");
    await writeCopy(db, rows);
  });
}

export async function resetWording(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(async (db) => {
    const section = text(formData, "section") as CopySection;
    if (!(section in DEFAULT_COPY)) throw new FormError("Unknown section.");
    check((await db.from("site_copy").delete().gte("key", `${section}.`).lt("key", `${section}/`)).error);
    check((await db.from("site_copy").delete().eq("key", section)).error);
  }, { ok: true, message: "Back to the original wording." });
}
