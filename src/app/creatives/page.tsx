import type { Metadata } from "next";
import Room, { roomLinks, roomMetadata } from "@/components/Room";
import CreativesScene, { profileHref } from "@/components/room/CreativesScene";
import GetListed from "@/components/room/GetListed";
import Portrait from "@/components/room/Portrait";
import RoomLink from "@/components/room/RoomLink";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { copy } = await getContent();
  return roomMetadata(copy, "creatives", copy.ROOMS.creatives.description);
}

export default async function CreativesPage() {
  const { copy, creatives } = await getContent();
  const phone = (
    <>
      {creatives.length > 0 && (
        <ul className="stage__list">
          {creatives.map((c) => (
            <li key={c.slug}>
              <RoomLink href={profileHref(c)} className="creative-card">
                <Portrait creative={c} alt="" sizes="72px" className="creative-card__portrait" />
                <span className="creative-card__name">{c.name}</span>
                <span className="creative-card__note">
                  {c.craft} · {c.city}
                </span>
              </RoomLink>
            </li>
          ))}
        </ul>
      )}
      <GetListed className="stage__pitch" />
    </>
  );
  return (
    <Room district="creatives" scene={{ art: <CreativesScene creatives={creatives} />, phone, plaques: copy.CREATIVES_DESK, links: roomLinks(["club", "listen", "watch"]) }} />
  );
}
