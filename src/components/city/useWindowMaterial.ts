"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { useDayNight } from "./DayNightContext";
import {
  applyDayNight,
  createWindowMaterial,
  tickWindowMaterial,
  type WindowMaterialOptions,
} from "./windowMaterial";

export function useWindowMaterial(opts: WindowMaterialOptions = {}) {
  const dn = useDayNight();
  const [mat] = useState(() => createWindowMaterial(opts));
  useEffect(() => {
    applyDayNight(mat, dn);
  }, [mat, dn]);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame(({ clock }) => {
    tickWindowMaterial(mat, clock.elapsedTime);
  });
  return mat;
}
