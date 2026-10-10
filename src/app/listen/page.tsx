import type { Metadata } from "next";
import { destinationById } from "@/components/city/layout";
import Room, { districtIndex, roomMetadata } from "@/components/Room";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { ROOMS, VIDEOS, VISUALS } from "@/content/site";

export const metadata: Metadata = roomMetadata("listen", ROOMS.listen.description);

export default function ListenPage() {
  const live = VIDEOS.some((v) => v.id);
  return (
    <Room district="listen" lead={live ? ROOMS.listen.lead : ROOMS.listen.leadEmpty}>
      <div className="grid-2">
        {VIDEOS.map((v, i) => (
          <YouTubeEmbed key={v.title} slot={v} index={i} />
        ))}
      </div>

      <section id="watch" className="room__section">
        <span className="eyebrow">District {districtIndex("watch")}</span>
        <h2 className="room__subtitle">{destinationById("watch").label}</h2>
        <p className="room__lead">{ROOMS.watch.lead}</p>
        <div className="grid-2">
          {VISUALS.map((v, i) => (
            <YouTubeEmbed key={v.title} slot={v} index={i} />
          ))}
        </div>
      </section>
    </Room>
  );
}
