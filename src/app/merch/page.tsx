import type { Metadata } from "next";
import Room from "@/components/Room";
import { MERCH } from "@/content/site";

export const metadata: Metadata = { title: "Merch" };

export default function MerchPage() {
  return (
    <Room
      index="04"
      title="Merch"
      lead="The rack is being stocked. Drop 01 arrives with the next single."
      accent="#49d2f2"
    >
      <div className="grid-4">
        {MERCH.map((m, i) => (
          <article key={m.name} className="product-card">
            <div className="product-card__art" aria-hidden>
              <span>{String(i + 1).padStart(2, "0")}</span>
            </div>
            <span className="product-card__name">{m.name}</span>
            <span className="product-card__note">{m.note}</span>
            <span className="product-card__status">Coming soon</span>
          </article>
        ))}
      </div>
    </Room>
  );
}
