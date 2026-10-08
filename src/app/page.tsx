import Link from "next/link";
import City from "@/components/City";

const hudBoxes = [
  { href: "/listen", title: "JOIN ADAMS' LIST", sub: "FROM JONATHAN" },
  { href: "/listen", title: "THE NEW SINGLE", sub: "CLICK HERE TO LISTEN" },
  { href: "/creatives", title: "GET FEATURED", sub: "SUBMIT YOUR WORK AND JOIN THE CITY" },
];

export default function Home() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#05050f]">
      <header className="flex items-end justify-end border-b border-[#1c3a4a] px-5 pb-2 pt-3">
        <Link href="/listen" className="group text-right">
          <span className="sign block text-xl tracking-[3px] text-[#e8352b] transition-colors group-hover:text-[#ff6b5e] md:text-2xl">
            JOIN THE LIST
          </span>
          <span className="sign block text-[9px] tracking-[2px] text-[#e8352b]/80">
            GET EARLY DROPS, EXCLUSIVE VIDEOS, AND MORE!
          </span>
        </Link>
      </header>

      <div className="border-b border-[#1c3a4a] bg-[#0a1420] px-5 py-1.5">
        <span className="sign text-sm tracking-[2px] text-[#ff4fa3]">
          AdamsUniverseCity.com
        </span>
      </div>

      <main className="relative min-h-0 flex-1 border-x-4 border-[#0a1420]">
        <City />

        <nav
          aria-label="Site sections"
          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-center gap-3 px-4 pb-3 sm:justify-start sm:pl-10"
        >
          {hudBoxes.map((b) => (
            <Link
              key={b.title}
              href={b.href}
              className="pointer-events-auto block border-2 border-[#2a6a8a] bg-[#0a1420]/90 px-4 py-2 text-center transition-colors [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)] hover:border-cyan focus-visible:border-cyan"
            >
              <span className="sign block text-[11px] tracking-[2px] text-paper">
                {b.title}
              </span>
              <span className="sign mt-0.5 block text-[8px] tracking-[1px] text-muted">
                {b.sub}
              </span>
            </Link>
          ))}
        </nav>
      </main>

      <footer className="border-t border-[#1c3a4a] px-5 py-1.5 text-center">
        <span className="text-[10px] tracking-wide text-muted">
          Jonathan Adams. All rights reserved.
        </span>
      </footer>
    </div>
  );
}
