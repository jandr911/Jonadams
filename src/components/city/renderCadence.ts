interface Cadence {
  last: number;
  frames: number;
}

export interface CadenceRate {
  frames: number;
  hz: number;
}

const FRAME_SLACK_SECONDS = 0.004;

// One heavy pass per frame. The mirror and the shadow map used to land on the same frame every sixth frame, a 37 ms frame at 1920x1080 on Intel against 31 ms for the mirror alone; a pass that finds the frame taken fires on the next one.
const taken = { at: -1 };

export function cadenceDue(c: Cadence, now: number, rate: CadenceRate) {
  c.frames += 1;
  if (c.frames < rate.frames || now - c.last < 1 / rate.hz - FRAME_SLACK_SECONDS || taken.at === now) return false;
  taken.at = now;
  c.frames = 0;
  c.last = now;
  return true;
}
