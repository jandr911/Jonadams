"use client";

import { useState, useSyncExternalStore } from "react";
import { CITY_HUD } from "@/content/site";
import { clockSnapshot, readClock, subscribeMinute } from "../city/clock";
import { labelFor, phaseFor, presetHour, type TimePreset } from "../city/dayNight";

const PRESETS: TimePreset[] = ["auto", "day", "dusk", "night"];

function serverClockSnapshot() {
  return "auto|23.00";
}

export default function StageShell({ room, children }: { room: string; children: React.ReactNode }) {
  const clock = useSyncExternalStore(subscribeMinute, clockSnapshot, serverClockSnapshot);
  const { preset: urlPreset, hour: autoHour } = readClock(clock);
  const [override, setOverride] = useState<TimePreset | null>(null);
  const preset = override ?? urlPreset;
  const hour = preset === "auto" ? autoHour : presetHour(preset);
  const phase = phaseFor(hour);
  const mode = preset === "auto" ? CITY_HUD.localTime : CITY_HUD.preview;
  const cycle = () => setOverride((o) => PRESETS[(PRESETS.indexOf(o ?? urlPreset) + 1) % PRESETS.length]);

  return (
    <section className="stage" data-room={room} data-phase={phase} data-phase-anim={override !== null || undefined}>
      {children}
      <button type="button" className="city-pill stage__phase" onClick={cycle} aria-label={CITY_HUD.changeTime(mode, labelFor(hour))}>
        <span className="city-pill__dot" data-night={phase === "night"} />
        <span className="stage__phase-mode">{mode}</span>
        <small>{labelFor(hour)}</small>
      </button>
    </section>
  );
}
