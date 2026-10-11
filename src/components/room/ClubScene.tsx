import { Fragment } from "react";
import { EQ_BARS, ROOM_NAV } from "@/content/site";
import RoomConsole from "./RoomConsole";
import WallGlyph from "./WallGlyph";

export interface ClubWall {
  district: string;
  href: string;
  accent: string;
  index: string;
  label: string;
  note: string;
}

const GLASS = "90,185 900,230 900,590 90,645";

const WINDSOR = [
  { x: 300, w: 22, h: 14 },
  { x: 340, w: 36, h: 20 },
  { x: 410, w: 18, h: 26 },
  { x: 470, w: 26, h: 18 },
  { x: 506, w: 20, h: 38 },
  { x: 548, w: 32, h: 74 },
  { x: 584, w: 24, h: 60 },
  { x: 624, w: 18, h: 46 },
  { x: 660, w: 42, h: 28 },
  { x: 718, w: 16, h: 54 },
  { x: 752, w: 58, h: 20 },
  { x: 826, w: 20, h: 40 },
  { x: 862, w: 38, h: 16 },
];

const STREAKS = [
  [314, 3, 70],
  [422, 4, 90],
  [516, 4, 110],
  [566, 6, 150],
  [596, 4, 120],
  [634, 3, 100],
  [726, 4, 112],
  [836, 4, 96],
  [192, 3, 80],
  [392, 3, 80],
];

const HANGERS = [
  [215, 323],
  [240, 350],
  [265, 367],
  [290, 372],
  [315, 367],
  [340, 350],
  [365, 323],
];

const PANEL_LAMPS = [
  { x: 1032, c: "var(--cyan)", d: "0s" },
  { x: 1052, c: "var(--amber)", d: "-0.9s" },
  { x: 1072, c: "var(--pink)", d: "-1.7s" },
];

const DIM_LAMPS = [1330, 1350, 1370, 1390, 1410, 1430, 1450, 1470];

export default function ClubScene({ walls }: { walls: ClubWall[] }) {
  const keys = walls.map((w) => ({ id: w.district, index: w.index, label: w.label, accent: w.accent, href: w.href }));
  const screens = walls.map((w) => (
    <Fragment key={w.district}>
      <span className="stage__screen-index">{w.index}</span>
      <WallGlyph district={w.district} className="stage__screen-glyph" />
      <span className="stage__screen-label">{w.label}</span>
      <span className="stage__screen-note">{w.note}</span>
    </Fragment>
  ));
  return (
    <>
      <svg className="stage__art" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
        <defs>
          <linearGradient id="club-sky" gradientUnits="userSpaceOnUse" x1="0" y1="185" x2="0" y2="430">
            <stop offset="0" stopColor="var(--room-sky)" />
            <stop offset="0.72" stopColor="var(--room-sky)" />
            <stop offset="1" stopColor="var(--room-sky-2)" />
          </linearGradient>
          <linearGradient id="club-water" gradientUnits="userSpaceOnUse" x1="0" y1="420" x2="0" y2="645">
            <stop offset="0" stopColor="var(--room-sky-2)" />
            <stop offset="0.35" stopColor="var(--room-water)" />
            <stop offset="1" stopColor="var(--room-water)" />
          </linearGradient>
          <linearGradient id="club-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-wall-2)" />
            <stop offset="0.4" stopColor="var(--room-wall)" />
            <stop offset="1" stopColor="var(--room-wall-2)" />
          </linearGradient>
          <linearGradient id="club-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--ink)" stopOpacity="0.8" />
            <stop offset="0.45" stopColor="var(--ink)" stopOpacity="0.15" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="club-floor" gradientUnits="userSpaceOnUse" x1="0" y1="700" x2="0" y2="1000">
            <stop offset="0" stopColor="var(--room-floor-2)" />
            <stop offset="1" stopColor="var(--room-floor)" />
          </linearGradient>
          <linearGradient id="club-refl-cool" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-glass)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--room-glass)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="club-refl-pink" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--pink)" stopOpacity="0.32" />
            <stop offset="1" stopColor="var(--pink)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="club-streak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-shore)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--room-shore)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="club-streak-pink" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--pink)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--pink)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="club-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-lamp)" stopOpacity="0.14" />
            <stop offset="1" stopColor="var(--room-lamp)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="club-ceiling" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--ink)" stopOpacity="0.85" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="club-leather" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--room-leather-2)" />
            <stop offset="1" stopColor="var(--room-leather)" />
          </linearGradient>
          <linearGradient id="club-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-metal-2)" />
            <stop offset="1" stopColor="var(--room-metal)" />
          </linearGradient>
          <radialGradient id="club-screen-wash" cx="0.25" cy="1" r="0.95">
            <stop offset="0" stopColor="var(--pink)" stopOpacity="0.45" />
            <stop offset="1" stopColor="var(--pink)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="club-glow-pink" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="var(--pink)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--pink)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="club-vignette" cx="0.5" cy="0.45" r="0.72">
            <stop offset="0.5" stopColor="var(--ink)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0.78" />
          </radialGradient>
          <pattern id="club-brick" width="56" height="28" patternUnits="userSpaceOnUse">
            <rect width="56" height="28" fill="var(--room-brick)" />
            <rect x="1" y="1" width="26" height="12" fill="var(--room-brick-2)" />
            <rect x="29" y="1" width="26" height="12" fill="var(--room-brick-2)" />
            <rect x="-13" y="15" width="26" height="12" fill="var(--room-brick-2)" />
            <rect x="15" y="15" width="26" height="12" fill="var(--room-brick-2)" />
            <rect x="43" y="15" width="26" height="12" fill="var(--room-brick-2)" />
          </pattern>
          <pattern id="club-win" width="9" height="11" patternUnits="userSpaceOnUse">
            <rect x="2" y="3" width="3" height="4" fill="var(--room-shore)" />
          </pattern>
          <filter id="club-blur-s" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="club-blur-l" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="24" />
          </filter>
          <clipPath id="club-glass">
            <polygon points={GLASS} />
          </clipPath>
        </defs>

        <rect width="1600" height="1000" fill="var(--room-wall-2)" />
        <rect width="990" height="720" fill="url(#club-wall)" />
        <line x1="0" y1="140" x2="990" y2="140" stroke="var(--room-metal)" strokeOpacity="0.5" />
        <line x1="0" y1="672" x2="990" y2="672" stroke="var(--room-metal)" strokeOpacity="0.5" />

        <g clipPath="url(#club-glass)">
          <rect x="90" y="185" width="810" height="260" fill="url(#club-sky)" />
          <g fill="var(--room-star)" opacity="0.5">
            <circle cx="150" cy="215" r="1" />
            <circle cx="260" cy="240" r="1.2" />
            <circle cx="520" cy="205" r="1" />
            <circle cx="640" cy="250" r="0.9" />
            <circle cx="780" cy="226" r="1.1" />
            <circle cx="860" cy="262" r="0.8" />
          </g>
          <g fill="var(--room-skyline)">
            {WINDSOR.map((b) => (
              <rect key={b.x} x={b.x} y={418 - b.h} width={b.w} height={b.h} />
            ))}
          </g>
          <g fill="url(#club-win)">
            {WINDSOR.map((b, i) => (
              <rect key={b.x} x={b.x + 2} y={420 - b.h} width={b.w - 4} height={b.h - 3} opacity={0.3 + ((i * 7) % 5) * 0.1} />
            ))}
          </g>
          <rect x="553" y="346" width="22" height="3" fill="var(--pink)" opacity="0.85" />
          <rect x="553" y="346" width="22" height="3" fill="var(--pink)" filter="url(#club-blur-s)" opacity="0.7" />
          <line x1="296" y1="420" x2="900" y2="420" stroke="var(--room-shore)" strokeWidth="2.5" strokeDasharray="2 17" opacity="0.9" />

          <g>
            <path d="M 90 398 Q 130 330 190 285 Q 290 459 390 285 Q 450 330 480 398" fill="none" stroke="var(--room-skyline)" strokeWidth="3.5" />
            <path d="M 90 398 Q 130 330 190 285 Q 290 459 390 285 Q 450 330 480 398" fill="none" stroke="var(--room-shore)" strokeWidth="1.8" strokeDasharray="2 9" opacity="0.85" />
            {HANGERS.map(([x, y]) => (
              <line key={x} x1={x} y1={y} x2={x} y2="398" stroke="var(--room-skyline)" strokeWidth="1.2" />
            ))}
            <rect x="90" y="397" width="390" height="7" fill="var(--room-skyline)" />
            <line x1="90" y1="398" x2="480" y2="398" stroke="var(--room-shore)" strokeWidth="1.2" strokeDasharray="2 14" opacity="0.6" />
            <g fill="var(--room-skyline)">
              <rect x="182" y="283" width="5" height="121" />
              <rect x="193" y="283" width="5" height="121" />
              <rect x="182" y="300" width="16" height="4" />
              <rect x="182" y="340" width="16" height="4" />
              <rect x="182" y="380" width="16" height="4" />
              <rect x="382" y="283" width="5" height="121" />
              <rect x="393" y="283" width="5" height="121" />
              <rect x="382" y="300" width="16" height="4" />
              <rect x="382" y="340" width="16" height="4" />
              <rect x="382" y="380" width="16" height="4" />
            </g>
            <circle className="club-blink" cx="190" cy="281" r="2.2" fill="var(--pink)" />
            <circle className="club-blink" cx="390" cy="281" r="2.2" fill="var(--pink)" style={{ animationDelay: "-1.2s" }} />
          </g>

          <rect x="90" y="420" width="810" height="230" fill="url(#club-water)" />
          {STREAKS.map(([x, w, h]) => (
            <rect key={x} x={x} y="428" width={w} height={h} fill="url(#club-streak)" filter="url(#club-blur-s)" />
          ))}
          <rect x="560" y="428" width="8" height="150" fill="url(#club-streak-pink)" filter="url(#club-blur-s)" />
          <g stroke="var(--room-glass)" strokeOpacity="0.1" strokeWidth="1">
            <line x1="90" y1="470" x2="900" y2="470" strokeDasharray="60 30 20 50" />
            <line x1="90" y1="505" x2="900" y2="505" strokeDasharray="30 70 40 20" />
            <line x1="90" y1="548" x2="900" y2="548" strokeDasharray="80 40 10 60" />
            <line x1="90" y1="585" x2="900" y2="585" strokeDasharray="40 60 60 30" />
          </g>

          <rect x="90" y="604" width="810" height="50" fill="var(--room-wall-2)" />
          <line x1="110" y1="612" x2="900" y2="612" stroke="var(--room-lamp)" strokeWidth="3" strokeDasharray="2 44" opacity="0.85" />
          <line x1="110" y1="612" x2="900" y2="612" stroke="var(--room-lamp)" strokeWidth="6" strokeDasharray="2 44" opacity="0.35" filter="url(#club-blur-s)" />
        </g>

        <polygon points={GLASS} fill="var(--room-glass)" fillOpacity="0.05" />
        <polygon points="90,185 420,203 250,645 90,645" fill="var(--room-glass)" fillOpacity="0.035" />
        <g stroke="var(--room-metal)" strokeWidth="9">
          <line x1="360" y1="200" x2="360" y2="627" />
          <line x1="630" y1="215" x2="630" y2="608" />
          <line x1="90" y1="415" x2="900" y2="410" />
        </g>
        <polygon points={GLASS} fill="none" stroke="var(--room-metal-2)" strokeWidth="14" strokeLinejoin="round" />
        <polygon points={GLASS} fill="none" stroke="var(--room-metal)" strokeWidth="4" strokeLinejoin="round" />
        <polygon points="76,652 914,597 924,612 66,668" fill="var(--room-metal-2)" />
        <line x1="76" y1="652" x2="914" y2="597" stroke="var(--paper)" strokeOpacity="0.12" strokeWidth="2" />

        <rect y="0" width="1600" height="150" fill="url(#club-ceiling)" />
        <polygon points="330,0 430,0 560,640 220,640" fill="url(#club-cone)" />
        <ellipse cx="380" cy="2" rx="28" ry="5" fill="var(--room-lamp)" opacity="0.9" />
        <ellipse cx="380" cy="2" rx="40" ry="10" fill="var(--room-lamp)" opacity="0.45" filter="url(#club-blur-s)" />

        <rect x="960" y="0" width="640" height="800" fill="url(#club-brick)" />
        <rect x="960" y="0" width="640" height="800" fill="url(#club-shade)" />
        <polygon points="960,0 994,0 994,800 960,720" fill="var(--ink)" opacity="0.6" />
        <rect x="1540" y="0" width="8" height="132" fill="var(--room-metal)" />
        <rect x="1537" y="60" width="14" height="6" fill="var(--room-metal-2)" />

        <rect x="1000" y="160" width="510" height="270" fill="var(--pink)" opacity="0.22" filter="url(#club-blur-l)" />
        <rect x="990" y="130" width="530" height="640" rx="6" fill="url(#club-metal)" stroke="var(--room-metal-2)" />
        <rect x="998" y="138" width="514" height="624" rx="4" fill="none" stroke="var(--paper)" strokeOpacity="0.05" />
        <rect x="1200" y="106" width="110" height="16" rx="2" fill="var(--pink)" opacity="0.9" />
        <rect x="1200" y="106" width="110" height="16" rx="2" fill="var(--pink)" opacity="0.6" filter="url(#club-blur-s)" />

        <rect x="1000" y="160" width="510" height="270" rx="4" fill="var(--room-wall-2)" />
        <rect x="1010" y="170" width="490" height="250" fill="var(--room-screen)" />
        <rect x="1010" y="170" width="490" height="250" fill="url(#club-screen-wash)" />
        <rect x="1010" y="170" width="490" height="250" fill="none" stroke="var(--paper)" strokeOpacity="0.08" />

        <rect x="1010" y="445" width="235" height="120" fill="var(--room-screen)" />
        <rect x="1265" y="445" width="235" height="120" fill="var(--room-screen)" />
        <g fill="none" stroke="var(--gold)">
          <circle cx="1127" cy="505" r="46" strokeOpacity="0.35" strokeDasharray="2 6" />
          <circle cx="1127" cy="505" r="37" strokeWidth="1.6" />
          <path d="M1102 523 q6 -5 12 0 t12 0 t12 0 t12 0" strokeWidth="1.4" strokeOpacity="0.8" />
        </g>
        <g fill="var(--gold)">
          <rect x="1106" y="500" width="6" height="16" />
          <rect x="1115" y="488" width="6" height="28" />
          <rect x="1124" y="480" width="6" height="36" />
          <rect x="1133" y="492" width="6" height="24" />
          <rect x="1142" y="502" width="6" height="14" />
        </g>
        <circle cx="1127" cy="474" r="1.6" fill="var(--gold-2)" />
        <rect x="1265" y="445" width="235" height="120" fill="none" stroke="var(--paper)" strokeOpacity="0.06" />
        <rect x="1010" y="445" width="235" height="120" fill="none" stroke="var(--paper)" strokeOpacity="0.06" />

        <rect x="1000" y="585" width="510" height="135" rx="4" fill="var(--room-wall-2)" />
        <g fill="var(--room-metal)" stroke="var(--room-metal-2)" opacity="0.6">
          <rect x="1010" y="596" width="238" height="52" rx="4" />
          <rect x="1262" y="596" width="238" height="52" rx="4" />
          <rect x="1010" y="658" width="490" height="52" rx="4" />
        </g>

        {PANEL_LAMPS.map((l) => (
          <g key={l.x}>
            <circle cx={l.x} cy="742" r="7" fill={l.c} opacity="0.35" filter="url(#club-blur-s)" />
            <circle cx={l.x} cy="742" r="3.5" fill={l.c} className="club-blink" style={{ animationDelay: l.d }} />
          </g>
        ))}
        <g stroke="var(--room-metal-2)" strokeWidth="2" strokeDasharray="2 4">
          <line x1="1120" y1="736" x2="1260" y2="736" />
          <line x1="1120" y1="742" x2="1260" y2="742" />
          <line x1="1120" y1="748" x2="1260" y2="748" />
        </g>
        {DIM_LAMPS.map((x, i) => (
          <circle key={x} cx={x} cy="742" r="3" fill={i === 2 || i === 5 ? "var(--gold)" : "var(--room-metal-2)"} />
        ))}

        <polygon points="990,770 1520,770 1542,802 968,802" fill="var(--room-metal-2)" />
        <rect x="968" y="802" width="574" height="16" fill="var(--room-metal)" />
        <line x1="990" y1="770" x2="1520" y2="770" stroke="var(--paper)" strokeOpacity="0.14" />

        <polygon points="0,700 960,700 994,800 1600,800 1600,1000 0,1000" fill="url(#club-floor)" />
        <polyline points="0,700 960,700 994,800 1600,800" fill="none" stroke="var(--room-metal)" strokeOpacity="0.7" strokeWidth="3" />
        <polygon points="100,700 900,700 870,920 150,920" fill="url(#club-refl-cool)" />
        <rect x="1010" y="818" width="490" height="182" fill="url(#club-refl-pink)" />
        <ellipse cx="1250" cy="830" rx="420" ry="80" fill="url(#club-glow-pink)" opacity="0.6" />
        <line x1="0" y1="760" x2="1600" y2="760" stroke="var(--paper)" strokeOpacity="0.04" />
        <line x1="0" y1="905" x2="1600" y2="905" stroke="var(--paper)" strokeOpacity="0.04" />

        <g stroke="var(--room-cable)" strokeWidth="5" fill="none" strokeLinecap="round">
          <path d="M1040 818 C1040 870 990 880 1000 930" />
          <path d="M1480 818 C1485 860 1540 870 1560 910" />
        </g>
        <path d="M1060 818 C1065 860 1020 880 1030 920" stroke="var(--room-metal-2)" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        <ellipse cx="410" cy="884" rx="160" ry="16" fill="var(--ink)" opacity="0.6" filter="url(#club-blur-s)" />
        <g transform="rotate(-7 385 690)">
          <rect x="300" y="592" width="170" height="196" rx="28" fill="url(#club-leather)" />
          <g stroke="var(--room-leather)" strokeWidth="2" strokeOpacity="0.9">
            <line x1="330" y1="630" x2="440" y2="630" />
            <line x1="330" y1="690" x2="440" y2="690" />
            <line x1="385" y1="610" x2="385" y2="770" />
          </g>
          <path d="M466 606 q10 90 -4 176" fill="none" stroke="var(--pink)" strokeWidth="3" strokeOpacity="0.55" strokeLinecap="round" />
          <path d="M306 612 q-6 80 2 160" fill="none" stroke="var(--room-glass)" strokeWidth="2" strokeOpacity="0.3" strokeLinecap="round" />
        </g>
        <rect x="286" y="742" width="250" height="72" rx="24" fill="url(#club-leather)" />
        <line x1="306" y1="754" x2="516" y2="754" stroke="var(--paper)" strokeOpacity="0.06" />
        <rect x="486" y="696" width="72" height="116" rx="16" fill="var(--room-leather)" />
        <path d="M554 704 q6 56 -4 104" fill="none" stroke="var(--pink)" strokeWidth="3" strokeOpacity="0.55" strokeLinecap="round" />
        <path d="M278 812 Q 410 872 548 812" fill="none" stroke="var(--room-wood)" strokeWidth="12" strokeLinecap="round" />
        <g stroke="var(--room-wood)" strokeWidth="10" strokeLinecap="round">
          <line x1="300" y1="818" x2="286" y2="880" />
          <line x1="524" y1="818" x2="540" y2="880" />
        </g>
        <line x1="302" y1="820" x2="290" y2="874" stroke="var(--room-glass)" strokeOpacity="0.2" strokeWidth="2" />

        <ellipse cx="680" cy="866" rx="46" ry="9" fill="var(--ink)" opacity="0.6" filter="url(#club-blur-s)" />
        <rect x="673" y="748" width="14" height="112" fill="var(--room-wood)" />
        <ellipse cx="680" cy="860" rx="40" ry="8" fill="var(--room-wood)" />
        <ellipse cx="680" cy="735" rx="84" ry="20" fill="var(--room-wood)" />
        <ellipse cx="680" cy="731" rx="84" ry="18" fill="var(--room-leather-2)" />
        <ellipse cx="680" cy="731" rx="84" ry="18" fill="none" stroke="var(--paper)" strokeOpacity="0.12" />
        <rect x="626" y="708" width="106" height="26" rx="3" fill="var(--room-metal-2)" />
        <rect x="626" y="708" width="106" height="4" rx="2" fill="var(--paper)" opacity="0.1" />
        <ellipse cx="670" cy="714" rx="34" ry="8" fill="var(--room-wall-2)" stroke="var(--room-metal-2)" />
        <ellipse cx="670" cy="714" rx="26" ry="6" fill="none" stroke="var(--paper)" strokeOpacity="0.1" strokeDasharray="1 3" />
        <ellipse cx="670" cy="714" rx="9" ry="2.6" fill="var(--pink)" opacity="0.85" />
        <circle cx="717" cy="704" r="3.5" fill="var(--room-metal-2)" />
        <line x1="717" y1="704" x2="690" y2="712" stroke="var(--paper)" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
        <g transform="rotate(10 760 830)">
          <rect x="728" y="790" width="64" height="64" rx="2" fill="var(--room-wall)" stroke="var(--room-metal-2)" />
          <circle cx="760" cy="822" r="8" fill="var(--room-wall-2)" />
        </g>
        <g transform="rotate(16 772 836)">
          <rect x="740" y="796" width="64" height="64" rx="2" fill="var(--room-brick-2)" stroke="var(--room-metal-2)" />
          <circle cx="772" cy="828" r="8" fill="var(--room-wall-2)" />
        </g>
        <g transform="rotate(22 784 842)">
          <rect x="752" y="802" width="64" height="64" rx="2" fill="var(--room-metal)" stroke="var(--room-metal-2)" />
          <rect x="760" y="810" width="48" height="48" fill="none" stroke="var(--gold)" strokeOpacity="0.6" />
          <circle cx="784" cy="834" r="8" fill="var(--room-wall-2)" />
        </g>

        <rect width="1600" height="1000" fill="url(#club-vignette)" />
      </svg>

      <div className="stage__glint" aria-hidden />
      <div className="stage__eq" aria-hidden>
        {EQ_BARS.map((h, i) => (
          <i key={i} style={{ ["--h" as string]: h, animationDelay: `${-i * 0.23}s` }} />
        ))}
      </div>
      <RoomConsole keys={keys} screens={screens} label={ROOM_NAV.console} crt />
    </>
  );
}
