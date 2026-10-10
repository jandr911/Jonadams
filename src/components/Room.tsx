import type { Metadata } from "next";
import { SHARE_IMAGE, SITE } from "@/content/site";
import { DESTINATIONS, destinationById } from "./city/layout";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

export function districtIndex(id: string) {
  return String(DESTINATIONS.indexOf(destinationById(id)) + 1).padStart(2, "0");
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
          <span className="eyebrow">District {index}</span>
          <h1 className="room__title">{d.label}</h1>
          <p className="room__lead">{lead}</p>
        </section>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
