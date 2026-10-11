"use client";

import { createContext, useContext, type MutableRefObject } from "react";
import type { Destination } from "./layout";

export type Move = "left" | "right" | "forward" | "back" | "up" | "down" | "in" | "out";

export interface CityApi {
  setHovered: (d: Destination | null) => void;
  hoveredRef: MutableRefObject<Destination | null>;
  navigating: boolean;
  flyTo: (d: Destination) => void;
  flyRef: MutableRefObject<((d: Destination) => Promise<void>) | null>;
  homeRef: MutableRefObject<(() => void) | null>;
  held: MutableRefObject<Set<Move>>;
  quality: "high" | "low";
  reducedMotion: boolean;
}

export const CityContext = createContext<CityApi | null>(null);

export interface HoverState {
  hovered: Destination | null;
  leaving: readonly string[];
}

export const HoverContext = createContext<HoverState>({ hovered: null, leaving: [] });

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used inside CityContext");
  return ctx;
}

export function useHovered() {
  return useContext(HoverContext);
}
