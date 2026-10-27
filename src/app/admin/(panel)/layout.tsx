import type { Metadata } from "next";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import OwnDevice from "@/components/admin/OwnDevice";
import { requireAdmin } from "@/lib/admin/session";
import { signOut } from "../actions";
import { SECTIONS } from "./sections";

export const instant = false;

export const metadata: Metadata = { title: { default: "Manage", template: "%s · Manage" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requireAdmin();
  return (
    <div className="admin">
      <OwnDevice />
      <aside className="admin__side">
        <Link href="/admin" className="admin__brand">
          <span className="admin-kicker">Adams UniverseCity</span>
          <strong>Manage the site</strong>
        </Link>
        <AdminNav items={SECTIONS} />
        <div className="admin__foot">
          <a href="/" target="_blank" rel="noreferrer" className="admin-btn admin-btn--quiet">
            Open the site
          </a>
          <form action={signOut} className="admin__signout">
            <small>{email}</small>
            <button type="submit" className="admin-btn admin-btn--quiet">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="admin__main">{children}</main>
    </div>
  );
}
