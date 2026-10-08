import type { Metadata } from "next";
import Link from "next/link";
import Room from "@/components/Room";

export const metadata: Metadata = { title: "Club Adams" };

const walls = [
  { href: "/listen", label: "THE SOUND", note: "Music, straight from the booth", tint: "from-[#123a44] to-cyan" },
  { href: "/listen#watch", label: "THE SCREEN", note: "Videos and visuals", tint: "from-[#3b1360] to-pink" },
  { href: "/creatives", label: "THE WALL", note: "Creatives on display", tint: "from-[#241145] to-violet" },
  { href: "/merch", label: "THE RACK", note: "Wear the universe", tint: "from-[#4a2c08] to-amber" },
];

export default function ClubPage() {
  return (
    <Room
      title="CLUB ADAMS"
      lead="You made it inside. Pick a wall and see where it takes you."
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {walls.map((w) => (
          <Link
            key={w.label}
            href={w.href}
            className="block rounded-xl border-2 border-[#3a3a58] bg-panel p-4 transition-colors hover:border-pink focus-visible:border-pink"
          >
            <div
              className={`mb-3 h-32 rounded-lg bg-gradient-to-br ${w.tint} blur-[1.5px] saturate-125`}
              aria-hidden
            />
            <strong className="sign tracking-[2px]">{w.label}</strong>
            <span className="mt-1 block text-sm text-muted">{w.note}</span>
          </Link>
        ))}
      </div>
    </Room>
  );
}
