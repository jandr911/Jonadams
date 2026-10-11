"use client";

import { useEffect, useState } from "react";
import { GEO } from "@/content/site";

const FORECAST_URL = `https://api.open-meteo.com/v1/forecast?latitude=${GEO.lat}&longitude=${GEO.lon}&current=cloud_cover`;
const REFRESH_MS = 15 * 60_000;

export function useDetroitCloudCover(): number | undefined {
  const [cloud, setCloud] = useState<number | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(FORECAST_URL);
        if (!res.ok) throw new Error(`weather request failed with ${res.status}`);
        const json = (await res.json()) as { current: { cloud_cover: number } };
        if (!alive) return;
        setCloud(json.current.cloud_cover / 100);
      } catch (err) {
        console.warn("Detroit weather unavailable", err);
        if (alive) setCloud(undefined);
      }
    };
    void load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return cloud;
}
