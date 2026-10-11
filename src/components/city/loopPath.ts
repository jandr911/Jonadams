export interface LoopPose {
  a: number;
  b: number;
  ha: number;
  hb: number;
  leg: 0 | 1 | 2 | 3;
  into: number;
}

export function newLoopPose(): LoopPose {
  return { a: 0, b: 0, ha: 1, hb: 0, leg: 0, into: 0 };
}

export function loopLength(straight: number, radius: number) {
  return 2 * straight + 2 * Math.PI * radius;
}

export function loopPose(distance: number, straight: number, radius: number, out: LoopPose, offset = 0) {
  const turn = Math.PI * radius;
  const total = loopLength(straight, radius);
  let s = ((distance % total) + total) % total;
  const half = straight / 2;
  const r = radius + offset;
  if (s < straight) return setLoop(out, 0, s, s - half, -r, 1, 0);
  s -= straight;
  if (s < turn) {
    const th = s / radius;
    return setLoop(out, 1, s, half + r * Math.sin(th), -r * Math.cos(th), Math.cos(th), Math.sin(th));
  }
  s -= turn;
  if (s < straight) return setLoop(out, 2, s, half - s, r, -1, 0);
  s -= straight;
  const th = s / radius;
  return setLoop(out, 3, s, -half - r * Math.sin(th), r * Math.cos(th), -Math.cos(th), -Math.sin(th));
}

function setLoop(out: LoopPose, leg: LoopPose["leg"], into: number, a: number, b: number, ha: number, hb: number) {
  out.leg = leg;
  out.into = into;
  out.a = a;
  out.b = b;
  out.ha = ha;
  out.hb = hb;
  return out;
}
