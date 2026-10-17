import type { Metadata } from "next";
import { fill, type SiteCopy } from "@/content/copy";
import { SHARE_IMAGE } from "@/content/site";
import { PLACES, indexLabel, placeById } from "./city/layout";
import RoomStage, { type Plaque, type RoomScene } from "./room/RoomStage";
import SiteHeader from "./SiteHeader";

export function districtIndex(id: string) {
  return indexLabel(PLACES.indexOf(placeById(id)));
}

export function roomLinks(ids: string[]): Plaque[] {
  return ids.map((id) => {
    const d = placeById(id);
    return { label: d.label, note: d.blurb, href: d.href };
  });
}

export function roomMetadata(copy: SiteCopy, district: string, description: string, title = placeById(district).label): Metadata {
  const shared = { title: `${title} · ${copy.SITE.name}`, description, images: { url: "/share-image", ...SHARE_IMAGE, alt: fill(SHARE_IMAGE.alt, { name: copy.SITE.name, artist: copy.SITE.artist }) } };
  return {
    title,
    description,
    openGraph: { type: "website", siteName: copy.SITE.name, ...shared },
    twitter: { card: "summary_large_image", ...shared },
  };
}

export default function Room({ district, scene }: { district: string; scene: RoomScene }) {
  const d = placeById(district);
  const index = districtIndex(district);
  return (
    <div className="room" style={{ ["--accent" as string]: d.accent }}>
      <SiteHeader back current={index} />
      <main className="room__stage">
        <RoomStage destination={d} index={index} scene={scene} />
      </main>
    </div>
  );
}
