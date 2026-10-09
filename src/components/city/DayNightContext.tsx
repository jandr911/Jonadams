"use client";

import { createContext, useContext } from "react";
import { computeDayNight, type DayNight } from "./dayNight";

export const DayNightContext = createContext<DayNight>(computeDayNight(23));

export function useDayNight() {
  return useContext(DayNightContext);
}
