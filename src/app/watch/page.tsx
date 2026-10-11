import type { Metadata } from "next";
import Room, { roomLinks, roomMetadata } from "@/components/Room";
import WatchScene from "@/components/room/WatchScene";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { ROOMS, VISUALS, WATCH_DESK } from "@/content/site";

export const metadata: Metadata = roomMetadata("watch", ROOMS.watch.description);

export default function WatchPage() {
  const phone = (
    <div className="stage__list">
      {VISUALS.map((v, i) => (
        <YouTubeEmbed key={v.title} slot={v} index={i} />
      ))}
    </div>
  );
  return <Room district="watch" scene={{ art: <WatchScene />, phone, plaques: WATCH_DESK, links: roomLinks(["club", "listen", "creatives"]) }} />;
}
