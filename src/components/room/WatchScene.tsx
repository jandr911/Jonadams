import { indexLabel } from "../city/layout";
import { ROOMS, VISUALS } from "@/content/site";
import PlayerScreen from "./PlayerScreen";
import RoomConsole from "./RoomConsole";

const WINDOWS = [260, 620, 980];
const WINDOW_W = 340;
const WINDOW_TOP = 310;
const WINDOW_SILL = 640;
const MULLIONS = [1, 2, 3, 4, 5];
const TRANSOMS = [400, 480, 560];

const CORKTOWN = [
  { x: 40, w: 60, h: 30 },
  { x: 120, w: 40, h: 50 },
  { x: 180, w: 90, h: 22 },
  { x: 300, w: 30, h: 70 },
  { x: 350, w: 70, h: 36 },
];

const CHAIR_ROWS = [
  { y: 640, from: 420, to: 1180, step: 44, w: 30, h: 36 },
  { y: 690, from: 380, to: 1220, step: 50, w: 34, h: 42 },
];

const RIBS = [0, 200, 400, 600, 800, 1000, 1200, 1400, 1600];

const CHANDELIER_LAMPS = [-54, -18, 18, 54];

function Chandelier({ x }: { x: number }) {
  return (
    <g>
      <line x1={x} y1="0" x2={x} y2="150" stroke="var(--room-metal-2)" strokeWidth="3" />
      <ellipse cx={x} cy="190" rx="78" ry="16" fill="none" stroke="var(--gold)" strokeWidth="4" />
      <ellipse cx={x} cy="190" rx="78" ry="16" fill="none" stroke="var(--gold-2)" strokeOpacity="0.5" strokeDasharray="2 6" />
      <g stroke="var(--gold)" strokeWidth="2">
        <line x1={x - 78} y1="190" x2={x} y2="150" />
        <line x1={x + 78} y1="190" x2={x} y2="150" />
        <line x1={x - 30} y1="205" x2={x} y2="150" />
        <line x1={x + 30} y1="205" x2={x} y2="150" />
      </g>
      {CHANDELIER_LAMPS.map((dx) => (
        <g key={dx}>
          <circle cx={x + dx} cy={186 + Math.abs(dx) * 0.1} r="9" fill="var(--room-lamp-warm)" opacity="0.45" filter="url(#mcs-blur-s)" />
          <circle cx={x + dx} cy={186 + Math.abs(dx) * 0.1} r="4" fill="var(--room-lamp)" />
        </g>
      ))}
    </g>
  );
}

function Column({ x, scale = 1 }: { x: number; scale?: number }) {
  const w = 80 * scale;
  const top = 60 + (1 - scale) * 120;
  return (
    <g>
      <rect x={x} y={top} width={w} height={780 - top} fill="url(#mcs-column)" />
      <rect x={x - 14 * scale} y={top} width={w + 28 * scale} height={60 * scale} rx={4} fill="var(--room-marble-2)" />
      <path
        d={`M${x - 14 * scale} ${top + 60 * scale} q${20 * scale} -${26 * scale} ${40 * scale} 0 q${20 * scale} -${26 * scale} ${40 * scale} 0 q${20 * scale} -${26 * scale} ${28 * scale} 0`}
        fill="none"
        stroke="var(--gold)"
        strokeOpacity="0.55"
        strokeWidth={2}
      />
      <circle cx={x - 6 * scale} cy={top + 18 * scale} r={9 * scale} fill="none" stroke="var(--gold)" strokeOpacity="0.6" strokeWidth={2} />
      <circle cx={x + w + 6 * scale} cy={top + 18 * scale} r={9 * scale} fill="none" stroke="var(--gold)" strokeOpacity="0.6" strokeWidth={2} />
      <rect x={x - 10 * scale} y={740} width={w + 20 * scale} height={40} fill="var(--room-marble-2)" />
      <line x1={x + w * 0.3} y1={top + 60 * scale} x2={x + w * 0.3} y2={740} stroke="var(--paper)" strokeOpacity="0.07" strokeWidth={6 * scale} />
    </g>
  );
}

export default function WatchScene() {
  const keys = VISUALS.map((v, i) => ({ id: v.title, index: indexLabel(i), label: v.title }));
  const screens = VISUALS.map((v, i) => <PlayerScreen key={v.title} slot={v} index={indexLabel(i)} />);
  return (
    <>
      <svg className="stage__art" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
        <defs>
          <linearGradient id="mcs-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-wall-2)" />
            <stop offset="0.5" stopColor="var(--room-marble)" />
            <stop offset="1" stopColor="var(--room-wall-2)" />
          </linearGradient>
          <linearGradient id="mcs-vault" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-tile)" />
            <stop offset="1" stopColor="var(--room-wall-2)" />
          </linearGradient>
          <linearGradient id="mcs-column" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--room-wall-2)" />
            <stop offset="0.4" stopColor="var(--room-marble-2)" />
            <stop offset="1" stopColor="var(--room-marble)" />
          </linearGradient>
          <linearGradient id="mcs-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-sky)" />
            <stop offset="1" stopColor="var(--room-sky-2)" />
          </linearGradient>
          <linearGradient id="mcs-floor" gradientUnits="userSpaceOnUse" x1="0" y1="780" x2="0" y2="1000">
            <stop offset="0" stopColor="var(--room-marble)" />
            <stop offset="1" stopColor="var(--room-floor)" />
          </linearGradient>
          <linearGradient id="mcs-refl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--cyan)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--cyan)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="mcs-win-refl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-sky-2)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--room-sky-2)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="mcs-beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--cyan)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--cyan)" stopOpacity="0.16" />
          </linearGradient>
          <linearGradient id="mcs-ceiling" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--ink)" stopOpacity="0.85" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="mcs-screen-wash" cx="0.5" cy="1" r="0.9">
            <stop offset="0" stopColor="var(--cyan)" stopOpacity="0.3" />
            <stop offset="1" stopColor="var(--cyan)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mcs-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="var(--cyan)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--cyan)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mcs-vignette" cx="0.5" cy="0.45" r="0.72">
            <stop offset="0.5" stopColor="var(--ink)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0.78" />
          </radialGradient>
          <pattern id="mcs-tile" width="30" height="16" patternUnits="userSpaceOnUse">
            <rect width="30" height="16" fill="var(--room-tile)" />
            <rect x="1" y="1" width="13" height="6" fill="var(--room-tile-2)" />
            <rect x="16" y="1" width="13" height="6" fill="var(--room-tile-2)" />
            <rect x="-6" y="9" width="13" height="6" fill="var(--room-tile-2)" />
            <rect x="9" y="9" width="13" height="6" fill="var(--room-tile-2)" />
            <rect x="24" y="9" width="13" height="6" fill="var(--room-tile-2)" />
          </pattern>
          <pattern id="mcs-marble" width="160" height="90" patternUnits="userSpaceOnUse">
            <rect width="160" height="90" fill="none" stroke="var(--paper)" strokeOpacity="0.05" />
          </pattern>
          <filter id="mcs-blur-s" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="mcs-blur-l" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="28" />
          </filter>
          <clipPath id="mcs-windows">
            {WINDOWS.map((x) => (
              <path key={x} d={`M${x} ${WINDOW_SILL} V${WINDOW_TOP} A${WINDOW_W / 2} ${WINDOW_W / 2} 0 0 1 ${x + WINDOW_W} ${WINDOW_TOP} V${WINDOW_SILL} Z`} />
            ))}
          </clipPath>
        </defs>

        <rect width="1600" height="1000" fill="url(#mcs-wall)" />
        <rect x="0" y="0" width="1600" height="300" fill="url(#mcs-tile)" />
        <rect x="0" y="0" width="1600" height="300" fill="url(#mcs-vault)" opacity="0.75" />
        <g fill="none" stroke="var(--room-marble-2)" strokeWidth="10">
          {RIBS.map((x) => (
            <path key={x} d={`M${x - 100} 300 Q${x} -40 ${x + 100} 300`} />
          ))}
        </g>
        <g fill="none" stroke="var(--gold)" strokeOpacity="0.3" strokeWidth="2">
          {RIBS.map((x) => (
            <path key={x} d={`M${x - 100} 300 Q${x} -40 ${x + 100} 300`} />
          ))}
        </g>
        <rect x="0" y="296" width="1600" height="14" fill="var(--room-marble-2)" />
        <line x1="0" y1="300" x2="1600" y2="300" stroke="var(--gold)" strokeOpacity="0.5" strokeDasharray="6 10" />

        <g clipPath="url(#mcs-windows)">
          <rect x="200" y="100" width="1200" height="560" fill="url(#mcs-sky)" />
          <g fill="var(--room-star)" opacity="0.45">
            <circle cx="330" cy="360" r="1" />
            <circle cx="470" cy="340" r="1.2" />
            <circle cx="720" cy="352" r="1" />
            <circle cx="900" cy="330" r="0.9" />
            <circle cx="1100" cy="370" r="1.1" />
            <circle cx="1260" cy="344" r="0.8" />
          </g>
          {WINDOWS.map((wx) => (
            <g key={wx} fill="var(--room-skyline)">
              {CORKTOWN.map((b) => (
                <rect key={b.x} x={wx - 60 + b.x} y={WINDOW_SILL - 40 - b.h} width={b.w} height={b.h} />
              ))}
            </g>
          ))}
          <g fill="var(--room-shore)" opacity="0.7">
            <rect x="330" y="580" width="3" height="4" />
            <rect x="520" y="590" width="3" height="4" />
            <rect x="700" y="574" width="3" height="4" />
            <rect x="1040" y="588" width="3" height="4" />
            <rect x="1210" y="578" width="3" height="4" />
          </g>
          <rect x="200" y="600" width="1200" height="60" fill="var(--room-water)" />
        </g>
        {WINDOWS.map((x) => (
          <g key={x}>
            <path d={`M${x} ${WINDOW_SILL} V${WINDOW_TOP} A${WINDOW_W / 2} ${WINDOW_W / 2} 0 0 1 ${x + WINDOW_W} ${WINDOW_TOP} V${WINDOW_SILL}`} fill="url(#mcs-win-refl)" />
            <g stroke="var(--room-marble-2)" strokeWidth="6">
              {MULLIONS.map((m) => (
                <line key={m} x1={x + (WINDOW_W / 6) * m} y1={WINDOW_TOP - 110} x2={x + (WINDOW_W / 6) * m} y2={WINDOW_SILL} />
              ))}
              {TRANSOMS.map((ty) => (
                <line key={ty} x1={x} y1={ty} x2={x + WINDOW_W} y2={ty} />
              ))}
            </g>
            <path
              d={`M${x} ${WINDOW_SILL} V${WINDOW_TOP} A${WINDOW_W / 2} ${WINDOW_W / 2} 0 0 1 ${x + WINDOW_W} ${WINDOW_TOP} V${WINDOW_SILL}`}
              fill="none"
              stroke="var(--room-marble-2)"
              strokeWidth="18"
            />
            <path
              d={`M${x} ${WINDOW_SILL} V${WINDOW_TOP} A${WINDOW_W / 2} ${WINDOW_W / 2} 0 0 1 ${x + WINDOW_W} ${WINDOW_TOP} V${WINDOW_SILL}`}
              fill="none"
              stroke="var(--gold)"
              strokeOpacity="0.35"
              strokeWidth="2"
            />
            <rect x={x - 16} y={WINDOW_SILL} width={WINDOW_W + 32} height="18" fill="var(--room-marble-2)" />
          </g>
        ))}

        <Chandelier x={330} />
        <Chandelier x={1270} />

        <Column x={180} scale={0.6} />
        <Column x={1372} scale={0.6} />
        <Column x={40} />
        <Column x={1480} />

        <rect x="0" y="780" width="1600" height="220" fill="url(#mcs-floor)" />
        <rect x="0" y="780" width="1600" height="220" fill="url(#mcs-marble)" />
        <line x1="0" y1="780" x2="1600" y2="780" stroke="var(--paper)" strokeOpacity="0.1" strokeWidth="2" />
        {WINDOWS.map((x) => (
          <rect key={x} x={x + 20} y="782" width={WINDOW_W - 40} height="160" fill="url(#mcs-win-refl)" opacity="0.5" />
        ))}
        <rect x="500" y="782" width="600" height="218" fill="url(#mcs-refl)" />
        <ellipse cx="800" cy="800" rx="520" ry="110" fill="url(#mcs-glow)" opacity="0.5" />

        {CHAIR_ROWS.map((r) => (
          <g key={r.y} fill="var(--room-wall-2)" stroke="var(--room-metal-2)">
            {Array.from({ length: Math.floor((r.to - r.from) / r.step) }, (_, i) => {
              const cx = r.from + i * r.step;
              if (cx > 760 && cx < 840) return null;
              return (
                <g key={i}>
                  <rect x={cx} y={r.y} width={r.w} height={r.h * 0.55} rx="3" />
                  <rect x={cx} y={r.y + r.h * 0.6} width={r.w} height={r.h * 0.3} rx="2" />
                </g>
              );
            })}
          </g>
        ))}

        <polygon points="340,838 480,560 1120,560 440,860" fill="url(#mcs-beam)" opacity="0.7" />
        <rect x="300" y="800" width="90" height="46" rx="6" fill="var(--room-metal-2)" />
        <rect x="312" y="810" width="66" height="26" rx="3" fill="var(--room-metal)" />
        <circle cx="388" cy="822" r="11" fill="var(--room-screen)" stroke="var(--room-metal-2)" strokeWidth="3" />
        <circle cx="388" cy="822" r="5" fill="var(--cyan)" opacity="0.9" />
        <circle cx="388" cy="822" r="12" fill="var(--cyan)" opacity="0.5" filter="url(#mcs-blur-s)" />
        <g stroke="var(--room-metal-2)" strokeWidth="5" strokeLinecap="round">
          <line x1="345" y1="846" x2="320" y2="930" />
          <line x1="345" y1="846" x2="372" y2="930" />
          <line x1="345" y1="846" x2="345" y2="935" />
        </g>

        <rect x="540" y="822" width="520" height="12" rx="2" fill="var(--room-wood)" />
        <line x1="540" y1="822" x2="1060" y2="822" stroke="var(--paper)" strokeOpacity="0.12" />
        <g stroke="var(--room-wood)" strokeWidth="8" strokeLinecap="round">
          <line x1="580" y1="834" x2="560" y2="910" />
          <line x1="600" y1="834" x2="624" y2="910" />
          <line x1="1000" y1="834" x2="976" y2="910" />
          <line x1="1020" y1="834" x2="1040" y2="910" />
        </g>

        <g stroke="var(--room-cable)" strokeWidth="3">
          <line x1="560" y1="0" x2="560" y2="190" />
          <line x1="1040" y1="0" x2="1040" y2="190" />
        </g>
        <rect x="470" y="190" width="660" height="380" rx="3" fill="var(--room-wall-2)" stroke="var(--room-metal-2)" strokeWidth="2" />
        <rect x="480" y="200" width="640" height="360" fill="var(--room-screen)" />
        <rect x="480" y="200" width="640" height="360" fill="url(#mcs-screen-wash)" />
        <rect x="480" y="200" width="640" height="360" fill="none" stroke="var(--paper)" strokeOpacity="0.1" />
        <rect x="460" y="170" width="680" height="420" fill="var(--cyan)" opacity="0.12" filter="url(#mcs-blur-l)" />
        <rect x="770" y="570" width="60" height="6" rx="3" fill="var(--room-metal-2)" />

        <rect y="0" width="1600" height="120" fill="url(#mcs-ceiling)" />
        <rect width="1600" height="1000" fill="url(#mcs-vignette)" />
      </svg>

      <RoomConsole keys={keys} screens={screens} label={ROOMS.watch.console} preview={false} />
    </>
  );
}
