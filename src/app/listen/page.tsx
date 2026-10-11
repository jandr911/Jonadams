import type { Metadata } from "next";
import Room, { roomLinks, roomMetadata } from "@/components/Room";
import ListenScene from "@/components/room/ListenScene";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { LISTEN_DESK, ROOMS, VIDEOS } from "@/content/site";

export const metadata: Metadata = roomMetadata("listen", ROOMS.listen.description);

export default function ListenPage() {
  const phone = (
    <div className="stage__list">
      {VIDEOS.map((v, i) => (
        <YouTubeEmbed key={v.title} slot={v} index={i} />
      ))}
    </div>
  );
  return <Room district="listen" scene={{ art: <ListenScene />, phone, plaques: LISTEN_DESK, links: roomLinks(["club", "watch", "creatives"]) }} />;
}
