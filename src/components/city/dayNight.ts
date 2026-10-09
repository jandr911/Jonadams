import { Color } from "three";

export type TimePreset = "auto" | "day" | "dusk" | "night";

export interface DayNight {
  hour: number;
  night: number;
  sunDir: [number, number, number];
  sky: {
    zenith: Color;
    horizon: Color;
    ground: Color;
  };
  fog: Color;
  sunColor: Color;
  sunIntensity: number;
  ambient: number;
  hemiSky: Color;
  hemiGround: Color;
  bloom: number;
  starAlpha: number;
}

const DAY = {
  zenith: new Color("#6e7d8e"),
  horizon: new Color("#b9bfc6"),
  ground: new Color("#aaa8a4"),
  fog: new Color("#b4b9bf"),
  sun: new Color("#ecebe6"),
  hemiSky: new Color("#b3b8bd"),
  hemiGround: new Color("#4a4745"),
};

const DUSK = {
  zenith: new Color("#1c2a6a"),
  horizon: new Color("#ff8a3a"),
  ground: new Color("#ffb347"),
  fog: new Color("#7a4a5e"),
  sun: new Color("#ffa05c"),
  hemiSky: new Color("#6a5aa8"),
  hemiGround: new Color("#2b1a3a"),
};

const NIGHT = {
  zenith: new Color("#04071c"),
  horizon: new Color("#17295f"),
  ground: new Color("#2a3a7a"),
  fog: new Color("#101a40"),
  sun: new Color("#b9c8ff"),
  hemiSky: new Color("#1e2c62"),
  hemiGround: new Color("#070a1a"),
};

function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function presetHour(preset: TimePreset, now = new Date()): number {
  switch (preset) {
    case "day":
      return 13;
    case "dusk":
      return 19.4;
    case "night":
      return 23;
    default:
      return now.getHours() + now.getMinutes() / 60;
  }
}

export function computeDayNight(hour: number): DayNight {
  const dayAmount = smooth(6, 8, hour) * (1 - smooth(18, 20.5, hour));
  const duskAmount =
    smooth(5, 6.5, hour) * (1 - smooth(6.5, 8, hour)) +
    smooth(18, 19.5, hour) * (1 - smooth(19.5, 21, hour));
  const night = 1 - dayAmount;

  const sunAngle = ((hour - 6) / 12) * Math.PI;
  const sunElev = Math.sin(sunAngle);
  const sunDir: [number, number, number] =
    dayAmount > 0.02
      ? [Math.cos(sunAngle) * 0.9, Math.max(0.12, sunElev), -0.35]
      : [0.55, 0.75, -0.3];

  const mix3 = (k: keyof typeof DAY) =>
    new Color()
      .copy(NIGHT[k])
      .lerp(DAY[k], dayAmount)
      .lerp(DUSK[k], duskAmount * 0.85);

  return {
    hour,
    night,
    sunDir,
    sky: { zenith: mix3("zenith"), horizon: mix3("horizon"), ground: mix3("ground") },
    fog: mix3("fog"),
    sunColor: mix3("sun"),
    sunIntensity: 0.25 + dayAmount * 1.15,
    ambient: 0.3 + dayAmount * 0.55,
    hemiSky: mix3("hemiSky"),
    hemiGround: mix3("hemiGround"),
    bloom: 0.3 + night * 0.5,
    starAlpha: smooth(0.55, 1, night),
  };
}

export function labelFor(hour: number) {
  if (hour >= 6 && hour < 8) return "SUNRISE";
  if (hour >= 8 && hour < 18) return "DAYTIME";
  if (hour >= 18 && hour < 21) return "DUSK";
  return "NIGHT";
}
