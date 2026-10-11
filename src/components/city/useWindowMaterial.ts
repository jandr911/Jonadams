"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { useDayNight } from "./DayNightContext";
import {
  WINDOW_TIME,
  applyDayNight,
  createWindowMaterial,
  type WindowMaterialOptions,
} from "./windowMaterial";

function setWindowTime(seconds: number) {
  WINDOW_TIME.value = seconds;
}

export function WindowClock() {
  useFrame(({ clock }) => setWindowTime(clock.elapsedTime));
  return null;
}

export function useWindowMaterial(opts: WindowMaterialOptions = {}) {
  const dn = useDayNight();
  const [mat] = useState(() => createWindowMaterial(opts));
  useEffect(() => {
    applyDayNight(mat, dn);
  }, [mat, dn]);
  useEffect(() => () => mat.dispose(), [mat]);
  return mat;
}
