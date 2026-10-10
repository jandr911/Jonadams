import type { Metadata } from "next";
import Room, { roomMetadata } from "@/components/Room";
import { MERCH, ROOMS } from "@/content/site";

export const metadata: Metadata = roomMetadata("merch", ROOMS.merch.description);

export default function MerchPage() {
  return (
    <Room district="merch" lead={ROOMS.merch.lead}>
      <div className="grid-4">
        {MERCH.map((m, i) => (
          <article key={m.name} className="product-card">
            <div className="product-card__art" aria-hidden>
              <span>{String(i + 1).padStart(2, "0")}</span>
            </div>
            <span className="product-card__name">{m.name}</span>
            <span className="product-card__note">{m.note}</span>
            <span className="product-card__status">{ROOMS.merch.status}</span>
          </article>
        ))}
      </div>
    </Room>
  );
}
