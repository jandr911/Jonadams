"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CameraControls } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CityContext, type CityApi } from "./CityContext";
import { DayNightContext } from "./DayNightContext";
import { computeDayNight, labelFor, presetHour, type TimePreset } from "./dayNight";
import { useDetroitClock, useDetroitWeather, weatherLabel } from "./DetroitWeather";
import { DESTINATIONS, homeCamera, type Destination } from "./layout";
import Loader, { markVisited, useReturningVisitor } from "./Loader";

const CityStage = dynamic(() => import("./CityStage"), { ssr: false });

const PRESETS: TimePreset[] = ["auto", "day", "dusk", "night"];
const OVERCAST_DEFAULT = 0.6;
const DISTRICTS_HINT = "Five districts · Hover to preview · Click to fly in";

function subscribeMinute(cb: () => void) {
  const id = setInterval(cb, 60_000);
  return () => clearInterval(id);
}
function clockSnapshot() {
  const q = new URLSearchParams(window.location.search).get("time");
  const preset: TimePreset = q === "day" || q === "dusk" || q === "night" ? q : "auto";
  return `${preset}|${presetHour("auto").toFixed(2)}`;
}
function serverClockSnapshot() {
  return "auto|12.00";
}

function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function motionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Move = "left" | "right" | "forward" | "back" | "up" | "down" | "in" | "out";

function NavPad({ camRef, reducedMotion }: { camRef: React.MutableRefObject<CameraControls | null>; reducedMotion: boolean }) {
  const held = useRef<Move | null>(null);
  const raf = useRef(0);
  const last = useRef(0);
  const stop = useCallback(() => {
    held.current = null;
    cancelAnimationFrame(raf.current);
  }, []);
  const start = useCallback((m: Move) => {
    held.current = m;
    last.current = performance.now();
    const tick = (now: number) => {
      const c = camRef.current;
      const move = held.current;
      if (!c || !move) return;
      const dt = Math.min(0.05, (now - last.current) / 1000);
      last.current = now;
      const step = Math.max(2, c.distance) * 0.32 * dt;
      if (move === "left") c.truck(-step, 0, false);
      if (move === "right") c.truck(step, 0, false);
      if (move === "forward") c.forward(step, false);
      if (move === "back") c.forward(-step, false);
      if (move === "up") c.elevate(step, false);
      if (move === "down") c.elevate(-step, false);
      if (move === "in") c.dolly(step, false);
      if (move === "out") c.dolly(-step, false);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [camRef]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const btn = (m: Move, label: string, title: string, cls = "") => (
    <button
      type="button"
      className={`city-pad__btn ${cls}`}
      aria-label={title}
      title={title}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
        start(m);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
  return (
    <div className="city-pad" aria-label="Camera controls">
      <div className="city-pad__grid">
        <span />
        {btn("forward", "↑", "Move forward (W / ↑)")}
        <span />
        {btn("left", "←", "Move left (A / ←)")}
        <button
          type="button"
          className="city-pad__btn city-pad__btn--home"
          aria-label="Reset view (R)"
          title="Reset view (R)"
          onClick={() => {
            const c = camRef.current;
            if (!c) return;
            const home = homeCamera("aspect" in c.camera ? c.camera.aspect : 1);
            c.setLookAt(...home.position, ...home.target, !reducedMotion);
          }}
        >
          ⌂
        </button>
        {btn("right", "→", "Move right (D / →)")}
        <span />
        {btn("back", "↓", "Move back (S / ↓)")}
        <span />
      </div>
      <div className="city-pad__col">
        {btn("up", "⇡", "Move up (E / PageUp)")}
        {btn("down", "⇣", "Move down (Q / PageDown)")}
        {btn("in", "+", "Zoom in (+)")}
        {btn("out", "−", "Zoom out (−)")}
      </div>
    </div>
  );
}

export default function CityCanvas() {
  const router = useRouter();
  const clock = useSyncExternalStore(subscribeMinute, clockSnapshot, serverClockSnapshot);
  const reducedMotion = useSyncExternalStore(subscribeMotion, motionSnapshot, () => false);
  const returning = useReturningVisitor();
  const [urlPreset, autoHour] = clock.split("|") as [TimePreset, string];
  const [override, setOverride] = useState<TimePreset | null>(null);
  const preset = override ?? urlPreset;
  const hour = preset === "auto" ? Number(autoHour) : presetHour(preset);

  const [hovered, setHovered] = useState<Destination | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [fade, setFade] = useState(false);
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [stageUp, setStageUp] = useState(false);
  const [minWait, setMinWait] = useState(false);
  const ready = stageUp && minWait;
  const flyRef = useRef<((d: Destination) => Promise<void>) | null>(null);
  const camRef = useRef<CameraControls | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const prefetched = useRef(new Set<string>());

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => {
      const overflow = el.scrollWidth - el.clientWidth > 1;
      const atStart = el.scrollLeft <= 1;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      el.dataset.edge = !overflow ? "none" : atStart ? "right" : atEnd ? "left" : "both";
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const child of el.children) ro.observe(child);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMinWait(true), returning ? 0 : 2400);
    return () => clearTimeout(t);
  }, [returning]);

  useEffect(() => {
    if (ready) markVisited();
  }, [ready]);

  useEffect(() => {
    if (!hovered || prefetched.current.has(hovered.href)) return;
    prefetched.current.add(hovered.href);
    router.prefetch(hovered.href);
  }, [hovered, router]);

  const weather = useDetroitWeather();
  const detroit = useDetroitClock();
  const cloud = weather.kind === "ok" ? weather.cloud : OVERCAST_DEFAULT;
  const dn = useMemo(() => computeDayNight(hour, cloud), [hour, cloud]);


  const flyTo = useCallback(
    async (d: Destination) => {
      if (navigating) return;
      setNavigating(true);
      setHovered(null);
      router.prefetch(d.href);
      const flight = flyRef.current?.(d) ?? Promise.resolve();
      const settle = new Promise<void>((r) => setTimeout(r, reducedMotion ? 0 : 1500));
      await Promise.race([flight, settle]);
      setFade(true);
      await new Promise((r) => setTimeout(r, reducedMotion ? 0 : 420));
      router.push(d.href);
    },
    [navigating, router, reducedMotion],
  );

  const api = useMemo<CityApi>(
    () => ({ hovered, setHovered, navigating, flyTo, flyRef, camRef, quality, reducedMotion }),
    [hovered, navigating, flyTo, quality, reducedMotion],
  );

  const cyclePreset = () => setOverride(PRESETS[(PRESETS.indexOf(preset) + 1) % PRESETS.length]);

  return (
    <DayNightContext.Provider value={dn}>
      <CityContext.Provider value={api}>
        <div className={`city-root ${ready ? "is-live" : ""}`}>
          <CityStage onQuality={setQuality} onReady={() => setStageUp(true)} />

          <nav aria-label="City districts" className="city-hud city-hud--districts">
            <span className="districts__hint">{hovered ? hovered.blurb : DISTRICTS_HINT}</span>
            <div className="districts">
              <div ref={trackRef} className="districts__track">
              {DESTINATIONS.map((d, i) => (
              <Link
                key={d.id}
                href={d.href}
                className={`district ${hovered?.id === d.id ? "is-hot" : ""}`}
                style={{ ["--c" as string]: d.color, ["--i" as string]: i }}
                onMouseEnter={() => !navigating && setHovered(d)}
                onMouseLeave={() => setHovered(null)}
                onClick={(e) => {
                  if (reducedMotion) return;
                  e.preventDefault();
                  void flyTo(d);
                }}
              >
                <span className="district__index">{String(i + 1).padStart(2, "0")}</span>
                <span className="district__name">{d.label}</span>
                <span className="district__sub">{d.sub}</span>
              </Link>
              ))}
              </div>
            </div>
          </nav>

          <div className="city-hud city-hud--status">
            <button type="button" className="city-pill" onClick={cyclePreset} aria-label={`Time of day: ${labelFor(hour)}. Click to change.`}>
              <span className="city-pill__dot" data-night={dn.night > 0.5} />
              <span>{preset === "auto" ? "Detroit time" : preset}</span>
              <small>{labelFor(hour)}</small>
            </button>
            {detroit && (
              <div className="city-clock" aria-live="off">
                <span className="city-clock__time">{detroit.time}</span>
                <span className="city-clock__date">{detroit.date} · Detroit</span>
                <span className="city-clock__weather">
                  {weather.kind === "ok" && `${weather.tempF}°F · ${weatherLabel(weather.code)}`}
                  {weather.kind === "loading" && "Reading the sky"}
                  {weather.kind === "offline" && "Weather offline"}
                </span>
              </div>
            )}
            <span className="city-geo">Downtown Detroit · 42.33° N, 83.05° W</span>
          </div>

          <div className="city-hud city-hud--pad">
            <span className="city-hint city-hint--mouse">
              Drag to orbit · Scroll to zoom
              <br />
              Shift-drag or arrows to move · Q/E up and down
            </span>
            <span className="city-hint city-hint--touch">One finger to look · Two fingers to move · Pinch to zoom</span>
            <NavPad camRef={camRef} reducedMotion={reducedMotion} />
          </div>

          <div className={`city-fade ${fade ? "is-on" : ""}`} aria-hidden />
          <Loader ready={ready} returning={returning} />
        </div>
      </CityContext.Provider>
    </DayNightContext.Provider>
  );
}
