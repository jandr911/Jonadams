"use client";

import { useState, useSyncExternalStore } from "react";
import { fill } from "@/content/copy";
import { useCopy } from "@/content/CopyProvider";
import { clockSnapshot, phaseFor, presetHour, readClock, subscribeMinute, type TimePreset } from "../city/clock";
import { MusicToggle } from "../SiteMusic";

const PRESETS: TimePreset[] = ["auto", "day", "dusk", "night"];

function serverClockSnapshot() {
  return "auto|23.00";
}

export default function StageShell({ room, children }: { room: string; children: React.ReactNode }) {
  const { CITY_HUD } = useCopy();
  const clock = useSyncExternalStore(subscribeMinute, clockSnapshot, serverClockSnapshot);
  const { preset: urlPreset, hour: autoHour } = readClock(clock);
  const [override, setOverride] = useState<TimePreset | null>(null);
  const preset = override ?? urlPreset;
  const hour = preset === "auto" ? autoHour : presetHour(preset);
  const phase = phaseFor(hour);
  const phaseLabel = CITY_HUD.phases[phase];
  const mode = preset === "auto" ? CITY_HUD.localTime : CITY_HUD.preview;
  const cycle = () => setOverride((o) => PRESETS[(PRESETS.indexOf(o ?? urlPreset) + 1) % PRESETS.length]);

  return (
    <section className="stage" data-room={room} data-phase={phase} data-phase-anim={override !== null || undefined}>
      {children}
      <div className="stage__controls">
        <button type="button" className="city-pill" onClick={cycle} aria-label={fill(CITY_HUD.changeTime, { mode, phase: phaseLabel })}>
          <span className="city-pill__dot" data-night={phase === "night"} />
          <span className="stage__phase-mode">{mode}</span>
          <small>{phaseLabel}</small>
        </button>
        <MusicToggle />
      </div>
    </section>
  );
}
