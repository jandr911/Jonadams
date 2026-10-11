import { indexLabel } from "../city/layout";
import type { Creative } from "@/content/site";
import type { SiteCopy } from "@/content/copy";
import { getContent } from "@/lib/content";
import GetListed from "./GetListed";
import Portrait from "./Portrait";
import PagedConsole, { type WallPage } from "./PagedConsole";
import RoomLink from "./RoomLink";

const LAMPS = [400, 740];

const TOWER_STEPS = [
  { x: 1392, y: 150, w: 96 },
  { x: 1404, y: 110, w: 72 },
  { x: 1416, y: 80, w: 48 },
];

const TOWER_WINDOWS = [170, 196, 222, 248, 274];

const SLABS = [0, 180, 360, 540, 720, 900, 1080, 1260, 1440];

const PASTED = [
  { x: 190, y: 650, w: 90, h: 120, r: -3 },
  { x: 300, y: 680, w: 70, h: 90, r: 4 },
];


export function profileHref(c: Creative) {
  return `/creatives/${c.slug}`;
}

function Billboard({ creative, index, copy }: { creative: Creative | null; index: number; copy: SiteCopy }) {
  const { ROOMS } = copy;
  if (!creative) {
    return (
      <div className="stage__bill stage__bill--open">
        <span className="stage__bill-index">{indexLabel(index)}</span>
        <span className="stage__bill-craft">{ROOMS.creatives.openCraft}</span>
        <span className="stage__bill-name">{ROOMS.creatives.open}</span>
        <GetListed className="stage__bill-call" compact />
      </div>
    );
  }
  return (
    <div className="stage__bill">
      <Portrait creative={creative} alt="" sizes="(max-width: 720px) 0px, 20vw" className="stage__bill-portrait" />
      <div className="stage__bill-meta">
        <span className="stage__bill-index">{indexLabel(index)}</span>
        <span className="stage__bill-craft">
          {creative.craft} · {creative.city}
        </span>
        <span className="stage__bill-name">{creative.name}</span>
        <RoomLink href={profileHref(creative)} className="stage__bill-link">
          {ROOMS.creatives.viewProfile}
        </RoomLink>
      </div>
    </div>
  );
}

export default async function CreativesScene({ creatives }: { creatives: Creative[] }) {
  const { copy } = await getContent();
  const { ROOMS } = copy;
  const PAGE = ROOMS.creatives.frames;
  const PAGES = Math.max(2, Math.ceil(creatives.length / PAGE));
  const FRAMES = Array.from({ length: PAGES * PAGE }, (_, i) => creatives[i] ?? null);
  const pages: WallPage[] = Array.from({ length: PAGES }, (_, p) => {
    const frames = FRAMES.slice(p * PAGE, (p + 1) * PAGE);
    return {
      keys: frames.map((c, j) => {
        const i = p * PAGE + j;
        return c
          ? { id: c.slug, index: indexLabel(i), label: c.name, href: profileHref(c) }
          : { id: `open-${i}`, index: indexLabel(i), label: ROOMS.creatives.openCraft };
      }),
      screens: frames.map((c, j) => {
        const i = p * PAGE + j;
        return <Billboard key={c ? c.slug : i} creative={c} index={i} copy={copy} />;
      }),
    };
  });
  return (
    <>
      <svg className="stage__art" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
        <defs>
          <linearGradient id="ct-sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="320">
            <stop offset="0" stopColor="var(--room-sky)" />
            <stop offset="1" stopColor="var(--room-sky-2)" />
          </linearGradient>
          <linearGradient id="ct-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--ink)" stopOpacity="0.35" />
            <stop offset="0.6" stopColor="var(--ink)" stopOpacity="0.1" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="ct-walk" gradientUnits="userSpaceOnUse" x1="0" y1="800" x2="0" y2="900">
            <stop offset="0" stopColor="var(--room-concrete)" />
            <stop offset="1" stopColor="var(--room-floor-2)" />
          </linearGradient>
          <linearGradient id="ct-street" gradientUnits="userSpaceOnUse" x1="0" y1="900" x2="0" y2="1000">
            <stop offset="0" stopColor="var(--room-asphalt)" />
            <stop offset="1" stopColor="var(--room-floor)" />
          </linearGradient>
          <linearGradient id="ct-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-lamp)" stopOpacity="0.3" />
            <stop offset="1" stopColor="var(--room-lamp)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ct-lamp-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-lamp-warm)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--room-lamp-warm)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ct-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-metal-2)" />
            <stop offset="1" stopColor="var(--room-metal)" />
          </linearGradient>
          <linearGradient id="ct-wet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--violet)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--violet)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="ct-bill-wash" cx="0.5" cy="1" r="0.9">
            <stop offset="0" stopColor="var(--violet)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--violet)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ct-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="var(--violet)" stopOpacity="0.32" />
            <stop offset="1" stopColor="var(--violet)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ct-vignette" cx="0.5" cy="0.45" r="0.72">
            <stop offset="0.5" stopColor="var(--ink)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0.78" />
          </radialGradient>
          <pattern id="ct-brick" width="56" height="28" patternUnits="userSpaceOnUse">
            <rect width="56" height="28" fill="var(--room-brick)" />
            <rect x="1" y="1" width="26" height="12" fill="var(--room-brick-2)" />
            <rect x="29" y="1" width="26" height="12" fill="var(--room-brick-2)" />
            <rect x="-13" y="15" width="26" height="12" fill="var(--room-brick-2)" />
            <rect x="15" y="15" width="26" height="12" fill="var(--room-brick-2)" />
            <rect x="43" y="15" width="26" height="12" fill="var(--room-brick-2)" />
          </pattern>
          <filter id="ct-blur-s" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="ct-blur-l" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="26" />
          </filter>
        </defs>

        <rect width="1600" height="1000" fill="url(#ct-sky)" />
        <g fill="var(--room-star)" opacity="0.45">
          <circle cx="120" cy="60" r="1" />
          <circle cx="300" cy="110" r="1.1" />
          <circle cx="560" cy="40" r="0.9" />
          <circle cx="1040" cy="70" r="1" />
          <circle cx="1240" cy="120" r="1.2" />
          <circle cx="1560" cy="50" r="0.9" />
        </g>
        <g fill="var(--room-skyline)">
          {TOWER_STEPS.map((s) => (
            <rect key={s.y} x={s.x} y={s.y} width={s.w} height={320 - s.y} />
          ))}
          <rect x="1080" y="230" width="300" height="90" />
          <rect x="1480" y="250" width="120" height="70" />
        </g>
        <g fill="var(--room-shore)" opacity="0.6">
          {TOWER_WINDOWS.map((y) => (
            <g key={y}>
              <rect x="1406" y={y} width="4" height="6" />
              <rect x="1424" y={y} width="4" height="6" />
              <rect x="1442" y={y} width="4" height="6" />
              <rect x="1460" y={y} width="4" height="6" />
            </g>
          ))}
          <rect x="1120" y="260" width="4" height="6" />
          <rect x="1220" y="276" width="4" height="6" />
          <rect x="1320" y="262" width="4" height="6" />
        </g>
        <circle cx="1440" cy="72" r="2.4" fill="var(--pink)" className="club-blink" />

        <rect x="0" y="300" width="1600" height="500" fill="url(#ct-brick)" />
        <rect x="0" y="300" width="1600" height="500" fill="url(#ct-shade)" />
        <rect x="0" y="292" width="1600" height="12" fill="var(--room-concrete)" />
        <line x1="0" y1="304" x2="1600" y2="304" stroke="var(--ink)" strokeOpacity="0.6" strokeWidth="3" />
        {PASTED.map((p) => (
          <g key={p.x} transform={`rotate(${p.r} ${p.x + p.w / 2} ${p.y + p.h / 2})`}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="var(--room-canvas)" opacity="0.75" />
            <path d={`M${p.x} ${p.y + p.h * 0.7} l${p.w * 0.3} ${p.h * 0.1} l${p.w * 0.3} -${p.h * 0.08} l${p.w * 0.4} ${p.h * 0.14} V${p.y + p.h} H${p.x} Z`} fill="var(--room-brick-2)" opacity="0.8" />
            <g stroke="var(--paper)" strokeOpacity="0.14" strokeWidth="3">
              <line x1={p.x + 12} y1={p.y + 20} x2={p.x + p.w - 12} y2={p.y + 20} />
              <line x1={p.x + 12} y1={p.y + 34} x2={p.x + p.w - 30} y2={p.y + 34} />
            </g>
          </g>
        ))}

        <rect x="0" y="800" width="1600" height="100" fill="url(#ct-walk)" />
        <line x1="0" y1="800" x2="1600" y2="800" stroke="var(--paper)" strokeOpacity="0.1" strokeWidth="2" />
        <g stroke="var(--ink)" strokeOpacity="0.5" strokeWidth="2">
          {SLABS.map((x) => (
            <line key={x} x1={x + 60} y1="800" x2={x} y2="900" />
          ))}
          <line x1="0" y1="850" x2="1600" y2="850" />
        </g>
        <rect x="0" y="896" width="1600" height="12" fill="var(--room-concrete)" />
        <rect x="0" y="908" width="1600" height="92" fill="url(#ct-street)" />
        <rect x="200" y="802" width="760" height="96" fill="url(#ct-wet)" />
        <ellipse cx="580" cy="820" rx="400" ry="60" fill="url(#ct-glow)" opacity="0.5" />
        <rect x="620" y="888" width="60" height="8" rx="2" fill="var(--room-metal)" />
        <g stroke="var(--room-metal-2)" strokeWidth="2">
          <line x1="630" y1="890" x2="630" y2="896" />
          <line x1="642" y1="890" x2="642" y2="896" />
          <line x1="654" y1="890" x2="654" y2="896" />
          <line x1="666" y1="890" x2="666" y2="896" />
        </g>

        <rect x="80" y="180" width="10" height="700" fill="url(#ct-metal)" />
        <rect x="68" y="868" width="34" height="14" rx="3" fill="var(--room-metal)" />
        <path d="M85 180 q0 -40 50 -40" fill="none" stroke="var(--room-metal-2)" strokeWidth="7" strokeLinecap="round" />
        <path d="M118 128 h40 l-8 24 h-24 z" fill="var(--room-metal-2)" />
        <ellipse cx="138" cy="152" rx="12" ry="4" fill="var(--room-lamp-warm)" opacity="0.9" />
        <ellipse cx="138" cy="154" rx="24" ry="10" fill="var(--room-lamp-warm)" opacity="0.5" filter="url(#ct-blur-s)" />
        <polygon points="118,152 158,152 300,800 0,800" fill="url(#ct-lamp-cone)" />

        <rect x="140" y="140" width="860" height="500" fill="var(--violet)" opacity="0.12" filter="url(#ct-blur-l)" />
        <rect x="160" y="150" width="820" height="470" rx="4" fill="url(#ct-metal)" stroke="var(--room-metal-2)" strokeWidth="2" />
        <rect x="168" y="158" width="804" height="454" fill="none" stroke="var(--gold)" strokeOpacity="0.45" />
        <rect x="180" y="170" width="780" height="430" fill="var(--room-screen)" />
        <rect x="180" y="170" width="780" height="430" fill="url(#ct-bill-wash)" />
        <rect x="180" y="170" width="780" height="430" fill="none" stroke="var(--paper)" strokeOpacity="0.08" />
        <g fill="var(--room-metal-2)">
          <rect x="300" y="620" width="14" height="180" />
          <rect x="826" y="620" width="14" height="180" />
          <rect x="150" y="620" width="840" height="10" />
        </g>
        {LAMPS.map((x) => (
          <g key={x}>
            <path d={`M${x} 150 v-26 q0 -14 14 -14 h20`} fill="none" stroke="var(--room-metal-2)" strokeWidth="6" strokeLinecap="round" />
            <path d={`M${x + 20} 100 h50 l10 26 h-70 z`} fill="var(--room-metal-2)" />
            <ellipse cx={x + 55} cy="127" rx="26" ry="5" fill="var(--room-lamp)" opacity="0.9" />
            <ellipse cx={x + 55} cy="130" rx="40" ry="12" fill="var(--room-lamp)" opacity="0.5" filter="url(#ct-blur-s)" />
            <polygon points={`${x + 20},128 ${x + 90},128 ${x + 200},600 ${x - 110},600`} fill="url(#ct-cone)" />
          </g>
        ))}

        <g fill="url(#ct-metal)" stroke="var(--room-metal-2)">
          <rect x="1026" y="306" width="508" height="306" rx="3" />
        </g>
        <rect x="1032" y="312" width="496" height="294" fill="var(--room-wall-2)" />
        <rect x="1032" y="312" width="496" height="294" fill="url(#ct-bill-wash)" opacity="0.6" />
        <path d="M1026 306 h508" stroke="var(--gold)" strokeOpacity="0.5" strokeWidth="2" />
        <rect x="1020" y="296" width="520" height="10" fill="var(--room-metal-2)" />
        <ellipse cx="1280" cy="302" rx="200" ry="4" fill="var(--room-lamp)" opacity="0.5" filter="url(#ct-blur-s)" />
        <polygon points="1030,306 1530,306 1600,620 960,620" fill="url(#ct-cone)" opacity="0.6" />

        <rect x="1036" y="636" width="488" height="150" fill="var(--room-canvas)" />
        <path d="M1036 760 l60 10 l80 -8 l90 12 l100 -6 l90 10 l68 -4 V786 H1036 Z" fill="var(--room-brick-2)" opacity="0.7" />
        <circle cx="1046" cy="646" r="4" fill="var(--room-metal-2)" />
        <circle cx="1514" cy="646" r="4" fill="var(--room-metal-2)" />

        <rect width="1600" height="1000" fill="url(#ct-vignette)" />
      </svg>

      <GetListed className="stage__poster" />
      <PagedConsole pages={pages} label={ROOMS.creatives.console} more={ROOMS.creatives.more} moreLabel={ROOMS.creatives.moreLabel} />
    </>
  );
}
