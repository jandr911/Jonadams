import type { Metadata } from "next";
import Room, { roomMetadata } from "@/components/Room";
import { CREATIVE_SLOTS, ROOMS, SITE } from "@/content/site";

export const metadata: Metadata = roomMetadata("creatives", ROOMS.creatives.description);

export default function CreativesPage() {
  return (
    <Room district="creatives" lead={ROOMS.creatives.lead}>
      <div className="grid-3">
        {CREATIVE_SLOTS.map((s, i) => (
          <article key={s.name} className="creative-card">
            <div className="creative-card__art" aria-hidden>
              <span>{String(i + 1).padStart(2, "0")}</span>
            </div>
            <span className="eyebrow">{s.craft}</span>
            <span className="creative-card__name">{s.name}</span>
          </article>
        ))}
      </div>
      <section className="cta-panel">
        <span className="eyebrow">Want on the wall?</span>
        <p className="cta-panel__text">{SITE.submitEmail ? ROOMS.creatives.pitch : ROOMS.creatives.pitchEmpty}</p>
        {SITE.submitEmail ? (
          <a className="btn-solid" href={`mailto:${SITE.submitEmail}?subject=Feature%20me%20on%20The%20Creatives`}>
            Email your work
          </a>
        ) : (
          <span className="cta-panel__soon">{ROOMS.creatives.soon}</span>
        )}
      </section>
    </Room>
  );
}
