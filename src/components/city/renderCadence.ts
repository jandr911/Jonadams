interface Cadence {
  last: number;
  frames: number;
}

export interface CadenceRate {
  frames: number;
  hz: number;
}

const FRAME_SLACK_SECONDS = 0.004;

// One throttled pass per frame: a pass that finds the frame taken fires on the next one.
const taken = { at: -1 };

export function cadenceDue(c: Cadence, now: number, rate: CadenceRate) {
  c.frames += 1;
  if (c.frames < rate.frames || now - c.last < 1 / rate.hz - FRAME_SLACK_SECONDS || taken.at === now) return false;
  taken.at = now;
  c.frames = 0;
  c.last = now;
  return true;
}
