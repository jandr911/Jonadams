import type { Metadata } from "next";
import Room, { roomLinks, roomMetadata } from "@/components/Room";
import WatchScene from "@/components/room/WatchScene";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { copy } = await getContent();
  return roomMetadata(copy, "watch", copy.ROOMS.watch.description);
}

export default async function WatchPage() {
  const { copy, watch } = await getContent();
  const phone = (
    <div className="stage__list">
      {watch.map((v, i) => (
        <YouTubeEmbed key={v.uid} slot={v} index={i} pending={copy.ROOMS.watch.pending} openYoutube={copy.ROOMS.listen.openYoutube} />
      ))}
    </div>
  );
  return <Room district="watch" scene={{ art: <WatchScene videos={watch} />, phone, plaques: copy.WATCH_DESK, links: roomLinks(["club", "listen", "creatives"]) }} />;
}
