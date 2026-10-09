import type { Metadata } from "next";
import Link from "next/link";
import Room from "@/components/Room";

export const metadata: Metadata = { title: "Club Adams" };

const walls = [
  { href: "/listen", index: "02", label: "The Sound", note: "Music, straight from the booth", accent: "var(--cyan)" },
  { href: "/listen#watch", index: "03", label: "The Screen", note: "Videos and visuals", accent: "var(--pink)" },
  { href: "/creatives", index: "05", label: "The Wall", note: "Creatives on display", accent: "var(--violet)" },
  { href: "/merch", index: "04", label: "The Rack", note: "Wear the universe", accent: "var(--amber)" },
];

export default function ClubPage() {
  return (
    <Room
      index="01"
      title="Club Adams"
      lead="You made it inside. Four walls, four ways deeper into the city."
      accent="var(--pink)"
    >
      <div className="grid-2">
        {walls.map((w) => (
          <Link key={w.label} href={w.href} className="wall-card" style={{ ["--accent" as string]: w.accent }}>
            <div className="wall-card__art" aria-hidden>
              <span className="wall-card__index">{w.index}</span>
            </div>
            <div className="wall-card__body">
              <span className="wall-card__label">{w.label}</span>
              <span className="wall-card__note">{w.note}</span>
            </div>
            <span className="wall-card__arrow" aria-hidden>→</span>
          </Link>
        ))}
      </div>
    </Room>
  );
}
