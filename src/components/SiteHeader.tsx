import Link from "next/link";
import { SITE } from "@/content/site";
import Wordmark from "./Wordmark";

const NAV = [
  { href: "/club", label: "Club" },
  { href: "/listen", label: "Listen" },
  { href: "/listen#watch", label: "Watch" },
  { href: "/merch", label: "Merch" },
  { href: "/creatives", label: "Creatives" },
];

export default function SiteHeader({ back = false }: { back?: boolean }) {
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
      {back ? (
        <Link href="/" className="btn-outline">
          Back to the city
        </Link>
      ) : (
        <Link href={SITE.joinHref} className="btn-outline">
          Join the list
        </Link>
      )}
    </header>
  );
}
