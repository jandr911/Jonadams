"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const VEHICLES = [
  { kind: "car", color: "#ffb02e", period: 16000, phase: 0, dir: 1 },
  { kind: "car", color: "#49d2f2", period: 21000, phase: 0.45, dir: 1 },
  { kind: "car", color: "#ff4d6d", period: 18000, phase: 0.2, dir: -1 },
  { kind: "bus", color: "#e8e8f2", period: 30000, phase: 0.7, dir: 1 },
] as const;

export default function City() {
  const [isDay, setIsDay] = useState(false);
  const roadRef = useRef<SVGPathElement>(null);
  const vehicleRefs = useRef<(SVGGElement | null)[]>([]);
  const farRef = useRef<SVGGElement>(null);
  const nearRef = useRef<SVGGElement>(null);
  const skyRef = useRef<SVGGElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomingRef = useRef(false);
  const router = useRouter();

  const zoomTo = (
    e: React.MouseEvent,
    target: [number, number, number, number],
    href: string,
  ) => {
    e.preventDefault();
    if (zoomingRef.current) return;
    const svg = svgRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!svg || reduce) {
      router.push(href);
      return;
    }
    zoomingRef.current = true;
    const from = [0, 0, 1600, 900];
    const t0 = performance.now();
    const D = 650;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / D);
      const k = ease(p);
      const vb = from.map((f, i) => f + (target[i] - f) * k);
      svg.setAttribute("viewBox", vb.join(" "));
      if (p < 1) requestAnimationFrame(step);
      else router.push(href);
    };
    requestAnimationFrame(step);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const dy = ((e.clientY - r.top) / r.height - 0.5) * 2;
    skyRef.current?.setAttribute("transform", `translate(${dx * -6},${dy * -3})`);
    farRef.current?.setAttribute("transform", `translate(${dx * -14},${dy * -6})`);
    nearRef.current?.setAttribute("transform", `translate(${dx * -26},${dy * -10})`);
  };

  useEffect(() => {
    const hour = new Date().getHours();
    setIsDay(hour >= 7 && hour < 19);
  }, []);

  useEffect(() => {
    const road = roadRef.current;
    if (!road) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const L = road.getTotalLength();
      VEHICLES.forEach((v, i) => {
        const p = road.getPointAtLength(((i + 1) / (VEHICLES.length + 1)) * L);
        vehicleRefs.current[i]?.setAttribute(
          "transform",
          `translate(${p.x},${p.y - 16})`,
        );
      });
      return;
    }

    const L = road.getTotalLength();
    let raf = 0;

    const frame = (t: number) => {
      VEHICLES.forEach((v, i) => {
        const el = vehicleRefs.current[i];
        if (!el) return;
        let tp = ((t / v.period + v.phase) % 1 + 1) % 1;
        if (v.dir === -1) tp = 1 - tp;
        const d = tp * L;
        const p = road.getPointAtLength(d);
        const ahead = road.getPointAtLength(
          Math.min(Math.max(d + 2 * v.dir, 0), L),
        );
        let angle = (Math.atan2(ahead.y - p.y, ahead.x - p.x) * 180) / Math.PI;
        if (v.dir === -1) angle += 180;
        const flip = v.dir === -1 ? " scale(-1,1)" : "";
        el.setAttribute(
          "transform",
          `translate(${p.x},${p.y - 16}) rotate(${angle})${flip}`,
        );
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const winOpacity = isDay ? 0.3 : 1;
  const sil1 = isDay ? "#4a6cab" : "#1b0d38";
  const sil2 = isDay ? "#5d7fbe" : "#241145";

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Futuristic cartoon Detroit skyline at ${isDay ? "day" : "night"}. Each building sign is a link.`}
      className="block h-full w-full min-h-[70dvh]"
      onPointerMove={onPointerMove}
    >
      <defs>
        <linearGradient id="skyNight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#16082e" />
          <stop offset=".5" stopColor="#3b1360" />
          <stop offset="1" stopColor="#5b1a72" />
        </linearGradient>
        <linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2e7bd6" />
          <stop offset=".65" stopColor="#6fb1ef" />
          <stop offset="1" stopColor="#f2a65e" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="1600" height="900" fill={isDay ? "url(#skyDay)" : "url(#skyNight)"} />

      <g ref={skyRef}>
      {!isDay && (
        <g fill="#fff">
          <circle cx="90" cy="110" r="2" /><circle cx="340" cy="60" r="1.5" />
          <circle cx="620" cy="100" r="2" /><circle cx="900" cy="55" r="1.5" />
          <circle cx="1150" cy="120" r="2" /><circle cx="1420" cy="70" r="1.5" />
          <circle cx="500" cy="170" r="1.5" /><circle cx="1280" cy="170" r="1.5" />
          <circle cx="760" cy="40" r="1.5" /><circle cx="1540" cy="150" r="2" />
        </g>
      )}
      {isDay ? (
        <circle cx="1380" cy="120" r="54" fill="#ffd95e" />
      ) : (
        <circle cx="1380" cy="120" r="42" fill="#f4eed7" />
      )}
      <g className="cloud-a" opacity={isDay ? 0.9 : 0.18} fill={isDay ? "#ffffff" : "#bca6e8"}>
        <ellipse cx="60" cy="150" rx="70" ry="22" />
        <ellipse cx="120" cy="136" rx="52" ry="18" />
        <ellipse cx="10" cy="140" rx="44" ry="16" />
      </g>
      <g className="cloud-b" opacity={isDay ? 0.8 : 0.14} fill={isDay ? "#ffffff" : "#bca6e8"}>
        <ellipse cx="40" cy="250" rx="58" ry="18" />
        <ellipse cx="92" cy="240" rx="42" ry="14" />
      </g>
      </g>

      {/* far silhouettes */}
      <g ref={farRef} fill={sil1}>
        <rect x="0" y="300" width="70" height="600" />
        <rect x="90" y="250" width="55" height="650" />
        <rect x="320" y="280" width="60" height="620" />
        <rect x="430" y="220" width="50" height="680" />
        <rect x="610" y="260" width="70" height="640" />
        <rect x="860" y="230" width="60" height="670" />
        <rect x="990" y="290" width="70" height="610" />
        <rect x="1230" y="240" width="55" height="660" />
        <rect x="1490" y="270" width="70" height="630" />
        <polygon points="755,260 770,160 785,260" />
        <rect x="755" y="260" width="30" height="640" />
      </g>
      <g ref={nearRef} fill={sil2}>
        <rect x="40" y="380" width="90" height="520" />
        <rect x="250" y="360" width="80" height="540" />
        <rect x="480" y="340" width="90" height="560" />
        <rect x="700" y="380" width="80" height="520" />
        <rect x="930" y="350" width="90" height="550" />
        <rect x="1150" y="390" width="90" height="510" />
        <rect x="1400" y="360" width="90" height="540" />
        {/* Ambassador Bridge */}
        <g stroke={isDay ? "#7da0d8" : "#38205e"} fill="none" strokeWidth="8">
          <line x1="30" y1="430" x2="30" y2="560" />
          <line x1="250" y1="430" x2="250" y2="560" />
          <rect x="18" y="430" width="24" height="28" fill={isDay ? "#7da0d8" : "#38205e"} stroke="none" />
          <rect x="238" y="430" width="24" height="28" fill={isDay ? "#7da0d8" : "#38205e"} stroke="none" />
          <line x1="-40" y1="548" x2="320" y2="548" strokeWidth="10" />
          <path d="M-40,470 Q 30,436 140,520 Q 250,436 320,470" strokeWidth="5" />
          <g strokeWidth="3">
            <line x1="70" y1="478" x2="70" y2="548" />
            <line x1="105" y1="500" x2="105" y2="548" />
            <line x1="140" y1="520" x2="140" y2="548" />
            <line x1="175" y1="500" x2="175" y2="548" />
            <line x1="210" y1="478" x2="210" y2="548" />
          </g>
        </g>
      </g>

      {/* blimp */}
      <g className="blimp-drift">
        <ellipse cx="0" cy="0" rx="100" ry="34" fill="#8fa3c8" stroke="#1d1d3f" strokeWidth="4" />
        <polygon points="-100,-8 -138,-24 -138,20 -100,8" fill="#6e82ab" stroke="#1d1d3f" strokeWidth="4" />
        <rect x="-34" y="26" width="68" height="18" rx="7" fill="#1d1d3f" />
        <rect x="-80" y="-13" width="160" height="24" rx="5" fill="#101028" />
        <text x="0" y="4" textAnchor="middle" className="sign" fill="#49f2d6" fontSize="10">
          FLY AWAY WITH ADAMS
        </text>
      </g>

      {/* floating star balloon */}
      <g transform="translate(880,150)">
        <g className="bob">
        <polygon
          points="0,-34 10,-10 36,-10 15,6 23,32 0,16 -23,32 -15,6 -36,-10 -10,-10"
          fill="#ffd95e" stroke="#1d1d3f" strokeWidth="4"
        />
        <rect x="-14" y="-6" width="28" height="9" rx="4" fill="#1d1d3f" />
        <line x1="0" y1="32" x2="0" y2="80" stroke="#1d1d3f" strokeWidth="3" />
        </g>
      </g>

      {/* black spire, far left */}
      <g>
        <polygon points="60,900 120,180 180,900" fill="#15152e" />
        <g stroke="#15152e" strokeWidth="7">
          <line x1="120" y1="180" x2="120" y2="90" />
          <line x1="120" y1="115" x2="85" y2="85" />
          <line x1="120" y1="115" x2="155" y2="85" />
          <line x1="120" y1="150" x2="92" y2="128" />
          <line x1="120" y1="150" x2="148" y2="128" />
        </g>
        <text x="122" y="330" textAnchor="middle" className="sign" fill="#ff4fa3" fontSize="40" filter="url(#glow)">J</text>
        <text x="122" y="390" textAnchor="middle" className="sign" fill="#ff4fa3" fontSize="40" filter="url(#glow)">A</text>
        <circle className="blink" cx="120" cy="86" r="7" fill="#ff4d6d" />
      </g>

      {/* CLUB ADAMS castle tower */}
      {!isDay && (
        <g className="sway" style={{ transformOrigin: "318px 150px" }} opacity="0.1">
          <polygon points="318,150 238,0 398,0" fill="#ffffff" />
        </g>
      )}
      <g stroke="#1d1d3f" strokeWidth="3" fill="none" opacity="0.55">
        <path d="M418,210 Q 590,280 758,252" />
        <path d="M120,200 Q 180,260 236,320" />
        <path d="M1300,360 Q 1352,400 1380,428" />
      </g>
      <Link href="/club" className="hotspot" aria-label="Club Adams" onClick={(e) => zoomTo(e, [140, 100, 480, 270], "/club")}>
        <g className="bld">
          {/* castle base */}
          <path d="M210,900 V560 h18 v-22 h22 v22 h30 v-22 h22 v22 h30 v-22 h22 v22 h30 v-22 h22 v22 h18 V900 Z" fill="#d84a9e" />
          <rect x="238" y="548" width="150" height="90" rx="10" fill="#2a0a33" stroke="#ff4fa3" strokeWidth="4" />
          <text x="313" y="586" textAnchor="middle" fill="#ff8ac2" fontSize="30" fontStyle="italic" fontFamily="cursive" filter="url(#glow)">Club</text>
          <text x="313" y="622" textAnchor="middle" fill="#ff8ac2" fontSize="30" fontStyle="italic" fontFamily="cursive" filter="url(#glow)">Adams</text>
          {/* Renaissance Center cylinder cluster */}
          <rect x="236" y="300" width="36" height="260" rx="18" fill="#b84488" />
          <rect x="364" y="300" width="36" height="260" rx="18" fill="#b84488" />
          <rect x="246" y="306" width="8" height="250" rx="4" fill="#f07cc0" opacity="0.7" />
          <rect x="374" y="306" width="8" height="250" rx="4" fill="#f07cc0" opacity="0.7" />
          <rect x="282" y="208" width="72" height="352" rx="26" fill="#e35aa8" />
          <rect x="294" y="214" width="10" height="340" rx="5" fill="#f07cc0" opacity="0.8" />
          <g stroke="#8a2f63" strokeWidth="4">
            <line x1="284" y1="270" x2="352" y2="270" />
            <line x1="284" y1="320" x2="352" y2="320" />
            <line x1="284" y1="370" x2="352" y2="370" />
            <line x1="284" y1="420" x2="352" y2="420" />
            <line x1="284" y1="470" x2="352" y2="470" />
            <line x1="284" y1="520" x2="352" y2="520" />
          </g>
          <g fill="#ffd95e" opacity={winOpacity}>
            <rect className="win" x="296" y="286" width="12" height="22" />
            <rect className="win" x="322" y="336" width="12" height="22" />
            <rect className="win" x="296" y="386" width="12" height="22" />
            <rect className="win" x="322" y="436" width="12" height="22" />
            <rect className="win" x="296" y="486" width="12" height="22" />
          </g>
          {/* marquee */}
          <rect x="218" y="148" width="200" height="50" rx="8" fill="#101028" stroke="#49f2d6" strokeWidth="3" />
          <text x="318" y="182" textAnchor="middle" className="sign" fill="#49f2d6" fontSize="21" filter="url(#glow)">CLUB ADAMS</text>
          {/* dish mast */}
          <line x1="402" y1="260" x2="452" y2="140" stroke="#1d1d3f" strokeWidth="6" />
          <g className="sway" style={{ transformOrigin: "452px 140px" }}>
            <ellipse cx="454" cy="134" rx="34" ry="22" fill="#f4f4fa" stroke="#1d1d3f" strokeWidth="4" transform="rotate(-30 454 134)" />
            <line x1="454" y1="134" x2="474" y2="106" stroke="#1d1d3f" strokeWidth="4" />
            <circle cx="476" cy="103" r="5" fill="#ff4d6d" />
          </g>
          {/* arrow */}
          <g className="blink2">
            <path d="M470,260 h40 v70 l26,0 -46,58 -46,-58 26,0 Z" fill="none" stroke="#ff4d6d" strokeWidth="6" transform="rotate(14 470 320)" />
          </g>
        </g>
      </Link>

      {/* robot tower (MERCH) */}
      <Link href="/merch" className="hotspot" aria-label="Merch" onClick={(e) => zoomTo(e, [460, 300, 480, 270], "/merch")}>
        <g className="bld">
          <polygon points="700,380 736,398 752,900 720,900" fill="#1f5f78" />
          <polygon points="540,900 560,380 700,380 720,900" fill="#2e86a8" />
          <rect x="566" y="330" width="128" height="50" rx="12" fill="#1f6b8a" />
          <g stroke="#1d1d3f" strokeWidth="6">
            <line x1="630" y1="330" x2="630" y2="252" />
            <line x1="630" y1="276" x2="596" y2="250" />
            <line x1="630" y1="276" x2="664" y2="250" />
          </g>
          {/* porthole fans */}
          <g className="spin" style={{ transformOrigin: "600px 560px" }}>
            <circle cx="600" cy="560" r="26" fill="#49d2f2" stroke="#1d1d3f" strokeWidth="4" />
            <line x1="600" y1="536" x2="600" y2="584" stroke="#1d1d3f" strokeWidth="4" />
            <line x1="576" y1="560" x2="624" y2="560" stroke="#1d1d3f" strokeWidth="4" />
          </g>
          <g className="spin" style={{ transformOrigin: "662px 620px" }}>
            <circle cx="662" cy="620" r="22" fill="#49d2f2" stroke="#1d1d3f" strokeWidth="4" />
            <line x1="662" y1="600" x2="662" y2="640" stroke="#1d1d3f" strokeWidth="4" />
            <line x1="642" y1="620" x2="682" y2="620" stroke="#1d1d3f" strokeWidth="4" />
          </g>
          <g fill="#ff4fa3" opacity={winOpacity}>
            <rect className="win" x="586" y="410" width="34" height="8" rx="4" />
            <rect className="win" x="586" y="428" width="34" height="8" rx="4" />
            <rect className="win" x="586" y="446" width="34" height="8" rx="4" />
          </g>
          <rect x="590" y="452" width="110" height="44" rx="8" fill="#101028" stroke="#ffb02e" strokeWidth="3" transform="rotate(-6 645 474)" />
          <text x="645" y="482" textAnchor="middle" className="sign" fill="#ffb02e" fontSize="20" filter="url(#glow)" transform="rotate(-6 645 474)">MERCH</text>
        </g>
      </Link>

      {/* red LISTEN tower with star mascot */}
      <Link href="/listen" className="hotspot" aria-label="Listen: music" onClick={(e) => zoomTo(e, [660, 110, 480, 270], "/listen")}>
        <g className="bld">
          <line x1="840" y1="230" x2="840" y2="140" stroke="#1d1d3f" strokeWidth="5" />
          <g className="bob">
            <circle cx="840" cy="118" r="34" fill="#8a5a2e" stroke="#1d1d3f" strokeWidth="4" />
            <circle cx="826" cy="104" r="10" fill="#8a5a2e" stroke="#1d1d3f" strokeWidth="4" />
            <circle cx="854" cy="104" r="10" fill="#8a5a2e" stroke="#1d1d3f" strokeWidth="4" />
            <rect x="818" y="112" width="44" height="12" rx="6" fill="#f4f4fa" stroke="#1d1d3f" strokeWidth="3" />
          </g>
          <polygon points="910,252 944,270 944,900 910,900" fill="#9c2420" />
          {/* Fox-style marquee crown */}
          <polygon points="770,230 790,206 810,230 830,206 850,230 870,206 890,230 910,206 922,230" fill="#ffb02e" stroke="#9c2420" strokeWidth="3" />
          <rect x="770" y="230" width="140" height="670" fill="#d43a2f" />
          <polygon points="758,230 922,230 944,252 944,270 922,252 758,252" fill="#7d1b18" />
          <rect x="758" y="230" width="164" height="22" fill="#b52c24" />
          <rect x="790" y="300" width="44" height="236" rx="8" fill="#101028" stroke="#ffb02e" strokeWidth="3" />
          {["L", "I", "S", "T", "E", "N"].map((ch, i) => (
            <text key={ch + i} x="812" y={332 + i * 36} textAnchor="middle" className="sign" fill="#ffb02e" fontSize="22" filter="url(#glow)">{ch}</text>
          ))}
          <g fill="#ffe08a" opacity={winOpacity}>
            <rect className="win" x="856" y="320" width="16" height="22" />
            <rect className="win" x="856" y="370" width="16" height="22" />
            <rect className="win" x="856" y="420" width="16" height="22" />
            <rect className="win" x="856" y="470" width="16" height="22" />
            <rect className="win" x="792" y="580" width="16" height="22" />
            <rect className="win" x="836" y="580" width="16" height="22" />
            <rect className="win" x="880" y="580" width="16" height="22" />
          </g>
        </g>
      </Link>

      {/* THE CREATIVES billboard with rocket */}
      <Link href="/creatives" className="hotspot" aria-label="The Creatives: featured artists and builders" onClick={(e) => zoomTo(e, [840, 340, 420, 236], "/creatives")}>
        <g transform="rotate(-5 1010 470)"><g className="bld">
          <rect x="920" y="410" width="180" height="120" rx="10" fill="#101028" stroke="#9b5cf6" strokeWidth="4" />
          <text x="1010" y="458" textAnchor="middle" className="sign" fill="#c9a6ff" fontSize="22" filter="url(#glow)">THE</text>
          <text x="1010" y="498" textAnchor="middle" className="sign" fill="#c9a6ff" fontSize="22" filter="url(#glow)">CREATIVES</text>
          <g transform="translate(1104,406) rotate(28)">
            <rect x="-8" y="-28" width="16" height="40" rx="8" fill="#f4f4fa" stroke="#1d1d3f" strokeWidth="3" />
            <polygon points="-8,12 8,12 0,30" fill="#ff4d6d" stroke="#1d1d3f" strokeWidth="3" />
            <polygon className="blink" points="-3,30 3,30 0,46" fill="#ffb02e" />
          </g>
        </g></g>
      </Link>

      {/* green WATCH tower */}
      <Link href="/listen#watch" className="hotspot" aria-label="Watch: videos" onClick={(e) => zoomTo(e, [1080, 240, 480, 270], "/listen#watch")}>
        <g className="bld">
          <polygon points="1300,320 1334,340 1334,900 1300,900" fill="#1f5f4b" />
          <polygon points="1150,320 1300,320 1334,340 1184,340" fill="#3da585" />
          <rect x="1150" y="320" width="150" height="580" fill="#2e8a6e" />
          <rect x="1138" y="340" width="174" height="16" fill="#1f6b52" />
          <rect x="1138" y="380" width="174" height="16" fill="#1f6b52" />
          <rect x="1138" y="420" width="174" height="16" fill="#1f6b52" />
          <g fill="#ff4d6d" opacity={winOpacity}>
            <rect className="win" x="1168" y="346" width="30" height="6" rx="3" />
            <rect className="win" x="1218" y="346" width="30" height="6" rx="3" />
            <rect className="win" x="1168" y="386" width="30" height="6" rx="3" />
            <rect className="win" x="1218" y="426" width="30" height="6" rx="3" />
          </g>
          {/* DETROIT water tower */}
          <g>
            <line x1="1166" y1="320" x2="1176" y2="266" stroke="#1d1d3f" strokeWidth="5" />
            <line x1="1224" y1="320" x2="1214" y2="266" stroke="#1d1d3f" strokeWidth="5" />
            <rect x="1152" y="218" width="88" height="52" rx="14" fill="#3a3a58" stroke="#1d1d3f" strokeWidth="4" />
            <polygon points="1176,218 1196,200 1216,218" fill="#1d1d3f" />
            <text x="1196" y="250" textAnchor="middle" className="sign" fill="#49f2d6" fontSize="13" filter="url(#glow)">DETROIT</text>
          </g>
          {/* diamond ornament */}
          <g className="sway" style={{ transformOrigin: "1284px 220px" }}>
            <line x1="1284" y1="320" x2="1284" y2="160" stroke="#1d1d3f" strokeWidth="5" />
            <polygon points="1284,180 1314,220 1284,260 1254,220" fill="none" stroke="#f4f4fa" strokeWidth="4" />
            <line x1="1254" y1="220" x2="1314" y2="220" stroke="#f4f4fa" strokeWidth="3" />
            <line x1="1284" y1="180" x2="1284" y2="260" stroke="#f4f4fa" strokeWidth="3" />
          </g>
          <rect x="1252" y="380" width="40" height="200" rx="8" fill="#101028" stroke="#49f2d6" strokeWidth="3" />
          {["W", "A", "T", "C", "H"].map((ch, i) => (
            <text key={ch + i} x="1272" y={412 + i * 38} textAnchor="middle" className="sign" fill="#49f2d6" fontSize="20" filter="url(#glow)">{ch}</text>
          ))}
          <g fill="#aef3ff" opacity={winOpacity}>
            <rect className="win" x="1176" y="500" width="16" height="20" />
            <rect className="win" x="1176" y="560" width="16" height="20" />
            <rect className="win" x="1210" y="620" width="16" height="20" />
            <rect className="win" x="1176" y="680" width="16" height="20" />
          </g>
        </g>
      </Link>

      {/* right red tower + YOUR AD HERE */}
      <g>
        {/* Michigan Central: arched base + tower */}
        <polygon points="1530,420 1560,438 1560,900 1530,900" fill="#8e2420" />
        <rect x="1340" y="730" width="230" height="170" fill="#a8372b" />
        <g fill="#2a0a1a" opacity={isDay ? 0.5 : 0.9}>
          <path d="M1358,900 v-90 a26,26 0 0 1 52,0 v90 Z" />
          <path d="M1428,900 v-90 a26,26 0 0 1 52,0 v90 Z" />
          <path d="M1498,900 v-90 a26,26 0 0 1 52,0 v90 Z" />
        </g>
        <rect x="1380" y="420" width="150" height="480" fill="#c0392b" />
        <rect x="1368" y="400" width="174" height="24" fill="#8e2420" />
        <g fill="#ffe08a" opacity={winOpacity}>
          <rect className="win" x="1400" y="450" width="18" height="24" />
          <rect className="win" x="1444" y="450" width="18" height="24" />
          <rect className="win" x="1488" y="450" width="18" height="24" />
          <rect className="win" x="1400" y="500" width="18" height="24" />
          <rect className="win" x="1488" y="500" width="18" height="24" />
        </g>
        <g transform="rotate(-8 1448 640)">
          <rect x="1368" y="590" width="160" height="100" rx="12" fill="#e84f9e" stroke="#9dff57" strokeWidth="4" />
          <text x="1440" y="632" textAnchor="middle" className="sign" fill="#fff" fontSize="20">YOUR</text>
          <text x="1440" y="664" textAnchor="middle" className="sign" fill="#fff" fontSize="20">AD HERE</text>
          {/* little robot mascot */}
          <g transform="translate(1544,600)">
            <g className="bob">
            <circle cx="0" cy="-14" r="14" fill="#ff8ac2" stroke="#1d1d3f" strokeWidth="3" />
            <line x1="0" y1="-28" x2="0" y2="-38" stroke="#1d1d3f" strokeWidth="3" />
            <circle cx="0" cy="-40" r="4" fill="#49f2d6" />
            <rect x="-10" y="0" width="20" height="24" rx="6" fill="#ff8ac2" stroke="#1d1d3f" strokeWidth="3" />
            <line x1="-10" y1="8" x2="-30" y2="-2" stroke="#1d1d3f" strokeWidth="4" />
            </g>
          </g>
        </g>
      </g>

      {/* winding elevated road */}
      <g>
        {/* segmented tube supports */}
        {[
          { x: 180, y: 652 },
          { x: 540, y: 702 },
          { x: 900, y: 648 },
          { x: 1260, y: 700 },
        ].map((s, i) => (
          <g key={i}>
            {[0, 1, 2, 3, 4, 5, 6].map((k) => (
              <circle key={k} cx={s.x} cy={s.y + 24 + k * 38} r="17" fill="#3a3a58" stroke="#23233f" strokeWidth="4" />
            ))}
          </g>
        ))}
        <path
          ref={roadRef}
          d="M-60,640 C 200,598 340,724 560,702 C 780,680 820,556 1040,598 C 1240,636 1340,760 1660,718"
          fill="none" stroke="#4a4a5e" strokeWidth="46"
        />
        <path
          d="M-60,640 C 200,598 340,724 560,702 C 780,680 820,556 1040,598 C 1240,636 1340,760 1660,718"
          fill="none" stroke="#6b6b8a" strokeWidth="46" strokeDasharray="2 940" opacity="0"
        />
        <path
          d="M-60,628 C 200,586 340,712 560,690 C 780,668 820,544 1040,586 C 1240,624 1340,748 1660,706"
          fill="none" stroke="#8c8cb0" strokeWidth="5"
        />
        <path
          d="M-60,640 C 200,598 340,724 560,702 C 780,680 820,556 1040,598 C 1240,636 1340,760 1660,718"
          fill="none" stroke="#c9c9e0" strokeWidth="4" strokeDasharray="26 22"
        />
      </g>

      {/* vehicles */}
      {VEHICLES.map((v, i) => (
        <g
          key={i}
          ref={(el) => {
            vehicleRefs.current[i] = el;
          }}
        >
          {v.kind === "bus" ? (
            <g>
              <rect x="-42" y="-22" width="84" height="26" rx="9" fill={v.color} stroke="#1d1d3f" strokeWidth="4" />
              <rect x="-32" y="-16" width="16" height="11" rx="3" fill="#49d2f2" />
              <rect x="-8" y="-16" width="16" height="11" rx="3" fill="#49d2f2" />
              <rect x="16" y="-16" width="16" height="11" rx="3" fill="#49d2f2" />
              <circle cx="-24" cy="6" r="8" fill="#1d1d3f" />
              <circle cx="24" cy="6" r="8" fill="#1d1d3f" />
            </g>
          ) : (
            <g>
              <rect x="-30" y="-16" width="60" height="16" rx="7" fill={v.color} stroke="#1d1d3f" strokeWidth="3" />
              <rect x="-16" y="-26" width="32" height="13" rx="6" fill="#1d1d3f" />
              <circle cx="-16" cy="2" r="7" fill="#1d1d3f" />
              <circle cx="16" cy="2" r="7" fill="#1d1d3f" />
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}
