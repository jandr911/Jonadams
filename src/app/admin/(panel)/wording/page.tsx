import type { Metadata } from "next";
import Link from "next/link";
import AdminHead from "@/components/admin/AdminHead";
import { COPY_SECTIONS, COPY_SECTION_KEYS, copyFields, type CopySection } from "@/content/copy";
import { getContent } from "@/lib/content";

export const metadata: Metadata = { title: "Wording" };

const COMMON: CopySection[] = ["ROOMS", "JOIN", "SITE", "LOADER", "ALTER_EGO", "GET_LISTED", "DESCRIPTION", "TAGLINE"];
const HIDDEN = new Set<CopySection>(["MUSIC"]);

export default async function WordingAdmin({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const { all } = await searchParams;
  const { copy } = await getContent();
  const rest = COPY_SECTION_KEYS.filter((s) => !COMMON.includes(s) && !HIDDEN.has(s));
  const sections = all ? [...COMMON, ...rest] : COMMON;
  return (
    <>
      <AdminHead title="Wording" lede="Pick where the words appear, then change them." />
      <nav className="admin-menu" aria-label="Wording groups">
        {sections.map((s) => (
          <Link key={s} href={`/admin/wording/${s}`} className="admin-menu__item">
            <span className="admin-menu__label">{COPY_SECTIONS[s]}</span>
            <span className="admin-menu__count">{copyFields(copy, s).length} lines</span>
          </Link>
        ))}
      </nav>
      {!all && (
        <p className="admin-note">
          <Link href="/admin/wording?all=1">Show everything else</Link> (buttons, hints and labels around the site).
        </p>
      )}
    </>
  );
}
