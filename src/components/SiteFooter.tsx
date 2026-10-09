import { SITE } from "@/content/site";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>
        © {SITE.year} {SITE.artist}
      </span>
      <span className="site-footer__dot" aria-hidden />
      <span>{SITE.city}</span>
    </footer>
  );
}
