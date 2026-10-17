import Image from "next/image";
import { fill, type SiteCopy } from "@/content/copy";
import type { MerchItem, MerchKind } from "@/content/site";
import MerchOrder from "./MerchOrder";

const REMOTE = /^https?:/;

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const GARMENTS: Record<MerchKind, string> = {
  tee: "M18 8 L7 14 L10 21 L15 19 V41 H33 V19 L38 21 L41 14 L30 8 Q24 13 18 8 Z",
  hoodie: "M18 9 L8 16 L6 40 H12 L14 24 V42 H34 V24 L36 40 H42 L40 16 L30 9 Q24 3 18 9 Z M18 9 Q24 19 30 9 M22 14 V20 M26 14 V20 M18 34 H30",
  joggers: "M15 6 H33 L35 42 H27 L24 18 L21 42 H13 Z M15 10 H33 M13.3 38 H21.4 M26.6 38 H34.7",
  other: "M10 12 H28 L39 24 L28 36 H10 Z M15 24 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0",
};

export function MerchGlyph({ kind, className }: { kind: MerchKind; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <path d={GARMENTS[kind]} {...STROKE} />
    </svg>
  );
}

interface MerchCardProps {
  item: MerchItem;
  index: string;
  copy: SiteCopy;
  sizes: string;
  className: string;
}

export default function MerchCard({ item, index, copy, sizes, className }: MerchCardProps) {
  const { MERCH } = copy;
  const kind = MERCH.kinds[item.kind];
  return (
    <article className={`merch-card ${className}`}>
      <div className="merch-card__photo">
        {item.photo ? (
          <Image src={item.photo} alt={fill(MERCH.photo, { item: item.name, kind })} fill sizes={sizes} unoptimized={REMOTE.test(item.photo)} />
        ) : (
          <MerchGlyph kind={item.kind} className="merch-card__glyph" />
        )}
      </div>
      <div className="merch-card__meta">
        <span className="merch-card__index">{index}</span>
        <span className="merch-card__kind">{[kind, item.price].filter(Boolean).join(" · ")}</span>
        <h2 className="merch-card__name">{item.name}</h2>
        {item.note && <p className="merch-card__note">{item.note}</p>}
        <MerchOrder item={item} />
      </div>
    </article>
  );
}

export function MerchSoon({ copy, className }: { copy: SiteCopy; className: string }) {
  const { MERCH } = copy;
  return (
    <div className={`merch-soon ${className}`}>
      <div className="merch-soon__rack" aria-hidden>
        <MerchGlyph kind="tee" />
        <MerchGlyph kind="hoodie" />
        <MerchGlyph kind="joggers" />
      </div>
      <h2 className="merch-soon__title">{MERCH.soon}</h2>
      <p className="merch-soon__note">{MERCH.soonNote}</p>
      <a href="#join" className="merch-order__link">
        {MERCH.join}
      </a>
    </div>
  );
}
