import type { Metadata } from "next";
import { SHARE_IMAGE, SITE } from "@/content/site";
import { DESTINATIONS, destinationById, indexLabel } from "./city/layout";
import RoomStage, { type Plaque, type RoomScene } from "./room/RoomStage";
import SiteHeader from "./SiteHeader";

export function districtIndex(id: string) {
  return indexLabel(DESTINATIONS.indexOf(destinationById(id)));
}

export function roomLinks(ids: string[]): Plaque[] {
  return ids.map((id) => {
    const d = destinationById(id);
    return { label: d.label, note: d.blurb, href: d.href };
  });
}

export function roomMetadata(district: string, description: string, title = destinationById(district).label): Metadata {
  const shared = { title: `${title} · ${SITE.name}`, description, images: { url: "/opengraph-image", ...SHARE_IMAGE } };
  return {
    title,
    description,
    openGraph: { type: "website", siteName: SITE.name, ...shared },
    twitter: { card: "summary_large_image", ...shared },
  };
}

export default function Room({ district, scene }: { district: string; scene: RoomScene }) {
  const d = destinationById(district);
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
