"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { useDayNight } from "./DayNightContext";
import {
  applyDayNight,
  createWindowMaterial,
  tickWindowMaterial,
  type WindowMaterialOptions,
} from "./windowMaterial";

export function useWindowMaterial(opts: WindowMaterialOptions = {}) {
  const dn = useDayNight();
  const mat = useMemo(() => createWindowMaterial(opts), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    applyDayNight(mat, dn);
  }, [mat, dn]);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame(({ clock }) => {
    tickWindowMaterial(mat, clock.elapsedTime);
  });
  return mat;
}
