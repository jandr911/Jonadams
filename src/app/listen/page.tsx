import type { Metadata } from "next";
import Room from "@/components/Room";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { VIDEOS, VISUALS } from "@/content/site";

export const metadata: Metadata = { title: "Listen" };

export default function ListenPage() {
  return (
    <Room
      index="02"
      title="Listen"
      lead="Press play right here. Every play on this page counts on the channel."
      accent="#ffb02e"
    >
      <div className="grid-2">
        {VIDEOS.map((v, i) => (
          <YouTubeEmbed key={v.title} slot={v} index={i} />
        ))}
      </div>

      <section id="watch" className="room__section">
        <span className="eyebrow">District 03</span>
        <h2 className="room__subtitle">Watch</h2>
        <p className="room__lead">Visuals, behind the scenes, and everything in motion.</p>
        <div className="grid-2">
          {VISUALS.map((v, i) => (
            <YouTubeEmbed key={v.title} slot={v} index={i} />
          ))}
        </div>
      </section>
    </Room>
  );
}
