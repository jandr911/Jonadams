"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CityContext, HoverContext, type CityApi, type Move, type Quality } from "./CityContext";
import { DayNightContext } from "./DayNightContext";
import { computeDayNight, phaseFor, presetHour, type TimePreset } from "./dayNight";
import { clockSnapshot, readClock, subscribeMinute } from "./clock";
import { useDetroitCloudCover } from "./DetroitWeather";
import StageBoundary from "./StageBoundary";
import { fill } from "@/content/copy";
import { COORDINATES } from "@/content/site";
import { useCopy } from "@/content/CopyProvider";
import { MusicToggle } from "../SiteMusic";
import { DESTINATIONS, LABEL_FADE_MS, indexLabel, type Destination } from "./layout";
import Loader, { markVisited, useReturningVisitor } from "./Loader";

const CityStage = dynamic(() => import("./CityStage"), { ssr: false });

const PRESETS: TimePreset[] = ["auto", "day", "dusk", "night"];

const FADE_AFTER_MS = 700;
const FADE_MS = 450;

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

function NavPad({ held, homeRef }: { held: React.RefObject<Set<Move>>; homeRef: React.RefObject<(() => void) | null> }) {
  const { CITY_HUD } = useCopy();
  const pressed = useRef<Move | null>(null);
  const stop = () => {
    if (pressed.current) held.current.delete(pressed.current);
    pressed.current = null;
  };
  const start = (m: Move) => {
    stop();
    pressed.current = m;
    held.current.add(m);
  };
  const btn = (m: Move, label: string, title: string, cls = "") => (
    <button
      type="button"
      className={`city-pad__btn ${cls}`}
      aria-label={fill(CITY_HUD.padHold, { title })}
      title={title}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
        start(m);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        if ((e.key !== "Enter" && e.key !== " ") || e.repeat) return;
        e.preventDefault();
        start(m);
      }}
      onKeyUp={(e) => {
        if (e.key === "Enter" || e.key === " ") stop();
      }}
      onBlur={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
  return (
    <div className="city-pad" role="group" aria-label={CITY_HUD.padLabel}>
      <div className="city-pad__grid">
        <span />
        {btn("forward", "↑", CITY_HUD.pad.forward)}
        <span />
        {btn("left", "←", CITY_HUD.pad.left)}
        <button type="button" className="city-pad__btn city-pad__btn--home" aria-label={CITY_HUD.pad.home} title={CITY_HUD.pad.home} onClick={() => homeRef.current?.()}>
          ⌂
        </button>
        {btn("right", "→", CITY_HUD.pad.right)}
        <span />
        {btn("back", "↓", CITY_HUD.pad.back)}
        <span />
      </div>
      <div className="city-pad__col">
        {btn("up", "⇡", CITY_HUD.pad.up)}
        {btn("down", "⇣", CITY_HUD.pad.down)}
        {btn("in", "+", CITY_HUD.pad.in)}
        {btn("out", "−", CITY_HUD.pad.out)}
      </div>
    </div>
  );
}

export default function CityCanvas({ active }: { active: boolean }) {
  const { CITY_HUD, CITY_FALLBACK, SITE } = useCopy();
  const router = useRouter();
  const clock = useSyncExternalStore(subscribeMinute, clockSnapshot, serverClockSnapshot);
  const reducedMotion = useSyncExternalStore(subscribeMotion, motionSnapshot, () => false);
  const returning = useReturningVisitor();
  const { preset: urlPreset, hour: autoHour } = readClock(clock);
  const [override, setOverride] = useState<TimePreset | null>(null);
  const preset = override ?? urlPreset;
  const hour = preset === "auto" ? autoHour : presetHour(preset);

  const [hovered, setHoveredState] = useState<Destination | null>(null);
  const [leaving, setLeaving] = useState<readonly string[]>([]);
  const hoveredRef = useRef<Destination | null>(null);
  const [leaveTimers] = useState(() => new Map<string, ReturnType<typeof setTimeout>>());
  const setHovered = useCallback((d: Destination | null) => {
    const previous = hoveredRef.current;
    hoveredRef.current = d;
    setHoveredState(d);
    if (d && leaveTimers.has(d.id)) {
      clearTimeout(leaveTimers.get(d.id));
      leaveTimers.delete(d.id);
      setLeaving((ids) => ids.filter((id) => id !== d.id));
    }
    if (!previous || previous === d) return;
    const id = previous.id;
    clearTimeout(leaveTimers.get(id));
    setLeaving((ids) => (ids.includes(id) ? ids : [...ids, id]));
    leaveTimers.set(
      id,
      setTimeout(() => {
        leaveTimers.delete(id);
        setLeaving((ids) => ids.filter((other) => other !== id));
      }, LABEL_FADE_MS),
    );
  }, [leaveTimers]);
  useEffect(() => () => leaveTimers.forEach(clearTimeout), [leaveTimers]);
  const hover = useMemo(() => ({ hovered, leaving }), [hovered, leaving]);
  const [navigating, setNavigating] = useState(false);
  const [fade, setFade] = useState(false);
  const [quality, setQuality] = useState<Quality>("high");
  const dropQuality = useCallback(() => setQuality("low"), []);
  const [stageUp, setStageUp] = useState(false);
  const [minWait, setMinWait] = useState(false);
  const [entered, setEntered] = useState(false);
  const ready = stageUp && minWait;
  const live = ready && entered;
  const stageReady = useCallback(() => setStageUp(true), []);
  const [curtain, setCurtain] = useState(true);
  const dropCurtain = useCallback(() => setCurtain(false), []);
  const enter = useCallback(() => setEntered(true), []);
  const flyRef = useRef<((d: Destination) => Promise<void>) | null>(null);
  const homeRef = useRef<(() => void) | null>(null);
  const [prevActive, setPrevActive] = useState(active);
  const held = useRef(new Set<Move>());
  const trackRef = useRef<HTMLDivElement>(null);
  const [prefetched] = useState(() => new Set<string>());

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
    const t = setTimeout(() => setMinWait(true), returning ? 0 : 1600);
    return () => clearTimeout(t);
  }, [returning]);

  useEffect(() => {
    if (live) markVisited();
  }, [live]);

  useEffect(() => {
    if (!hovered || prefetched.has(hovered.href)) return;
    prefetched.add(hovered.href);
    router.prefetch(hovered.href);
  }, [hovered, prefetched, router]);

  const cloud = useDetroitCloudCover();
  const dn = useMemo(() => computeDayNight(hour, cloud), [hour, cloud]);

  const flyTo = useCallback(
    async (d: Destination) => {
      if (navigating || SITE.navLocked) return;
      setNavigating(true);
      setHovered(null);
      router.prefetch(d.href);
      const flight = flyRef.current?.(d) ?? Promise.resolve();
      const settle = new Promise<void>((r) => setTimeout(r, reducedMotion ? 0 : FADE_AFTER_MS));
      await Promise.race([flight, settle]);
      setFade(true);
      await new Promise((r) => setTimeout(r, reducedMotion ? 0 : FADE_MS));
      router.push(d.href);
    },
    [navigating, router, reducedMotion, setHovered, SITE.navLocked],
  );

  if (active !== prevActive) {
    setPrevActive(active);
    if (active) {
      setFade(false);
      setNavigating(false);
    }
  }

  useEffect(() => {
    if (active) homeRef.current?.();
  }, [active]);

  const api = useMemo<CityApi>(
    () => ({ setHovered, hoveredRef, navigating, flyTo, flyRef, homeRef, held, quality, reducedMotion, active }),
    [setHovered, navigating, flyTo, quality, reducedMotion, active],
  );

  const pillLabel = preset === "auto" ? CITY_HUD.localTime : CITY_HUD.preview;
  const cyclePreset = () => setOverride(PRESETS[(PRESETS.indexOf(preset) + 1) % PRESETS.length]);

  return (
    <DayNightContext.Provider value={dn}>
      <CityContext.Provider value={api}>
        <HoverContext.Provider value={hover}>
          <div className="city-host" data-active={active} data-curtain={curtain} inert={!active} aria-hidden={!active}>
          <div className={`city-root ${live ? "is-live" : ""}`}>
            <StageBoundary
              name="The 3D city"
              onFail={() => setStageUp(true)}
              fallback={
                <div className="city-fallback">
                  <p>{CITY_FALLBACK}</p>
                </div>
              }
            >
              <CityStage live={live} active={active} quality={quality} onSlow={dropQuality} onReady={stageReady} />
            </StageBoundary>
            <div className="city-frame" aria-hidden>
              <i />
              <i />
              <i />
              <i />
            </div>

            <nav aria-label={CITY_HUD.districtsNav} className="city-hud city-hud--districts">
              <span className="districts__hint">{hovered ? hovered.blurb : fill(SITE.navLocked ? CITY_HUD.lockedHint : CITY_HUD.districtsHint, { count: DESTINATIONS.length })}</span>
              <div className="districts">
                <div ref={trackRef} className="districts__track" role={SITE.navLocked ? "list" : undefined}>
                {DESTINATIONS.map((d, i) => {
                  const style = { ["--c" as string]: d.accent, ["--i" as string]: i };
                  const className = `district ${hovered?.id === d.id ? "is-hot" : ""}`;
                  const preview = {
                    onMouseEnter: () => !navigating && setHovered(d),
                    onMouseLeave: () => setHovered(null),
                  };
                  const label = (
                    <>
                      <span className="district__index">{indexLabel(i)}</span>
                      <span className="district__name">{d.label}</span>
                      <span className="district__sub">{d.sub}</span>
                    </>
                  );
                  if (SITE.navLocked) {
                    return (
                      <div key={d.id} role="listitem" className={className} style={style} {...preview}>
                        {label}
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={d.id}
                      href={d.href}
                      className={className}
                      style={style}
                      {...preview}
                      onFocus={preview.onMouseEnter}
                      onBlur={preview.onMouseLeave}
                      onClick={(e) => {
                        if (reducedMotion) return;
                        e.preventDefault();
                        void flyTo(d);
                      }}
                    >
                      {label}
                    </Link>
                  );
                })}
                </div>
              </div>
            </nav>

            <div className="city-hud city-hud--status">
              <button type="button" className="city-pill" onClick={cyclePreset} aria-label={fill(CITY_HUD.changeTime, { mode: pillLabel, phase: CITY_HUD.phases[phaseFor(hour)] })}>
                <span className="city-pill__dot" data-night={dn.night > 0.5} />
                <span>{pillLabel}</span>
                <small>{CITY_HUD.phases[phaseFor(hour)]}</small>
              </button>
              <MusicToggle />
              <span className="city-geo">{fill(CITY_HUD.geo, { coordinates: COORDINATES })}</span>
              <span className="city-readout">{CITY_HUD.readout}</span>
            </div>

            <div className="city-hud city-hud--pad">
              <span className="city-hint city-hint--mouse">{CITY_HUD.mouseHint}</span>
              <span className="city-hint city-hint--touch">{CITY_HUD.touchHint}</span>
              <span className="city-pad__cue" aria-hidden>
                {CITY_HUD.padCue}
              </span>
              <NavPad held={held} homeRef={homeRef} />
            </div>

            <div className={`city-fade ${fade ? "is-on" : ""}`} aria-hidden />
            <Loader ready={ready} released={entered} onRelease={enter} onGone={dropCurtain} returning={returning} />
          </div>
          </div>
        </HoverContext.Provider>
      </CityContext.Provider>
    </DayNightContext.Provider>
  );
}
