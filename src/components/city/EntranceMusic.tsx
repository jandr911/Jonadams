"use client";

import { useEffect, useRef, useState } from "react";
import { MUSIC } from "@/content/site";

const STOPPED_KEY = "adams:music-stopped";
const VOLUME = 0.6;
const FADE_MS = 1600;
const GESTURES = ["pointerdown", "keydown", "touchend"] as const;

type Status = "waiting" | "playing" | "stopped";

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

type PlayResult = "playing" | "blocked" | "failed";

const fades = new WeakMap<HTMLAudioElement, ReturnType<typeof setInterval>>();

function stopFade(audio: HTMLAudioElement) {
  clearInterval(fades.get(audio));
  fades.delete(audio);
}

function fadeIn(audio: HTMLAudioElement) {
  stopFade(audio);
  audio.volume = 0;
  const start = performance.now();
  const id = setInterval(() => {
    const t = Math.min(1, (performance.now() - start) / FADE_MS);
    audio.volume = VOLUME * t;
    if (t >= 1) stopFade(audio);
  }, 50);
  fades.set(audio, id);
}

function silence(audio: HTMLAudioElement) {
  stopFade(audio);
  audio.pause();
}

async function tryPlay(audio: HTMLAudioElement | null): Promise<PlayResult> {
  if (!audio) return "failed";
  if (!audio.paused) return "playing";
  try {
    await audio.play();
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotAllowedError") return "blocked";
    console.error("Entrance music could not play", err);
    return "failed";
  }
  fadeIn(audio);
  return "playing";
}

export default function EntranceMusic() {
  const audio = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<Status>(() => (readStopped() ? "stopped" : "waiting"));
  const disarmGestures = useRef<() => void>(() => {});

  useEffect(() => {
    if (readStopped()) return;
    let alive = true;
    let armed = false;
    const disarm = () => {
      if (!armed) return;
      armed = false;
      for (const g of GESTURES) window.removeEventListener(g, onGesture);
    };
    disarmGestures.current = disarm;
    const a = audio.current;
    const onGesture = (e: Event) => {
      if (e.target instanceof Element && e.target.closest(".city-music")) return;
      void tryPlay(a).then((result) => {
        if (result === "blocked" || !alive) return;
        disarm();
        if (result === "playing") setStatus("playing");
      });
    };
    void tryPlay(a).then((result) => {
      if (!alive) return;
      if (result === "playing") setStatus("playing");
      if (result !== "blocked") return;
      armed = true;
      for (const g of GESTURES) window.addEventListener(g, onGesture);
    });
    return () => {
      alive = false;
      disarm();
      if (a) silence(a);
    };
  }, []);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    disarmGestures.current();
    if (status === "playing") {
      silence(a);
      writeStopped(true);
      setStatus("stopped");
      return;
    }
    writeStopped(false);
    void tryPlay(a).then((result) => {
      if (result === "playing") setStatus("playing");
    });
  };

  const playing = status === "playing";
  return (
    <>
      <audio ref={audio} src={MUSIC.src} loop preload="auto" />
      <button type="button" className="city-pill city-music" onClick={toggle} aria-pressed={playing}>
        <span className="city-music__bars" data-on={playing} aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span>{playing ? "Stop music" : "Play music"}</span>
        {MUSIC.title && <small>{MUSIC.title}</small>}
      </button>
    </>
  );
}
