"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const LATITUDE = 42.33;
const LONGITUDE = -83.05;
const FORECAST_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,weather_code,cloud_cover&temperature_unit=fahrenheit`;
const REFRESH_MS = 15 * 60_000;
const CLOCK_MS = 15_000;
const TIME_ZONE = "America/Detroit";

export type Weather = { kind: "loading" } | { kind: "offline" } | { kind: "ok"; tempF: number; code: number; cloud: number };

export function weatherLabel(code: number) {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

export function useDetroitWeather(): Weather {
  const [weather, setWeather] = useState<Weather>({ kind: "loading" });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(FORECAST_URL);
        if (!res.ok) throw new Error(`weather request failed with ${res.status}`);
        const json = (await res.json()) as { current: { temperature_2m: number; weather_code: number; cloud_cover: number } };
        if (!alive) return;
        setWeather({ kind: "ok", tempF: Math.round(json.current.temperature_2m), code: json.current.weather_code, cloud: json.current.cloud_cover / 100 });
      } catch (err) {
        console.warn("Detroit weather unavailable", err);
        if (alive) setWeather({ kind: "offline" });
      }
    };
    void load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return weather;
}

const timeFormat = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" });
const dateFormat = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short", month: "short", day: "numeric" });

function subscribeClock(cb: () => void) {
  const id = setInterval(cb, CLOCK_MS);
  return () => clearInterval(id);
}
function clockSnapshot() {
  const now = new Date();
  return `${timeFormat.format(now)}|${dateFormat.format(now)}`;
}
function serverClockSnapshot() {
  return "";
}

export function useDetroitClock(): { time: string; date: string } | null {
  const snap = useSyncExternalStore(subscribeClock, clockSnapshot, serverClockSnapshot);
  if (!snap) return null;
  const [time, date] = snap.split("|");
  return { time, date };
}
