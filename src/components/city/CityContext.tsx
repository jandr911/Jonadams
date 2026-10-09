"use client";

import type { CameraControls } from "@react-three/drei";
import { createContext, useContext, type MutableRefObject } from "react";
import type { Destination } from "./layout";

export interface CityApi {
  hovered: Destination | null;
  setHovered: (d: Destination | null) => void;
  navigating: boolean;
  flyTo: (d: Destination) => void;
  flyRef: MutableRefObject<((d: Destination) => Promise<void>) | null>;
  camRef: MutableRefObject<CameraControls | null>;
  quality: "high" | "low";
  reducedMotion: boolean;
}

export const CityContext = createContext<CityApi | null>(null);

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used inside CityContext");
  return ctx;
}
