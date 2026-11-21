import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { applyCopy, type SiteCopy } from "@/content/copy";
import { MERCH_KINDS, type Creative, type MerchItem, type MerchKind, type MerchSize, type Post, type PostBlock, type PostComment, type SiteLink, type VideoKind, type VideoSlot } from "@/content/site";
import { publicSupabase } from "./supabase/public";

export const CONTENT_TAG = "content";
export const COMMENTS_TAG = "comments";

export function commentsTag(postId: string) {
  return `comments:${postId}`;
}

export interface LinkRow extends SiteLink {
  id: string;
}

export interface SiteContent {
  copy: SiteCopy;
  listen: VideoSlot[];
  watch: VideoSlot[];
  creatives: Creative[];
  merch: MerchItem[];
  posts: Post[];
  links: LinkRow[];
}

interface VideoRow {
  id: string;
  room: "listen" | "watch";
  title: string;
  youtube_id: string;
  kind: VideoKind;
}

interface CreativeRow {
  id: string;
  slug: string;
  name: string;
  craft: string;
  city: string;
  bio: string;
  photo: string;
  youtube: string;
  links: unknown;
}

interface MerchRow {
  id: string;
  name: string;
  kind: string;
  price: string;
  note: string;
  photo: string;
  sizes: unknown;
}

export interface PostRow {
  id: string;
  slug: string;
  title: string;
  published_on: string;
  published: boolean;
  summary: string;
  cover: string;
  blocks: unknown;
}

export const POST_COLUMNS = "id, slug, title, published_on, published, summary, cover, blocks";

function fail(table: string, message: string): never {
  throw new Error(`Supabase read of ${table} failed: ${message}`);
}

function toSlot(row: VideoRow): VideoSlot {
  return { uid: row.id, id: row.youtube_id, title: row.title, kind: row.kind };
}

function toLinks(value: unknown): SiteLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const { label, href } = item as Record<string, unknown>;
    return typeof label === "string" && typeof href === "string" ? [{ label, href }] : [];
  });
}

function toCreative(row: CreativeRow): Creative {
  return { ...row, links: toLinks(row.links) };
}

function toSizes(value: unknown): MerchSize[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const { size, soldOut } = item as Record<string, unknown>;
    return typeof size === "string" ? [{ size, soldOut: soldOut === true }] : [];
  });
}

function toMerch(row: MerchRow): MerchItem {
  const kind = (MERCH_KINDS as string[]).includes(row.kind) ? (row.kind as MerchKind) : "other";
  return { ...row, kind, sizes: toSizes(row.sizes) };
}

function field(item: Record<string, unknown>, name: string): string {
  const value = item[name];
  return typeof value === "string" ? value : "";
}

function toBlocks(value: unknown): PostBlock[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): PostBlock[] => {
    if (typeof item !== "object" || item === null) return [];
    const block = item as Record<string, unknown>;
    switch (block.kind) {
      case "heading":
      case "text":
        return [{ kind: block.kind, text: field(block, "text") }];
      case "photo":
        return [{ kind: "photo", src: field(block, "src"), caption: field(block, "caption") }];
      case "video":
        return [{ kind: "video", youtube: field(block, "youtube"), caption: field(block, "caption") }];
      default:
        return [];
    }
  });
}

export function toPost(row: PostRow): Post {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    date: row.published_on,
    published: row.published,
    summary: row.summary,
    cover: row.cover,
    blocks: toBlocks(row.blocks),
  };
}

export async function getContent(): Promise<SiteContent> {
  "use cache";
  cacheLife("days");
  cacheTag(CONTENT_TAG);
  const db = publicSupabase();
  const [copy, videos, creatives, merch, posts, links] = await Promise.all([
    db.from("site_copy").select("key, value"),
    db.from("videos").select("id, room, title, youtube_id, kind").order("position").order("id"),
    db.from("creatives").select("id, slug, name, craft, city, bio, photo, youtube, links").order("position").order("id"),
    db.from("merch").select("id, name, kind, price, note, photo, sizes").order("position").order("id"),
    db.from("posts").select(POST_COLUMNS).eq("published", true).order("published_on", { ascending: false }).order("created_at", { ascending: false }),
    db.from("links").select("id, label, href").order("position").order("id"),
  ]);
  if (copy.error) fail("site_copy", copy.error.message);
  if (videos.error) fail("videos", videos.error.message);
  if (creatives.error) fail("creatives", creatives.error.message);
  if (merch.error) fail("merch", merch.error.message);
  if (posts.error) fail("posts", posts.error.message);
  if (links.error) fail("links", links.error.message);
  const rows = (videos.data ?? []) as VideoRow[];
  return {
    copy: applyCopy(copy.data ?? []),
    listen: rows.filter((r) => r.room === "listen").map(toSlot),
    watch: rows.filter((r) => r.room === "watch").map(toSlot),
    creatives: ((creatives.data ?? []) as CreativeRow[]).map(toCreative),
    merch: ((merch.data ?? []) as MerchRow[]).map(toMerch),
    posts: ((posts.data ?? []) as PostRow[]).map(toPost),
    links: (links.data ?? []) as LinkRow[],
  };
}

export interface CommentRow {
  id: string;
  post_id: string;
  name: string;
  body: string;
  created_at: string;
}

export const COMMENT_COLUMNS = "id, post_id, name, body, created_at";

export function toComment(row: CommentRow): PostComment {
  return { id: row.id, postId: row.post_id, name: row.name, body: row.body, createdAt: row.created_at };
}

export async function getComments(postId: string): Promise<PostComment[]> {
  "use cache";
  cacheLife("days");
  cacheTag(COMMENTS_TAG, commentsTag(postId));
  const { data, error } = await publicSupabase().from("comments").select(COMMENT_COLUMNS).eq("post_id", postId).order("created_at");
  if (error) fail("comments", error.message);
  return ((data ?? []) as CommentRow[]).map(toComment);
}
