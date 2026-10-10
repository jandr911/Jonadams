import type { Metadata } from "next";
import Link from "next/link";
import { destinationById } from "@/components/city/layout";
import Room, { districtIndex, roomMetadata } from "@/components/Room";
import { CLUB_WALLS, ROOMS } from "@/content/site";

export const metadata: Metadata = roomMetadata("club", ROOMS.club.description);

export default function ClubPage() {
  return (
    <Room district="club" lead={ROOMS.club.lead}>
      <div className="grid-2">
        {CLUB_WALLS.map((w) => {
          const d = destinationById(w.district);
          return (
            <Link key={w.label} href={d.href} className="wall-card" style={{ ["--accent" as string]: d.accent }}>
              <div className="wall-card__art" aria-hidden>
                <span className="wall-card__index">{districtIndex(w.district)}</span>
              </div>
              <div className="wall-card__body">
                <span className="wall-card__label">{w.label}</span>
                <span className="wall-card__note">{w.note}</span>
              </div>
              <span className="wall-card__arrow" aria-hidden>→</span>
            </Link>
          );
        })}
      </div>
    </Room>
  );
}
