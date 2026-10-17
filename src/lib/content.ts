import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { applyCopy, type SiteCopy } from "@/content/copy";
import { MERCH_KINDS, type Creative, type MerchItem, type MerchKind, type MerchSize, type SiteLink, type VideoKind, type VideoSlot } from "@/content/site";
import { publicSupabase } from "./supabase/public";

export const CONTENT_TAG = "content";

export interface LinkRow extends SiteLink {
  id: string;
}

export interface SiteContent {
  copy: SiteCopy;
  listen: VideoSlot[];
  watch: VideoSlot[];
  creatives: Creative[];
  merch: MerchItem[];
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

export async function getContent(): Promise<SiteContent> {
  "use cache";
  cacheLife("days");
  cacheTag(CONTENT_TAG);
  const db = publicSupabase();
  const [copy, videos, creatives, merch, links] = await Promise.all([
    db.from("site_copy").select("key, value"),
    db.from("videos").select("id, room, title, youtube_id, kind").order("position").order("id"),
    db.from("creatives").select("id, slug, name, craft, city, bio, photo, youtube, links").order("position").order("id"),
    db.from("merch").select("id, name, kind, price, note, photo, sizes").order("position").order("id"),
    db.from("links").select("id, label, href").order("position").order("id"),
  ]);
  if (copy.error) fail("site_copy", copy.error.message);
  if (videos.error) fail("videos", videos.error.message);
  if (creatives.error) fail("creatives", creatives.error.message);
  if (merch.error) fail("merch", merch.error.message);
  if (links.error) fail("links", links.error.message);
  const rows = (videos.data ?? []) as VideoRow[];
  return {
    copy: applyCopy(copy.data ?? []),
    listen: rows.filter((r) => r.room === "listen").map(toSlot),
    watch: rows.filter((r) => r.room === "watch").map(toSlot),
    creatives: ((creatives.data ?? []) as CreativeRow[]).map(toCreative),
    merch: ((merch.data ?? []) as MerchRow[]).map(toMerch),
    links: (links.data ?? []) as LinkRow[],
  };
}
