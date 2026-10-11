import Link from "next/link";
import { HEADER, SITE } from "@/content/site";
import { DESTINATIONS, indexLabel } from "./city/layout";
import SiteMenu, { type MenuLink } from "./SiteMenu";
import Wordmark from "./Wordmark";

const NAV: MenuLink[] = DESTINATIONS.map((d, i) => ({
  href: d.href,
  label: d.label,
  sub: d.sub,
  accent: d.accent,
  index: indexLabel(i),
}));

export default function SiteHeader({ back = false, current }: { back?: boolean; current?: string }) {
  const cta = back
    ? { href: "/", label: HEADER.back, short: HEADER.backShort }
    : { href: SITE.joinHref, label: HEADER.join, short: HEADER.joinShort };
  return (
    <header className="site-header">
      <Wordmark />
      <nav className="site-nav" aria-label={HEADER.nav}>
        {NAV.map((n) => {
          const label = (
            <>
              <span className="site-nav__index">{n.index}</span>
              <span className="site-nav__name">{n.label}</span>
              <span className="site-nav__sub">{n.sub}</span>
            </>
          );
          return SITE.navLocked ? (
            <span key={n.href} className="site-nav__link" style={{ ["--c" as string]: n.accent }} aria-disabled>
              {label}
            </span>
          ) : (
            <Link
              key={n.href}
              href={n.href}
              className="site-nav__link"
              style={{ ["--c" as string]: n.accent }}
              aria-current={n.index === current ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
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
