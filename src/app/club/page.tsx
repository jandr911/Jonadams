import type { Metadata } from "next";
import { destinationById } from "@/components/city/layout";
import Room, { districtIndex, roomMetadata } from "@/components/Room";
import ClubScene from "@/components/room/ClubScene";
import { CLUB_DESK, CLUB_WALLS, ROOMS } from "@/content/site";

export const metadata: Metadata = roomMetadata("club", ROOMS.club.description);

const WALLS = CLUB_WALLS.map((w) => {
  const d = destinationById(w.district);
  return { district: w.district, href: d.href, accent: d.accent, index: districtIndex(w.district), label: w.label, note: w.note };
});

export default function ClubPage() {
  return <Room district="club" scene={{ art: <ClubScene walls={WALLS} />, phone: null, plaques: CLUB_DESK, links: WALLS }} />;
}
