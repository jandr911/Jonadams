export const RENDER_CADENCE = { smooth: false };

export interface Cadence {
  last: number;
  frames: number;
}

export interface CadenceRate {
  frames: number;
  hz: number;
}

const FRAME_SLACK_SECONDS = 0.004;

export function cadenceDue(c: Cadence, now: number, normal: CadenceRate, smooth: CadenceRate) {
  c.frames += 1;
  const rate = RENDER_CADENCE.smooth ? smooth : normal;
  if (c.frames < rate.frames || now - c.last < 1 / rate.hz - FRAME_SLACK_SECONDS) return false;
  c.frames = 0;
  c.last = now;
  return true;
}
