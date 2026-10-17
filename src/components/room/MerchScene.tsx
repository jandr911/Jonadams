import type { MerchItem, MerchKind } from "@/content/site";
import { getContent } from "@/lib/content";
import { indexLabel } from "../city/layout";
import MerchCard, { MerchSoon } from "./MerchCard";
import PagedConsole, { type WallPage } from "./PagedConsole";

const HANGERS: { x: number; kind: MerchKind }[] = [
  { x: 1090, kind: "tee" },
  { x: 1200, kind: "hoodie" },
  { x: 1310, kind: "joggers" },
  { x: 1420, kind: "tee" },
];

const GARMENT_ART: Record<MerchKind, string> = {
  tee: "M-26 0 L-64 22 L-52 48 L-34 40 V140 H34 V40 L52 48 L64 22 L26 0 Q0 18 -26 0 Z",
  hoodie: "M-26 4 L-62 30 L-70 150 H-48 L-40 70 V160 H40 V70 L48 150 H70 L62 30 L26 4 Q0 -22 -26 4 Z",
  joggers: "M-38 0 H38 L44 170 H12 L0 50 L-12 170 H-44 Z",
  other: "M-40 10 H30 L60 70 L30 130 H-40 Z",
};

const CRATES = [
  { x: 1060, y: 820 },
  { x: 1160, y: 820 },
  { x: 1110, y: 760 },
];

const SLATS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export default async function MerchScene({ merch }: { merch: MerchItem[] }) {
  const { copy } = await getContent();
  const { ROOMS } = copy;
  const PAGE = ROOMS.merch.frames;
  const pages: WallPage[] = Array.from({ length: Math.ceil(merch.length / PAGE) }, (_, p) => {
    const items = merch.slice(p * PAGE, (p + 1) * PAGE);
    return {
      keys: items.map((m, j) => ({ id: m.id, index: indexLabel(p * PAGE + j), label: m.name })),
      screens: items.map((m, j) => (
        <MerchCard key={m.id} item={m} index={indexLabel(p * PAGE + j)} copy={copy} sizes="(max-width: 720px) 0px, 22vw" className="merch-card--screen" />
      )),
    };
  });
  return (
    <>
      <svg className="stage__art" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
        <defs>
          <linearGradient id="mc-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--ink)" stopOpacity="0.45" />
            <stop offset="0.55" stopColor="var(--ink)" stopOpacity="0.1" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="mc-floor" gradientUnits="userSpaceOnUse" x1="0" y1="740" x2="0" y2="1000">
            <stop offset="0" stopColor="var(--room-concrete)" />
            <stop offset="1" stopColor="var(--room-floor)" />
          </linearGradient>
          <linearGradient id="mc-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-metal-2)" />
            <stop offset="1" stopColor="var(--room-metal)" />
          </linearGradient>
          <linearGradient id="mc-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-lamp)" stopOpacity="0.26" />
            <stop offset="1" stopColor="var(--room-lamp)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="mc-case" cx="0.5" cy="1" r="0.9">
            <stop offset="0" stopColor="var(--gold)" stopOpacity="0.2" />
            <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mc-vignette" cx="0.5" cy="0.45" r="0.72">
            <stop offset="0.5" stopColor="var(--ink)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0.8" />
          </radialGradient>
          <pattern id="mc-brick" width="56" height="28" patternUnits="userSpaceOnUse">
            <rect width="56" height="28" fill="var(--room-brick)" />
            <rect x="1" y="1" width="26" height="12" fill="var(--room-brick-2)" />
            <rect x="29" y="1" width="26" height="12" fill="var(--room-brick-2)" />
            <rect x="-13" y="15" width="26" height="12" fill="var(--room-brick-2)" />
            <rect x="15" y="15" width="26" height="12" fill="var(--room-brick-2)" />
            <rect x="43" y="15" width="26" height="12" fill="var(--room-brick-2)" />
          </pattern>
          <pattern id="mc-peg" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="3" fill="var(--ink)" opacity="0.7" />
          </pattern>
          <filter id="mc-blur-s" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="mc-blur-l" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="26" />
          </filter>
        </defs>

        <rect width="1600" height="1000" fill="url(#mc-brick)" />
        <rect width="1600" height="1000" fill="url(#mc-shade)" />
        <g fill="var(--room-metal)">
          <rect x="0" y="0" width="1600" height="26" />
          {SLATS.map((i) => (
            <rect key={i} x={i * 200 - 10} y="0" width="20" height="60" />
          ))}
        </g>

        <g opacity="0.5">
          <rect x="1060" y="70" width="230" height="60" fill="var(--room-velvet)" />
          <text x="1175" y="112" textAnchor="middle" fill="var(--paper)" fillOpacity="0.55" fontFamily="var(--font-serif), serif" fontSize="34" fontWeight="600" letterSpacing="6">
            SHED 3
          </text>
        </g>

        <rect x="120" y="140" width="880" height="560" fill="var(--gold)" opacity="0.08" filter="url(#mc-blur-l)" />
        <rect x="128" y="150" width="864" height="540" rx="4" fill="url(#mc-metal)" stroke="var(--room-metal-2)" strokeWidth="2" />
        <rect x="136" y="158" width="848" height="524" fill="none" stroke="var(--gold)" strokeOpacity="0.45" />
        <rect x="144" y="166" width="832" height="508" fill="var(--room-screen)" />
        <rect x="144" y="166" width="832" height="508" fill="url(#mc-case)" />
        <rect x="112" y="690" width="896" height="16" fill="var(--room-wood)" />
        <rect x="128" y="706" width="864" height="60" fill="var(--room-leather)" />
        <line x1="128" y1="706" x2="992" y2="706" stroke="var(--gold)" strokeOpacity="0.35" />
        {[340, 780].map((x) => (
          <g key={x}>
            <path d={`M${x} 150 v-30 h40`} fill="none" stroke="var(--room-metal-2)" strokeWidth="6" strokeLinecap="round" />
            <path d={`M${x + 30} 104 h50 l10 26 h-70 z`} fill="var(--room-metal-2)" />
            <ellipse cx={x + 55} cy="131" rx="26" ry="5" fill="var(--room-lamp)" opacity="0.9" />
            <ellipse cx={x + 55} cy="134" rx="40" ry="12" fill="var(--room-lamp)" opacity="0.5" filter="url(#mc-blur-s)" />
            <polygon points={`${x + 20},132 ${x + 90},132 ${x + 220},670 ${x - 110},670`} fill="url(#mc-cone)" />
          </g>
        ))}

        <rect x="1030" y="150" width="500" height="8" rx="4" fill="url(#mc-metal)" />
        <rect x="1036" y="150" width="8" height="590" fill="url(#mc-metal)" />
        <rect x="1516" y="150" width="8" height="590" fill="url(#mc-metal)" />
        {HANGERS.map((h) => (
          <g key={h.x} transform={`translate(${h.x + 20} 176)`}>
            <path d="M0 -18 v-8 a6 6 0 1 1 6 -6" fill="none" stroke="var(--room-metal-2)" strokeWidth="3" />
            <path d="M-34 0 L0 -18 L34 0" fill="none" stroke="var(--room-metal-2)" strokeWidth="3" />
            <path d={GARMENT_ART[h.kind]} transform="scale(0.62)" fill="var(--room-canvas)" stroke="var(--room-metal-2)" strokeWidth="3" />
          </g>
        ))}
        <rect x="1030" y="300" width="500" height="380" fill="var(--room-wall-2)" opacity="0.88" />
        <rect x="1030" y="300" width="500" height="380" fill="url(#mc-peg)" />
        <rect x="1030" y="300" width="500" height="380" fill="none" stroke="var(--gold)" strokeOpacity="0.3" />

        <rect x="0" y="740" width="1600" height="260" fill="url(#mc-floor)" />
        <line x1="0" y1="740" x2="1600" y2="740" stroke="var(--paper)" strokeOpacity="0.08" strokeWidth="2" />
        {CRATES.map((c) => (
          <g key={`${c.x}-${c.y}`}>
            <rect x={c.x} y={c.y} width="96" height="60" fill="var(--room-wood)" stroke="var(--room-floor)" strokeWidth="3" />
            <line x1={c.x} y1={c.y + 20} x2={c.x + 96} y2={c.y + 20} stroke="var(--room-floor)" strokeWidth="3" />
            <line x1={c.x} y1={c.y + 40} x2={c.x + 96} y2={c.y + 40} stroke="var(--room-floor)" strokeWidth="3" />
          </g>
        ))}

        <rect width="1600" height="1000" fill="url(#mc-vignette)" />
      </svg>

      {pages.length > 0 ? (
        <PagedConsole pages={pages} label={ROOMS.merch.console} more={ROOMS.merch.more} moreLabel={ROOMS.merch.moreLabel} preview={false} />
      ) : (
        <div className="stage__screen">
          <MerchSoon copy={copy} className="merch-soon--screen" />
        </div>
      )}
    </>
  );
}
