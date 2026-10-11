import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { EQ_BARS, SHARE_IMAGE, SITE, TAGLINE } from "@/content/site";

export const alt = SHARE_IMAGE.alt;
export const size = { width: SHARE_IMAGE.width, height: SHARE_IMAGE.height };
export const contentType = "image/png";

// ImageResponse cannot read CSS variables; these mirror --ink, --gold, --gold-2, --paper and --muted in globals.css.
const INK = "#07060f";
const GOLD = "#d6b56e";
const GOLD_2 = "#f3dfae";
const PAPER = "#f4f1ea";
const MUTED = "#9a95a8";

export default async function Image() {
  const caps = await readFile(join(process.cwd(), "public/fonts/BebasNeue-Regular.ttf"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: `radial-gradient(120% 90% at 50% 120%, ${GOLD}33, ${INK} 62%)`,
          color: PAPER,
          border: `1px solid ${GOLD}44`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          {EQ_BARS.map((h, i) => (
            <div key={i} style={{ width: 10, height: 56 * h, background: GOLD, borderRadius: 2 }} />
          ))}
          <div style={{ marginLeft: 20, fontFamily: "Bebas", fontSize: 30, letterSpacing: 8, color: GOLD }}>{SITE.city}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Bebas", fontSize: 168, letterSpacing: 10, lineHeight: 0.95, color: GOLD_2 }}>{SITE.surname}</div>
          <div style={{ fontFamily: "Bebas", fontSize: 96, letterSpacing: 18, lineHeight: 1.05, color: PAPER }}>{SITE.cityName}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Bebas", fontSize: 30, letterSpacing: 6, color: MUTED }}>
          <span>{SITE.artist}</span>
          <span>{TAGLINE}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Bebas", data: caps, style: "normal", weight: 400 }],
    },
  );
}
