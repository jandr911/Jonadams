"use client";

import { useEffect, useState } from "react";

const LATITUDE = 42.33;
const LONGITUDE = -83.05;
const FORECAST_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,weather_code,cloud_cover&temperature_unit=fahrenheit`;
const REFRESH_MS = 15 * 60_000;

type Weather = { kind: "loading" } | { kind: "offline" } | { kind: "ok"; tempF: number; code: number; cloud: number };

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
