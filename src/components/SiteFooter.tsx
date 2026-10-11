import { FOOTER, LINKS, SITE } from "@/content/site";
import JoinList from "./JoinList";

export default function SiteFooter() {
  const links = LINKS.filter((l) => l.href);
  const contacts = [
    { label: FOOTER.booking, email: SITE.bookingEmail },
    { label: FOOTER.press, email: SITE.pressEmail },
  ].filter((c) => c.email);
  return (
    <footer className="site-footer" id="join-list">
      <div className="site-footer__meta">
        <span>
          © {SITE.year} {SITE.artist}
        </span>
        <span className="site-footer__dot" aria-hidden />
        <span>{SITE.city}</span>
        {contacts.map((c) => (
          <a key={c.label} className="site-footer__contact" href={`mailto:${c.email}`}>
            {c.label}
          </a>
        ))}
      </div>
      {links.length > 0 && (
        <nav className="site-footer__links" aria-label={FOOTER.elsewhere}>
          {links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
        </nav>
      )}
      <JoinList email={SITE.submitEmail} />
    </footer>
  );
}
