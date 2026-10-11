import type { Metadata } from "next";
import Room, { roomLinks, roomMetadata } from "@/components/Room";
import ListenScene from "@/components/room/ListenScene";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { copy } = await getContent();
  return roomMetadata(copy, "listen", copy.ROOMS.listen.description);
}

export default async function ListenPage() {
  const { copy, listen } = await getContent();
  const phone = (
    <div className="stage__list">
      {listen.map((v, i) => (
        <YouTubeEmbed key={v.uid} slot={v} index={i} pending={copy.ROOMS.listen.pending} openYoutube={copy.ROOMS.listen.openYoutube} />
      ))}
    </div>
  );
  return <Room district="listen" scene={{ art: <ListenScene videos={listen} />, phone, plaques: copy.LISTEN_DESK, links: roomLinks(["club", "watch", "creatives"]) }} />;
}
