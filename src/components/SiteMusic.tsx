"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useCopy } from "@/content/CopyProvider";

const STOPPED_KEY = "adams:music-stopped";
const VOLUME = 0.6;
const FADE_MS = 1600;
const GESTURES = ["pointerdown", "keydown", "touchend"] as const;
const OWN_CONTROLS = ".city-music, .yt-facade";

export type MusicStatus = "pending" | "blocked" | "paused" | "playing" | "stopped" | "unavailable";

type PlayResult = "playing" | "blocked" | "interrupted" | "failed";

function readStopped() {
  try {
    return sessionStorage.getItem(STOPPED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStopped(stopped: boolean) {
  try {
    if (stopped) sessionStorage.setItem(STOPPED_KEY, "1");
    else sessionStorage.removeItem(STOPPED_KEY);
  } catch {
    return;
  }
}

let audio: HTMLAudioElement | null = null;
let status: MusicStatus | null = null;
let fade: ReturnType<typeof setInterval> | undefined;
let disarmGestures = () => {};
const listeners = new Set<() => void>();

function setStatus(next: MusicStatus) {
  if (status === next) return;
  status = next;
  for (const notify of listeners) notify();
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

function snapshot(): MusicStatus {
  return (status ??= readStopped() ? "stopped" : "pending");
}

function serverSnapshot(): MusicStatus {
  return "pending";
}

export function useMusicStatus() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

function stopFade() {
  clearInterval(fade);
  fade = undefined;
}

function fadeIn(a: HTMLAudioElement) {
  stopFade();
  a.volume = 0;
  const start = performance.now();
  fade = setInterval(() => {
    const t = Math.min(1, (performance.now() - start) / FADE_MS);
    a.volume = VOLUME * t;
    if (t >= 1) stopFade();
  }, 50);
}

function silence() {
  stopFade();
  audio?.pause();
}

async function tryPlay(): Promise<PlayResult> {
  const a = audio;
  if (!a) return "failed";
  if (!a.paused) return "playing";
  a.volume = 0;
  try {
    await a.play();
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotAllowedError") return "blocked";
    if (err instanceof DOMException && err.name === "AbortError") return "interrupted";
    console.error("Site music could not play", err);
    return "failed";
  }
  fadeIn(a);
  return "playing";
}

function settle(result: PlayResult) {
  if (result === "playing") setStatus("playing");
  else if (result === "failed") setStatus("unavailable");
  else if (result === "blocked") setStatus("blocked");
}

export function startMusic() {
  disarmGestures();
  writeStopped(false);
  void tryPlay().then(settle);
}

export function stopMusic() {
  disarmGestures();
  silence();
  writeStopped(true);
  setStatus("stopped");
}

export function pauseMusic() {
  disarmGestures();
  if (status === "stopped" || status === "unavailable") return;
  silence();
  setStatus("paused");
}

export function MusicToggle() {
  const { MUSIC, CITY_HUD } = useCopy();
  const current = useMusicStatus();
  if (!MUSIC.src || current === "unavailable") return null;
  const playing = current === "playing";
  return (
    <button type="button" className="city-pill city-music" onClick={playing ? stopMusic : startMusic}>
      <span className="city-music__bars" data-on={playing} aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <span>{playing ? CITY_HUD.stopMusic : CITY_HUD.playMusic}</span>
      {MUSIC.title && <small>{MUSIC.title}</small>}
    </button>
  );
}

export default function SiteMusic() {
  const { MUSIC } = useCopy();
  const ref = useRef<HTMLAudioElement>(null);
  const current = useMusicStatus();

  useEffect(() => {
    audio = ref.current;
    let alive = true;
    let armed = false;
    const onGesture = (e: Event) => {
      if (e.target instanceof Element && e.target.closest(OWN_CONTROLS)) return;
      void tryPlay().then((result) => {
        if (!alive || result === "blocked" || result === "interrupted") return;
        disarmGestures();
        settle(result);
      });
    };
    disarmGestures = () => {
      if (!armed) return;
      armed = false;
      for (const g of GESTURES) window.removeEventListener(g, onGesture);
    };
    if (snapshot() !== "stopped") {
      void tryPlay().then((result) => {
        if (!alive) return;
        settle(result);
        if (result !== "blocked") return;
        armed = true;
        for (const g of GESTURES) window.addEventListener(g, onGesture);
      });
    }
    return () => {
      alive = false;
      disarmGestures();
      silence();
      audio = null;
    };
  }, []);

  return (
    <audio
      ref={ref}
      src={MUSIC.src}
      loop
      preload={current === "stopped" ? "none" : "metadata"}
      onPlay={() => setStatus("playing")}
      onPause={() => {
        if (status !== "stopped") setStatus("paused");
      }}
      onError={() => {
        disarmGestures();
        setStatus("unavailable");
      }}
    />
  );
}
