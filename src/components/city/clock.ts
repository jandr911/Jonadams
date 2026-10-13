export type TimePreset = "auto" | "day" | "dusk" | "night";

export function presetHour(preset: TimePreset, now?: Date): number {
  switch (preset) {
    case "day":
      return 13;
    case "dusk":
      return 19.4;
    case "night":
      return 23;
    default: {
      const at = now ?? new Date();
      return at.getHours() + at.getMinutes() / 60;
    }
  }
}

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

export type Phase = "sunrise" | "day" | "dusk" | "night";

export function phaseFor(hour: number): Phase {
  if (hour >= 6 && hour < 8) return "sunrise";
  if (hour >= 8 && hour < 18) return "day";
  if (hour >= 18 && hour < 21) return "dusk";
  return "night";
}
