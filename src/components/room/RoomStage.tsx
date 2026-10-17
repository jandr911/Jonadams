import { fill } from "@/content/copy";
import { getContent } from "@/lib/content";
import type { RoomPlace } from "../city/layout";
import JoinCard from "./JoinCard";
import RoomLink from "./RoomLink";
import StageShell from "./StageShell";

export interface Plaque {
  label: string;
  note: string;
  href: string;
}

export interface RoomSign {
  eyebrow: string;
  title: string;
}

export interface RoomScene {
  art: React.ReactNode;
  phone: React.ReactNode;
  plaques: Plaque[];
  links: Plaque[];
  sign?: RoomSign;
}

function PlaqueList({ items, label, className }: { items: Plaque[]; label: string; className: string }) {
  return (
    <nav className={className} aria-label={label}>
      {items.map((p) => (
        <RoomLink key={p.href} href={p.href} className="stage__plaque">
          <span className="stage__plaque-label">{p.label}</span>
          <span className="stage__plaque-note">{p.note}</span>
        </RoomLink>
      ))}
    </nav>
  );
}

export default async function RoomStage({ destination, index, scene }: { destination: RoomPlace; index: string; scene: RoomScene }) {
  const { copy } = await getContent();
  const { JOIN, ROOM_NAV, DISTRICT_EYEBROW } = copy;
  const joinPlaque: Plaque = { label: JOIN.title, note: JOIN.plaque, href: "#join" };
  const plaques = [joinPlaque, ...scene.plaques];
  const list = [...plaques, ...scene.links.filter((l) => !plaques.some((p) => p.href === l.href))];
  const sign = scene.sign ?? { eyebrow: fill(DISTRICT_EYEBROW, { index }), title: destination.label };
  return (
    <StageShell room={destination.id}>
      <div className="stage__view">
        <div className="stage__canvas">
          {scene.art}
          <div className="stage__sign">
            <span className="eyebrow">{sign.eyebrow}</span>
            <h1 className="stage__title">{sign.title}</h1>
          </div>
          <PlaqueList items={plaques} label={ROOM_NAV.desk} className="stage__plaques" />
        </div>
        <div className="stage__grain" aria-hidden />
      </div>
      {scene.phone && <div className="stage__phone">{scene.phone}</div>}
      <PlaqueList items={list} label={ROOM_NAV.rooms} className="stage__links" />
      <JoinCard />
    </StageShell>
  );
}
