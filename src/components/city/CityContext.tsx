"use client";

import { createContext, useContext, type RefObject } from "react";
import type { Destination, RoomPlace } from "./layout";

export type Quality = "high" | "low";

export type Move = "left" | "right" | "forward" | "back" | "up" | "down" | "in" | "out";

export interface CityApi {
  setHovered: (d: RoomPlace | null) => void;
  hoveredRef: RefObject<RoomPlace | null>;
  navigating: boolean;
  flyTo: (d: RoomPlace) => void;
  flyRef: RefObject<((d: Destination) => Promise<void>) | null>;
  homeRef: RefObject<(() => void) | null>;
  held: RefObject<Set<Move>>;
  quality: Quality;
  reducedMotion: boolean;
  active: boolean;
}

export const CityContext = createContext<CityApi | null>(null);

interface HoverState {
  hovered: RoomPlace | null;
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
