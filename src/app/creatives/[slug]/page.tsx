import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Room, { roomLinks, roomMetadata } from "@/components/Room";
import ProfileScene, { ProfilePhone } from "@/components/room/ProfileScene";
import { CREATIVES, PROFILE } from "@/content/site";

export const instant = false;

const NO_CREATIVE = "-";

type Params = Promise<{ slug: string }>;

function creativeBySlug(slug: string) {
  return CREATIVES.find((c) => c.slug === slug);
}

export function generateStaticParams() {
  return CREATIVES.length ? CREATIVES.map((c) => ({ slug: c.slug })) : [{ slug: NO_CREATIVE }];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const creative = creativeBySlug((await params).slug);
  if (!creative) return {};
  return roomMetadata("creatives", creative.bio || PROFILE.description(creative.name, creative.craft, creative.city), creative.name);
}

export default async function CreativePage({ params }: { params: Params }) {
  const creative = creativeBySlug((await params).slug);
  if (!creative) notFound();
  return (
    <Room
      district="creatives"
      scene={{
        sign: { eyebrow: creative.craft, title: creative.name },
        art: <ProfileScene creative={creative} />,
        phone: <ProfilePhone creative={creative} />,
        plaques: [PROFILE.back],
        links: roomLinks(["club", "listen", "watch"]),
      }}
    />
  );
}
