import type { Metadata } from "next";
import { SHARE_IMAGE, SITE, districtEyebrow } from "@/content/site";
import { DESTINATIONS, destinationById, indexLabel } from "./city/layout";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

export function districtIndex(id: string) {
  return indexLabel(DESTINATIONS.indexOf(destinationById(id)));
}

export function roomMetadata(district: string, description: string): Metadata {
  const title = destinationById(district).label;
  const shared = { title: `${title} · ${SITE.name}`, description, images: { url: "/opengraph-image", ...SHARE_IMAGE } };
  return {
    title,
    description,
    openGraph: { type: "website", siteName: SITE.name, ...shared },
    twitter: { card: "summary_large_image", ...shared },
  };
}

export default function Room({ district, lead, children }: { district: string; lead: string; children: React.ReactNode }) {
  const d = destinationById(district);
  const index = districtIndex(district);
  return (
    <div className="room" style={{ ["--accent" as string]: d.accent }}>
      <SiteHeader back current={index} />
      <main className="room__main">
        <section className="room__hero">
          <span className="eyebrow">{districtEyebrow(index)}</span>
          <h1 className="room__title">{d.label}</h1>
          <p className="room__lead">{lead}</p>
        </section>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
