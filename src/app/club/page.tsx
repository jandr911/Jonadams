import type { Metadata } from "next";
import { destinationById } from "@/components/city/layout";
import Room, { districtIndex, roomMetadata } from "@/components/Room";
import ClubScene from "@/components/room/ClubScene";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { copy } = await getContent();
  return roomMetadata(copy, "club", copy.ROOMS.club.description);
}

export default async function ClubPage() {
  const { copy } = await getContent();
  const walls = copy.CLUB_WALLS.map((w) => {
    const d = destinationById(w.district);
    return { district: w.district, href: d.href, accent: d.accent, index: districtIndex(w.district), label: w.label, note: w.note };
  });
  return <Room district="club" scene={{ art: <ClubScene walls={walls} />, phone: null, plaques: copy.CLUB_DESK, links: walls }} />;
}
