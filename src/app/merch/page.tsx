import type { Metadata } from "next";
import Room, { roomLinks, roomMetadata } from "@/components/Room";
import { indexLabel, placeById } from "@/components/city/layout";
import MerchCard, { MerchSoon } from "@/components/room/MerchCard";
import MerchScene from "@/components/room/MerchScene";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { copy } = await getContent();
  return roomMetadata(copy, "merch", copy.ROOMS.merch.description);
}

export default async function MerchPage() {
  const { copy, merch } = await getContent();
  const phone =
    merch.length > 0 ? (
      <ul className="stage__list">
        {merch.map((m, i) => (
          <li key={m.id}>
            <MerchCard item={m} index={indexLabel(i)} copy={copy} sizes="(max-width: 720px) 40vw, 0px" className="merch-card--phone" />
          </li>
        ))}
      </ul>
    ) : (
      <MerchSoon copy={copy} className="merch-soon--phone" />
    );
  return (
    <Room
      district="merch"
      scene={{
        art: <MerchScene merch={merch} />,
        phone,
        plaques: copy.MERCH_DESK,
        links: roomLinks(["club", "listen", "watch", "creatives"]),
        sign: { eyebrow: copy.MERCH.eyebrow, title: placeById("merch").label },
      }}
    />
  );
}
