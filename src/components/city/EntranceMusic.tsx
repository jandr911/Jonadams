"use client";

import { useEffect, useRef, useState } from "react";
import { MUSIC } from "@/content/site";

const STOPPED_KEY = "adams:music-stopped";
const VOLUME = 0.6;
const FADE_MS = 1600;
const GESTURES = ["pointerdown", "keydown", "touchend"] as const;

type Status = "waiting" | "playing" | "stopped" | "unavailable";

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

type PlayResult = "playing" | "blocked" | "interrupted" | "failed";

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
  audio.volume = 0;
  try {
    await audio.play();
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotAllowedError") return "blocked";
    if (err instanceof DOMException && err.name === "AbortError") return "interrupted";
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
        if (result === "blocked" || result === "interrupted" || !alive) return;
        disarm();
        if (result === "playing") setStatus("playing");
        if (result === "failed") setStatus("unavailable");
      });
    };
    void tryPlay(a).then((result) => {
      if (!alive) return;
      if (result === "playing") setStatus("playing");
      if (result === "failed") setStatus("unavailable");
      if (result !== "blocked" && result !== "interrupted") return;
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
      if (result === "failed") setStatus("unavailable");
    });
  };

  if (status === "unavailable") return null;

  const playing = status === "playing";
  return (
    <>
      <audio
        ref={audio}
        src={MUSIC.src}
        loop
        preload={status === "stopped" ? "none" : "auto"}
        onPlay={() => setStatus("playing")}
        onPause={() => setStatus((s) => (s === "stopped" ? s : "waiting"))}
        onError={() => {
          disarmGestures.current();
          setStatus("unavailable");
        }}
      />
      <button type="button" className="city-pill city-music" onClick={toggle}>
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
