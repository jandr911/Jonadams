import type { Metadata } from "next";
import Room from "@/components/Room";

export const metadata: Metadata = { title: "Merch" };

export default function MerchPage() {
  return (
    <Room
      title="MERCH"
      lead="The rack is being stocked. First drop coming soon."
    >
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        {["Tee", "Hoodie", "Cap", "Poster"].map((item) => (
          <div
            key={item}
            className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-[#3a3a58] bg-panel text-sm tracking-[2px] text-[#6a6a8e]"
          >
            {item}
          </div>
        ))}
      </div>
    </Room>
  );
}
