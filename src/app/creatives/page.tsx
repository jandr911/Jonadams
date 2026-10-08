import type { Metadata } from "next";
import Room from "@/components/Room";

export const metadata: Metadata = { title: "The Creatives" };

const spots = [
  { name: "Featured musician", craft: "Music", note: "Spotlight slot: curated by Jonathan" },
  { name: "Featured builder", craft: "Tech", note: "Spotlight slot: curated by Jonathan" },
  { name: "Featured designer", craft: "Art", note: "Spotlight slot: curated by Jonathan" },
];

export default function CreativesPage() {
  return (
    <Room
      title="THE CREATIVES"
      lead="A curated wall for up-and-coming artists, builders, and makers. Want on the wall? Send your work by email and Jonathan picks the lineup."
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {spots.map((s) => (
          <article
            key={s.name}
            className="rounded-xl border-2 border-[#3a3a58] bg-panel p-4"
          >
            <div
              className="mb-3 h-28 rounded-lg bg-gradient-to-br from-[#241145] to-violet opacity-70"
              aria-hidden
            />
            <strong className="sign tracking-[2px]">{s.name}</strong>
            <span className="mt-1 block text-xs tracking-[2px] text-cyan">
              {s.craft}
            </span>
            <span className="mt-2 block text-sm text-muted">{s.note}</span>
          </article>
        ))}
      </div>
    </Room>
  );
}
