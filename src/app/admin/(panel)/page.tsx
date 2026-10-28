import Link from "next/link";
import { connection } from "next/server";
import { DEFAULT_RANGE, analyticsConfigured, totals } from "@/lib/analytics/ga";
import { getContent } from "@/lib/content";
import { SECTIONS } from "./sections";

async function visitorCount(): Promise<string> {
  await connection();
  if (!analyticsConfigured()) return "not connected";
  const { value } = await totals(DEFAULT_RANGE);
  if (!value) return "not reachable";
  return `${(value[0]?.values[0] ?? 0).toLocaleString("en-US")} in ${DEFAULT_RANGE} days`;
}

export default async function AdminHome() {
  const [{ listen, watch, creatives, merch, links }, visitors] = await Promise.all([getContent(), visitorCount()]);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const counts: Record<string, string> = {
    "/admin/videos/listen": plural(listen.length, "video", "videos"),
    "/admin/videos/watch": plural(watch.length, "video", "videos"),
    "/admin/creatives": plural(creatives.length, "person", "people"),
    "/admin/merch": plural(merch.length, "piece", "pieces"),
    "/admin/links": `${links.filter((l) => l.href).length} showing`,
    "/admin/visitors": visitors,
  };
  return (
    <>
      <header className="admin-head">
        <h1 className="admin-title">What would you like to change?</h1>
        <p className="admin-lede">Pick a part of the site. Whatever you save shows on the site straight away.</p>
      </header>
      <nav className="admin-menu" aria-label="Sections">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="admin-menu__item">
            <span className="admin-menu__label">{s.label}</span>
            <span className="admin-menu__note">{s.note}</span>
            {counts[s.href] && <span className="admin-menu__count">{counts[s.href]}</span>}
          </Link>
        ))}
      </nav>
    </>
  );
}
