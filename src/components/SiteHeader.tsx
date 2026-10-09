import Link from "next/link";
import { SITE } from "@/content/site";
import SiteMenu, { type MenuLink } from "./SiteMenu";
import Wordmark from "./Wordmark";

const NAV: MenuLink[] = [
  { href: "/club", label: "Club" },
  { href: "/listen", label: "Listen" },
  { href: "/listen#watch", label: "Watch" },
  { href: "/merch", label: "Merch" },
  { href: "/creatives", label: "Creatives" },
];

export default function SiteHeader({ back = false }: { back?: boolean }) {
  const cta = back
    ? { href: "/", label: "Back to the city", short: "Back" }
    : { href: SITE.joinHref, label: "Join the list", short: "Join" };
  return (
    <header className="site-header">
      <Wordmark />
      <nav className="site-nav" aria-label="Primary">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="site-nav__link">
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="site-header__end">
        <Link href={cta.href} className="btn-outline site-header__cta">
          <span className="site-header__cta-long">{cta.label}</span>
          <span className="site-header__cta-short">{cta.short}</span>
        </Link>
        <SiteMenu links={NAV} cta={cta} />
      </div>
    </header>
  );
}
