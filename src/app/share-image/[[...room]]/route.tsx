import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { ImageResponse } from "next/og";
import { PLACES, indexLabel, isDestination } from "@/components/city/layout";
import { fill } from "@/content/copy";
import { EQ_BARS, SHARE_IMAGE } from "@/content/site";
import { CONTENT_TAG, getContent } from "@/lib/content";

// ImageResponse cannot read CSS variables; these mirror --ink, --gold, --gold-2, --paper, --muted and the neon set in globals.css.
const INK = "#07060f";
const GOLD = "#d6b56e";
const GOLD_2 = "#f3dfae";
const PAPER = "#f4f1ea";
const MUTED = "#9a95a8";
const ACCENTS: Record<string, string> = {
  "var(--gold)": GOLD,
  "var(--pink)": "#ff4fa3",
  "var(--amber)": "#ffb02e",
  "var(--cyan)": "#49f2d6",
  "var(--violet)": "#c9a6ff",
};

type Params = { room?: string[] };

export function generateStaticParams(): Params[] {
  return [{ room: [] }, ...PLACES.map((place) => ({ room: [place.id] }))];
}

async function renderCard(roomId: string | undefined): Promise<ArrayBuffer> {
  "use cache";
  cacheLife("days");
  cacheTag(CONTENT_TAG);
  const { SITE, TAGLINE, DISTRICT_EYEBROW } = (await getContent()).copy;
  const place = PLACES.find((p) => p.id === roomId);
  if (place && !(place.accent in ACCENTS)) throw new Error(`No share-card colour for ${place.accent}`);
  const accent = place ? ACCENTS[place.accent] : GOLD;
  const district = place && isDestination(place) ? `${fill(DISTRICT_EYEBROW, { index: indexLabel(PLACES.indexOf(place)) })} · ` : "";
  const eyebrow = place ? `${district}${place.sub}` : SITE.city;
  const headline = place ? place.label : SITE.surname;
  const subline = place ? SITE.name : SITE.cityName;
  const caps = await readFile(join(process.cwd(), "public/fonts/BebasNeue-Regular.ttf"));
  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: `radial-gradient(120% 90% at 50% 120%, ${accent}33, ${INK} 62%)`,
          color: PAPER,
          border: `1px solid ${accent}44`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          {EQ_BARS.map((h, i) => (
            <div key={i} style={{ width: 10, height: 56 * h, background: GOLD, borderRadius: 2 }} />
          ))}
          <div style={{ marginLeft: 20, fontFamily: "Bebas", fontSize: 30, letterSpacing: 8, color: accent }}>{eyebrow}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Bebas", fontSize: 168, letterSpacing: 10, lineHeight: 0.95, color: GOLD_2 }}>{headline}</div>
          <div style={{ fontFamily: "Bebas", fontSize: place ? 60 : 96, letterSpacing: place ? 12 : 18, lineHeight: 1.05, color: PAPER }}>{subline}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Bebas", fontSize: 30, letterSpacing: 6, color: MUTED }}>
          <span>{SITE.artist}</span>
          <span>{TAGLINE}</span>
        </div>
      </div>
    ),
    {
      width: SHARE_IMAGE.width,
      height: SHARE_IMAGE.height,
      fonts: [{ name: "Bebas", data: caps, style: "normal", weight: 400 }],
    },
  );
  return image.arrayBuffer();
}

export async function GET(_request: Request, { params }: { params: Promise<Params> }) {
  const { room = [] } = await params;
  if (room.length > 1 || (room.length === 1 && !PLACES.some((place) => place.id === room[0]))) return new Response(null, { status: 404 });
  return new Response(await renderCard(room[0]), {
    headers: { "Content-Type": SHARE_IMAGE.type, "Cache-Control": "public, max-age=3600" },
  });
}
