"use client";

import { useFrame } from "@react-three/fiber";
import { useCity } from "./CityContext";

// Spin (0.5, 0.6), bob (2.2) and flicker (23) rates all complete whole cycles in this period, so the wrap is seamless.
const PERIOD_SECONDS = 1140 * Math.PI;

export const HOLOGRAM_TIME = { value: 0 };

function setHologramTime(seconds: number) {
  HOLOGRAM_TIME.value = seconds;
}

export default function HologramClock() {
  const { reducedMotion } = useCity();
  useFrame(({ clock }) => setHologramTime(reducedMotion ? 0 : clock.elapsedTime % PERIOD_SECONDS), -1);
  return null;
}
