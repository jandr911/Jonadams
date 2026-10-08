import type { Metadata } from "next";
import Room from "@/components/Room";

export const metadata: Metadata = { title: "Listen" };

const slots = [
  "YouTube embed: lead single",
  "YouTube embed: latest release",
  "YouTube embed: fan favorite",
  "YouTube embed: live session",
];

export default function ListenPage() {
  return (
    <Room
      title="LISTEN"
      lead="Press play right here. Every play counts on the channel."
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {slots.map((s) => (
          <div
            key={s}
            className="grid aspect-video place-items-center rounded-xl border-2 border-dashed border-[#3a3a58] bg-panel p-3 text-center text-sm tracking-wide text-[#6a6a8e]"
          >
            {s}
          </div>
        ))}
      </div>
      <h2
        id="watch"
        className="sign mb-2 mt-12 text-xl tracking-[4px] text-cyan md:text-2xl"
      >
        WATCH
      </h2>
      <p className="mb-6 max-w-[65ch] text-muted">
        Visuals, behind-the-scenes, and everything in motion.
      </p>
      <div className="grid aspect-video max-w-2xl place-items-center rounded-xl border-2 border-dashed border-[#3a3a58] bg-panel p-3 text-center text-sm tracking-wide text-[#6a6a8e]">
        YouTube embed: video playlist
      </div>
    </Room>
  );
}
