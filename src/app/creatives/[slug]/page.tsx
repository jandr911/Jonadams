import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Room, { roomLinks, roomMetadata } from "@/components/Room";
import ProfileScene, { ProfilePhone } from "@/components/room/ProfileScene";
import { fill } from "@/content/copy";
import { getContent } from "@/lib/content";

export const instant = false;

const NO_CREATIVE = "-";

type Params = Promise<{ slug: string }>;

async function creativeBySlug(slug: string) {
  const { creatives } = await getContent();
  return creatives.find((c) => c.slug === slug);
}

export async function generateStaticParams() {
  const { creatives } = await getContent();
  return creatives.length ? creatives.map((c) => ({ slug: c.slug })) : [{ slug: NO_CREATIVE }];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const creative = await creativeBySlug((await params).slug);
  if (!creative) return {};
  const { copy } = await getContent();
  const description = creative.bio || fill(copy.PROFILE.description, { name: creative.name, craft: creative.craft.toLowerCase(), city: creative.city, site: copy.SITE.name });
  return roomMetadata(copy, "creatives", description, creative.name);
}

export default async function CreativePage({ params }: { params: Params }) {
  const creative = await creativeBySlug((await params).slug);
  if (!creative) notFound();
  const { copy } = await getContent();
  return (
    <Room
      district="creatives"
      scene={{
        sign: { eyebrow: creative.craft, title: creative.name },
        art: <ProfileScene creative={creative} />,
        phone: <ProfilePhone creative={creative} />,
        plaques: [copy.PROFILE.back],
        links: roomLinks(["club", "listen", "watch"]),
      }}
    />
  );
}
