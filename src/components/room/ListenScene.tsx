import { indexLabel } from "../city/layout";
import { EQ_BARS, ROOMS, VIDEOS } from "@/content/site";
import PlayerScreen from "./PlayerScreen";
import RoomConsole from "./RoomConsole";

const SEAT_ROWS = [
  { y: 486, h: 22, from: 60, to: 1540, step: 46, w: 36 },
  { y: 512, h: 26, from: 40, to: 1560, step: 52, w: 42 },
  { y: 540, h: 30, from: 20, to: 1580, step: 58, w: 48 },
];

const CURTAIN_FOLDS = [14, 34, 56, 80, 102, 126, 150, 168];

const ARCH_SCALLOPS = Array.from({ length: 23 }, (_, i) => 340 + i * 40);

const CEILING_ROSETTES = [120, 220, 1380, 1480];

const DESK_LAMPS = [
  { x: 1140, c: "var(--amber)" },
  { x: 1160, c: "var(--room-metal-2)" },
  { x: 1180, c: "var(--amber)" },
];

export default function ListenScene() {
  const keys = VIDEOS.map((v, i) => ({ id: v.title, index: indexLabel(i), label: v.title }));
  const screens = VIDEOS.map((v, i) => <PlayerScreen key={v.title} slot={v} index={indexLabel(i)} />);
  return (
    <>
      <svg className="stage__art" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
        <defs>
          <linearGradient id="fox-house" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-velvet)" />
            <stop offset="1" stopColor="var(--room-wall-2)" />
          </linearGradient>
          <linearGradient id="fox-curtain" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--room-velvet-2)" />
            <stop offset="0.5" stopColor="var(--room-velvet)" />
            <stop offset="1" stopColor="var(--room-velvet-2)" />
          </linearGradient>
          <linearGradient id="fox-stage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-wood)" />
            <stop offset="1" stopColor="var(--room-leather)" />
          </linearGradient>
          <linearGradient id="fox-spot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-lamp)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--room-lamp)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fox-desk" gradientUnits="userSpaceOnUse" x1="0" y1="585" x2="0" y2="1000">
            <stop offset="0" stopColor="var(--room-metal-2)" />
            <stop offset="0.35" stopColor="var(--room-metal)" />
            <stop offset="1" stopColor="var(--room-floor)" />
          </linearGradient>
          <linearGradient id="fox-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-metal-2)" />
            <stop offset="1" stopColor="var(--room-metal)" />
          </linearGradient>
          <linearGradient id="fox-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--room-glass)" stopOpacity="0.09" />
            <stop offset="0.5" stopColor="var(--room-glass)" stopOpacity="0.02" />
            <stop offset="1" stopColor="var(--room-glass)" stopOpacity="0.07" />
          </linearGradient>
          <linearGradient id="fox-lamp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-lamp-warm)" stopOpacity="0.3" />
            <stop offset="1" stopColor="var(--room-lamp-warm)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fox-ceiling" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--ink)" stopOpacity="0.9" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="fox-screen-wash" cx="0.5" cy="1" r="0.9">
            <stop offset="0" stopColor="var(--amber)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--amber)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="fox-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="var(--room-lamp-warm)" stopOpacity="0.4" />
            <stop offset="1" stopColor="var(--room-lamp-warm)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="fox-vignette" cx="0.5" cy="0.45" r="0.72">
            <stop offset="0.5" stopColor="var(--ink)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0.78" />
          </radialGradient>
          <pattern id="fox-gilt" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="3" fill="none" stroke="var(--gold)" strokeOpacity="0.55" />
            <circle cx="0" cy="0" r="1.2" fill="var(--gold)" fillOpacity="0.5" />
            <circle cx="20" cy="20" r="1.2" fill="var(--gold)" fillOpacity="0.5" />
          </pattern>
          <filter id="fox-blur-s" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="fox-blur-l" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="26" />
          </filter>
          <clipPath id="fox-window">
            <rect x="0" y="110" width="1600" height="455" />
          </clipPath>
        </defs>

        <rect width="1600" height="1000" fill="var(--room-wall-2)" />

        <g clipPath="url(#fox-window)">
          <rect x="0" y="110" width="1600" height="455" fill="url(#fox-house)" />
          <rect x="0" y="110" width="1600" height="110" fill="var(--room-velvet)" opacity="0.5" />
          {CEILING_ROSETTES.map((x) => (
            <g key={x} fill="none" stroke="var(--gold)" strokeOpacity="0.45">
              <circle cx={x} cy="170" r="30" />
              <circle cx={x} cy="170" r="18" strokeDasharray="3 5" />
              <circle cx={x} cy="170" r="5" fill="var(--gold)" fillOpacity="0.4" stroke="none" />
            </g>
          ))}
          <rect x="0" y="210" width="300" height="270" fill="var(--room-velvet)" opacity="0.55" />
          <rect x="1300" y="210" width="300" height="270" fill="var(--room-velvet)" opacity="0.55" />
          <g fill="var(--room-wall-2)" stroke="var(--gold)" strokeOpacity="0.5">
            <rect x="60" y="240" width="170" height="90" rx="40" />
            <rect x="1370" y="240" width="170" height="90" rx="40" />
            <rect x="40" y="350" width="210" height="100" rx="46" />
            <rect x="1350" y="350" width="210" height="100" rx="46" />
          </g>
          <g fill="var(--room-lamp-warm)" opacity="0.8">
            <circle cx="100" cy="330" r="3" />
            <circle cx="190" cy="330" r="3" />
            <circle cx="1410" cy="330" r="3" />
            <circle cx="1500" cy="330" r="3" />
            <circle cx="80" cy="452" r="3" />
            <circle cx="1520" cy="452" r="3" />
          </g>

          <path d="M300 470 V260 Q300 150 450 150 H1150 Q1300 150 1300 260 V470 Z" fill="var(--room-wall-2)" />
          <path d="M300 470 V260 Q300 150 450 150 H1150 Q1300 150 1300 260 V470" fill="none" stroke="var(--gold)" strokeWidth="10" strokeOpacity="0.9" />
          <path d="M318 470 V268 Q318 168 456 168 H1144 Q1282 168 1282 268 V470" fill="none" stroke="var(--gold-2)" strokeWidth="2" strokeOpacity="0.55" />
          <path d="M330 470 V276 Q330 182 462 182 H1138 Q1270 182 1270 276 V470" fill="url(#fox-gilt)" stroke="none" opacity="0.9" />
          {ARCH_SCALLOPS.map((x) => (
            <circle key={x} cx={x} cy="150" r="9" fill="var(--room-wall-2)" stroke="var(--gold)" strokeOpacity="0.8" />
          ))}
          <g fill="var(--gold)" opacity="0.9">
            <rect x="286" y="150" width="28" height="320" rx="3" />
            <rect x="1286" y="150" width="28" height="320" rx="3" />
            <rect x="274" y="140" width="52" height="16" rx="2" />
            <rect x="1274" y="140" width="52" height="16" rx="2" />
          </g>
          <g stroke="var(--room-wall-2)" strokeOpacity="0.5" strokeWidth="2">
            <line x1="294" y1="170" x2="294" y2="460" />
            <line x1="306" y1="170" x2="306" y2="460" />
            <line x1="1294" y1="170" x2="1294" y2="460" />
            <line x1="1306" y1="170" x2="1306" y2="460" />
          </g>

          <rect x="340" y="196" width="920" height="260" fill="var(--room-wall-2)" />
          <rect x="340" y="196" width="920" height="40" fill="var(--room-velvet-2)" />
          <path d="M340 236 q46 30 92 0 q46 30 92 0 q46 30 92 0 q46 30 92 0 q46 30 92 0 q46 30 92 0 q46 30 92 0 q46 30 92 0 q46 30 92 0 q46 30 92 0" fill="var(--room-velvet-2)" />
          <line x1="340" y1="236" x2="1260" y2="236" stroke="var(--gold)" strokeOpacity="0.6" strokeDasharray="4 8" />
          <rect x="340" y="236" width="180" height="220" fill="url(#fox-curtain)" />
          <rect x="1080" y="236" width="180" height="220" fill="url(#fox-curtain)" />
          <g stroke="var(--room-wall-2)" strokeOpacity="0.55" strokeWidth="3">
            {CURTAIN_FOLDS.map((dx) => (
              <line key={dx} x1={340 + dx} y1="236" x2={330 + dx * 0.95} y2="456" />
            ))}
            {CURTAIN_FOLDS.map((dx) => (
              <line key={dx} x1={1260 - dx} y1="236" x2={1270 - dx * 0.95} y2="456" />
            ))}
          </g>
          <path d="M520 236 q-40 110 -60 220 h60 z" fill="var(--room-velvet)" />
          <path d="M1080 236 q40 110 60 220 h-60 z" fill="var(--room-velvet)" />
          <path d="M460 400 q60 -14 120 0" fill="none" stroke="var(--gold)" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
          <path d="M1020 400 q60 -14 120 0" fill="none" stroke="var(--gold)" strokeWidth="6" strokeLinecap="round" opacity="0.9" />

          <polygon points="700,196 900,196 1000,456 600,456" fill="url(#fox-spot)" />
          <rect x="340" y="440" width="920" height="30" fill="url(#fox-stage)" />
          <line x1="340" y1="440" x2="1260" y2="440" stroke="var(--gold-2)" strokeOpacity="0.5" />
          <ellipse cx="800" cy="450" rx="110" ry="8" fill="var(--room-lamp)" opacity="0.14" filter="url(#fox-blur-s)" />

          <g>
            <line x1="800" y1="340" x2="800" y2="440" stroke="var(--room-metal-2)" strokeWidth="4" />
            <path d="M770 442 h60" stroke="var(--room-metal-2)" strokeWidth="6" strokeLinecap="round" />
            <line x1="800" y1="340" x2="806" y2="312" stroke="var(--room-metal-2)" strokeWidth="4" strokeLinecap="round" />
            <rect x="794" y="282" width="22" height="34" rx="11" fill="var(--room-metal-2)" stroke="var(--gold-2)" strokeOpacity="0.5" />
            <rect x="798" y="286" width="14" height="18" rx="7" fill="none" stroke="var(--gold-2)" strokeOpacity="0.5" strokeDasharray="1 2" />
          </g>

          <rect x="0" y="470" width="1600" height="95" fill="var(--room-wall-2)" />
          <line x1="0" y1="474" x2="1600" y2="474" stroke="var(--room-lamp-warm)" strokeWidth="2" strokeDasharray="2 38" opacity="0.8" />
          {SEAT_ROWS.map((r) => (
            <g key={r.y} fill="var(--room-velvet)" stroke="var(--room-wall-2)">
              {Array.from({ length: Math.floor((r.to - r.from) / r.step) }, (_, i) => (
                <rect key={i} x={r.from + i * r.step} y={r.y} width={r.w} height={r.h} rx={r.w / 3} />
              ))}
            </g>
          ))}
        </g>

        <rect x="0" y="110" width="1600" height="455" fill="url(#fox-glass)" />
        <polygon points="0,110 260,110 90,565 0,565" fill="var(--room-glass)" fillOpacity="0.03" />
        <g stroke="var(--room-metal)" strokeWidth="12">
          <line x1="530" y1="110" x2="530" y2="565" />
          <line x1="1070" y1="110" x2="1070" y2="565" />
        </g>
        <rect x="0" y="100" width="1600" height="14" fill="var(--room-metal-2)" />
        <rect x="0" y="560" width="1600" height="26" fill="var(--room-metal-2)" />
        <line x1="0" y1="560" x2="1600" y2="560" stroke="var(--paper)" strokeOpacity="0.14" strokeWidth="2" />
        <rect y="0" width="1600" height="110" fill="url(#fox-ceiling)" />

        <rect x="0" y="586" width="1600" height="414" fill="url(#fox-desk)" />
        <line x1="0" y1="586" x2="1600" y2="586" stroke="var(--paper)" strokeOpacity="0.08" />
        <rect x="0" y="880" width="1600" height="120" fill="var(--room-floor)" />
        <line x1="0" y1="880" x2="1600" y2="880" stroke="var(--room-metal-2)" strokeWidth="6" />

        <rect x="640" y="606" width="460" height="230" rx="6" fill="url(#fox-metal)" stroke="var(--room-metal-2)" />
        <rect x="652" y="614" width="436" height="40" rx="3" fill="var(--room-wall-2)" />
        <rect x="652" y="614" width="436" height="40" rx="3" fill="none" stroke="var(--paper)" strokeOpacity="0.06" />
        <line x1="650" y1="846" x2="1090" y2="846" stroke="var(--paper)" strokeOpacity="0.06" />

        <rect x="1180" y="596" width="320" height="214" rx="8" fill="url(#fox-metal)" stroke="var(--room-metal-2)" />
        <rect x="1190" y="606" width="300" height="116" rx="4" fill="var(--room-wall-2)" />
        <g fill="none" stroke="var(--room-metal-2)" strokeWidth="2">
          <circle cx="1256" cy="664" r="46" fill="var(--room-metal)" />
          <circle cx="1424" cy="664" r="46" fill="var(--room-metal)" />
          <circle cx="1256" cy="664" r="36" strokeDasharray="4 6" />
          <circle cx="1424" cy="664" r="36" strokeDasharray="4 6" />
          <circle cx="1256" cy="664" r="12" />
          <circle cx="1424" cy="664" r="12" />
        </g>
        <path d="M1256 618 Q1340 612 1424 618" fill="none" stroke="var(--room-leather)" strokeWidth="4" />
        <path d="M1280 702 Q1340 730 1400 702" fill="none" stroke="var(--room-leather)" strokeWidth="4" />
        <g fill="var(--room-wall-2)" stroke="var(--room-metal-2)">
          <rect x="1200" y="736" width="130" height="60" rx="4" />
          <rect x="1350" y="736" width="130" height="60" rx="4" />
        </g>
        <path d="M1216 786 A50 50 0 0 1 1316 786" fill="none" stroke="var(--gold)" strokeOpacity="0.7" strokeWidth="2" strokeDasharray="3 5" />
        <path d="M1366 786 A50 50 0 0 1 1466 786" fill="none" stroke="var(--gold)" strokeOpacity="0.7" strokeWidth="2" strokeDasharray="3 5" />
        <line x1="1266" y1="786" x2="1288" y2="748" stroke="var(--amber)" strokeWidth="2" />
        <line x1="1416" y1="786" x2="1446" y2="752" stroke="var(--amber)" strokeWidth="2" />
        {DESK_LAMPS.map((l) => (
          <circle key={l.x} cx={l.x} cy="828" r="4" fill={l.c} />
        ))}

        <g transform="rotate(-8 1540 760)">
          <rect x="1500" y="640" width="150" height="150" fill="var(--room-canvas)" stroke="var(--room-metal-2)" />
          <circle cx="1575" cy="715" r="62" fill="var(--room-wall-2)" />
          <circle cx="1575" cy="715" r="46" fill="none" stroke="var(--room-metal-2)" strokeDasharray="2 4" />
          <circle cx="1575" cy="715" r="18" fill="var(--amber)" opacity="0.85" />
        </g>

        <rect x="150" y="230" width="460" height="300" rx="8" fill="url(#fox-metal)" stroke="var(--room-metal-2)" />
        <rect x="160" y="240" width="440" height="270" rx="4" fill="var(--room-wall-2)" />
        <rect x="170" y="256" width="420" height="236" fill="var(--room-screen)" />
        <rect x="170" y="256" width="420" height="236" fill="url(#fox-screen-wash)" />
        <rect x="170" y="256" width="420" height="236" fill="none" stroke="var(--paper)" strokeOpacity="0.08" />
        <circle cx="380" cy="518" r="3" fill="var(--amber)" className="club-blink" />
        <rect x="360" y="530" width="40" height="56" fill="var(--room-metal-2)" />
        <polygon points="300,586 460,586 480,604 280,604" fill="var(--room-metal)" />
        <rect x="150" y="200" width="460" height="300" fill="var(--amber)" opacity="0.14" filter="url(#fox-blur-l)" />

        <g transform="rotate(14 560 560)">
          <path d="M520 540 a40 40 0 0 1 80 0" fill="none" stroke="var(--room-leather)" strokeWidth="8" strokeLinecap="round" />
          <rect x="508" y="536" width="20" height="30" rx="8" fill="var(--room-leather-2)" />
          <rect x="592" y="536" width="20" height="30" rx="8" fill="var(--room-leather-2)" />
        </g>

        <polygon points="1100,586 1180,586 1240,900 1020,900" fill="url(#fox-lamp)" />
        <path d="M1130 586 q-20 -70 30 -110" fill="none" stroke="var(--room-metal-2)" strokeWidth="5" strokeLinecap="round" />
        <path d="M1136 480 l44 -14 l10 24 l-44 14 z" fill="var(--room-metal-2)" />
        <ellipse cx="1172" cy="494" rx="14" ry="5" fill="var(--room-lamp-warm)" opacity="0.9" transform="rotate(-18 1172 494)" />
        <ellipse cx="1172" cy="494" rx="26" ry="10" fill="var(--room-lamp-warm)" opacity="0.45" filter="url(#fox-blur-s)" />
        <ellipse cx="870" cy="700" rx="420" ry="120" fill="url(#fox-glow)" opacity="0.5" />

        <g stroke="var(--room-cable)" strokeWidth="5" fill="none" strokeLinecap="round">
          <path d="M700 836 C690 880 640 890 650 950" />
          <path d="M1220 810 C1226 860 1280 870 1300 920" />
        </g>

        <rect width="1600" height="1000" fill="url(#fox-vignette)" />
      </svg>

      <div className="stage__eq" aria-hidden>
        {EQ_BARS.map((h, i) => (
          <i key={i} style={{ ["--h" as string]: h, animationDelay: `${-i * 0.23}s` }} />
        ))}
      </div>
      <RoomConsole keys={keys} screens={screens} label={ROOMS.listen.console} preview={false} />
    </>
  );
}
