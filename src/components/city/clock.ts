import { presetHour, type TimePreset } from "./dayNight";

const LIGHT_STEPS_PER_HOUR = 4;

export function subscribeMinute(cb: () => void) {
  const id = setInterval(cb, 60_000);
  return () => clearInterval(id);
}

export function clockSnapshot() {
  const q = new URLSearchParams(window.location.search).get("time");
  const preset: TimePreset = q === "day" || q === "dusk" || q === "night" ? q : "auto";
  return `${preset}|${(Math.floor(presetHour("auto") * LIGHT_STEPS_PER_HOUR) / LIGHT_STEPS_PER_HOUR).toFixed(2)}`;
}

export function readClock(clock: string) {
  const [preset, hour] = clock.split("|") as [TimePreset, string];
  return { preset, hour: Number(hour) };
}
