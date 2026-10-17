import {
  ALTER_EGO,
  CITY_FALLBACK,
  CITY_HUD,
  CLUB_DESK,
  CLUB_WALLS,
  CONTACT,
  CREATIVES_DESK,
  DESCRIPTION,
  DISTRICT_EYEBROW,
  GET_LISTED,
  HEADER,
  JOIN,
  LISTEN_DESK,
  LOADER,
  MERCH,
  MERCH_DESK,
  MUSIC,
  PROFILE,
  ROOMS,
  ROOM_NAV,
  SITE,
  TAGLINE,
  WATCH_DESK,
} from "./site";

export const DEFAULT_COPY = {
  SITE,
  MUSIC,
  TAGLINE,
  DESCRIPTION,
  HEADER,
  LOADER,
  CITY_HUD,
  CITY_FALLBACK,
  ALTER_EGO,
  ROOMS,
  ROOM_NAV,
  DISTRICT_EYEBROW,
  CLUB_WALLS,
  CLUB_DESK,
  LISTEN_DESK,
  WATCH_DESK,
  CREATIVES_DESK,
  MERCH_DESK,
  JOIN,
  CONTACT,
  GET_LISTED,
  PROFILE,
  MERCH,
};

export type SiteCopy = typeof DEFAULT_COPY;
export type CopySection = keyof SiteCopy;

export const COPY_SECTIONS: Record<CopySection, string> = {
  SITE: "Site identity and contact",
  MUSIC: "Site music",
  TAGLINE: "Tagline",
  DESCRIPTION: "Search and share description",
  HEADER: "Header and menu",
  LOADER: "Loading screen",
  CITY_HUD: "City controls and hints",
  CITY_FALLBACK: "City fallback notice",
  ALTER_EGO: "Alter ego",
  ROOMS: "Rooms",
  ROOM_NAV: "Room navigation",
  DISTRICT_EYEBROW: "District sign",
  CLUB_WALLS: "Club walls",
  CLUB_DESK: "Club front desk",
  LISTEN_DESK: "Listen front desk",
  WATCH_DESK: "Watch front desk",
  CREATIVES_DESK: "Creatives front desk",
  JOIN: "Join the list",
  CONTACT: "Contact labels",
  GET_LISTED: "Get on the wall",
  PROFILE: "Creative profile",
  MERCH: "Merch",
  MERCH_DESK: "Merch front desk",
};

export const COPY_SECTION_KEYS = Object.keys(COPY_SECTIONS) as CopySection[];

export interface CopyRow {
  key: string;
  value: string;
}

export interface CopyField extends CopyRow {
  label: string;
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const LOCKED_LEAF = /(^|\.)(district|[a-z]*href)$/i;

function walk(node: unknown, path: string, visit: (path: string, value: string) => void) {
  if (typeof node === "string") {
    if (!LOCKED_LEAF.test(path)) visit(path, node);
    return;
  }
  if (!isRecord(node)) return;
  for (const [key, child] of Object.entries(node)) {
    walk(child, path ? `${path}.${key}` : key, visit);
  }
}

function humanize(path: string): string {
  return path
    .split(".")
    .slice(1)
    .map((part) => part.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase())
    .join(" · ");
}

export function copyFields(copy: SiteCopy, section: CopySection): CopyField[] {
  const fields: CopyField[] = [];
  walk(copy[section], section, (key, value) => fields.push({ key, value, label: humanize(key) || COPY_SECTIONS[section] }));
  return fields;
}

const COPY_KEYS = new Set<string>();
walk(DEFAULT_COPY, "", (path) => COPY_KEYS.add(path));

export function isCopyKey(key: string): boolean {
  return COPY_KEYS.has(key);
}

export function applyCopy(rows: CopyRow[]): SiteCopy {
  const copy = structuredClone(DEFAULT_COPY);
  for (const { key, value } of rows) {
    if (!isCopyKey(key)) continue;
    const parts = key.split(".");
    const leaf = parts.pop();
    let node: unknown = copy;
    for (const part of parts) node = isRecord(node) ? node[part] : undefined;
    if (leaf && isRecord(node) && typeof node[leaf] === "string") node[leaf] = value;
  }
  return copy;
}
