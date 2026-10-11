"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  note: string;
}

export default function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="admin__nav" aria-label="Sections">
      {items.map((s) => {
        const current = pathname === s.href || pathname.startsWith(`${s.href}/`);
        return (
          <Link key={s.href} href={s.href} className="admin__nav-link" aria-current={current ? "page" : undefined}>
            <span>{s.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
