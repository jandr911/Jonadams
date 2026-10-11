import type { Metadata } from "next";
import Room, { roomLinks, roomMetadata } from "@/components/Room";
import CreativesScene, { profileHref } from "@/components/room/CreativesScene";
import GetListed from "@/components/room/GetListed";
import Portrait from "@/components/room/Portrait";
import RoomLink from "@/components/room/RoomLink";
import { CREATIVES, CREATIVES_DESK, ROOMS } from "@/content/site";

export const metadata: Metadata = roomMetadata("creatives", ROOMS.creatives.description);

export default function CreativesPage() {
  const phone = (
    <>
      {CREATIVES.length > 0 && (
        <ul className="stage__list">
          {CREATIVES.map((c) => (
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
    <Room district="creatives" scene={{ art: <CreativesScene />, phone, plaques: CREATIVES_DESK, links: roomLinks(["club", "listen", "watch"]) }} />
  );
}
