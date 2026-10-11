import type { Metadata } from "next";
import { indexLabel } from "@/components/city/layout";
import Room, { roomMetadata } from "@/components/Room";
import { CREATIVE_SLOTS, ROOMS, SITE } from "@/content/site";

export const metadata: Metadata = roomMetadata("creatives", ROOMS.creatives.description);

export default function CreativesPage() {
  return (
    <Room district="creatives" lead={ROOMS.creatives.lead}>
      <div className="grid-3">
        {CREATIVE_SLOTS.map((s, i) => (
          <article key={s.name} className="panel creative-card">
            <div className="creative-card__art" aria-hidden>
              <span>{indexLabel(i)}</span>
            </div>
            <span className="eyebrow">{s.craft}</span>
            <span className="creative-card__name">{s.name}</span>
          </article>
        ))}
      </div>
      <section className="cta-panel">
        <span className="eyebrow">{ROOMS.creatives.ask}</span>
        <p className="cta-panel__text">{SITE.submitEmail ? ROOMS.creatives.pitch : ROOMS.creatives.pitchEmpty}</p>
        {SITE.submitEmail ? (
          <a className="btn-solid" href={`mailto:${SITE.submitEmail}?subject=${encodeURIComponent(ROOMS.creatives.subject)}`}>
            {ROOMS.creatives.submit}
          </a>
        ) : (
          <span className="cta-panel__soon">{ROOMS.creatives.soon}</span>
        )}
      </section>
    </Room>
  );
}
