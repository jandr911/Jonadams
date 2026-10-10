"use client";

import { useFrame } from "@react-three/fiber";
import { useCity } from "./CityContext";

const PERIOD_SECONDS = 3600;

export const HOLOGRAM_TIME = { value: 0 };

function setHologramTime(seconds: number) {
  HOLOGRAM_TIME.value = seconds;
}

export default function HologramClock() {
  const { reducedMotion } = useCity();
  useFrame(({ clock }) => setHologramTime(reducedMotion ? 0 : clock.elapsedTime % PERIOD_SECONDS), -1);
  return null;
}
