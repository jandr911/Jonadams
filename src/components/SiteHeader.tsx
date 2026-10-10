import Link from "next/link";
import { SITE } from "@/content/site";
import { DESTINATIONS } from "./city/layout";
import SiteMenu, { type MenuLink } from "./SiteMenu";
import Wordmark from "./Wordmark";

const NAV: MenuLink[] = DESTINATIONS.map((d, i) => ({
  href: d.href,
  label: d.label,
  sub: d.sub,
  accent: d.accent,
  index: String(i + 1).padStart(2, "0"),
}));

export default function SiteHeader({ back = false, current }: { back?: boolean; current?: string }) {
  const cta = back
    ? { href: "/", label: "Back to the city", short: "Back" }
    : { href: SITE.joinHref, label: "Join the list", short: "Join" };
  return (
    <header className="site-header">
      <Wordmark />
      <nav className="site-nav" aria-label="Primary">
        {NAV.map((n) =>
          SITE.navLocked ? (
            <span key={n.href} className="site-nav__link" style={{ ["--c" as string]: n.accent }} aria-disabled>
              <span className="site-nav__index">{n.index}</span>
              <span className="site-nav__name">{n.label}</span>
              <span className="site-nav__sub">{n.sub}</span>
            </span>
          ) : (
            <Link
              key={n.href}
              href={n.href}
              className="site-nav__link"
              style={{ ["--c" as string]: n.accent }}
              aria-current={n.index === current ? "page" : undefined}
            >
              <span className="site-nav__index">{n.index}</span>
              <span className="site-nav__name">{n.label}</span>
              <span className="site-nav__sub">{n.sub}</span>
            </Link>
          ),
        )}
      </nav>
      {(back || !SITE.navLocked) && (
        <div className="site-header__end">
          <Link href={cta.href} className="btn-outline site-header__cta">
            <span className="site-header__cta-long">{cta.label}</span>
            <span className="site-header__cta-short">{cta.short}</span>
          </Link>
          {!SITE.navLocked && <SiteMenu links={NAV} cta={cta} current={current} />}
        </div>
      )}
    </header>
  );
}
