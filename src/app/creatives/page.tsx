import type { Metadata } from "next";
import Room from "@/components/Room";
import { CREATIVE_SLOTS, SITE } from "@/content/site";

export const metadata: Metadata = { title: "The Creatives" };

export default function CreativesPage() {
  return (
    <Room
      index="05"
      title="The Creatives"
      lead="A curated wall for up-and-coming artists, builders, and makers from the city and beyond. Jonathan picks the lineup."
      accent="var(--violet)"
    >
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
        <p className="cta-panel__text">
          Send your work by email. No uploads, no forms — a short note and a link is enough.
        </p>
        {SITE.submitEmail ? (
          <a className="btn-solid" href={`mailto:${SITE.submitEmail}?subject=Feature%20me%20on%20The%20Creatives`}>
            Email your work
          </a>
        ) : (
          <span className="cta-panel__soon">Submissions open soon</span>
        )}
      </section>
    </Room>
  );
}
