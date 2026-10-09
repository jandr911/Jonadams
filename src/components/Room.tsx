import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

export default function Room({
  index,
  title,
  lead,
  accent,
  children,
}: {
  index: string;
  title: string;
  lead: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="room" style={{ ["--accent" as string]: accent }}>
      <SiteHeader back />
      <main className="room__main">
        <section className="room__hero">
          <span className="eyebrow">
            District {index}
          </span>
          <h1 className="room__title">{title}</h1>
          <p className="room__lead">{lead}</p>
        </section>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
