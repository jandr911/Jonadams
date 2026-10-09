import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { mulberry32 } from "./rng";

function noiseCanvas(size: number, base: [number, number, number], spread: number, seed: number) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const rand = mulberry32(seed);
  for (let i = 0; i < size * size; i++) {
    const n = (rand() - 0.5) * spread;
    img.data[i * 4] = Math.max(0, Math.min(255, base[0] + n));
    img.data[i * 4 + 1] = Math.max(0, Math.min(255, base[1] + n));
    img.data[i * 4 + 2] = Math.max(0, Math.min(255, base[2] + n));
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { c, ctx, rand };
}

function blotches(ctx: CanvasRenderingContext2D, rand: () => number, size: number, count: number, rgb: string, rMin: number, rMax: number, alpha: number) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = rMin + rand() * (rMax - rMin);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},1)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
}

function strokeTiled(ctx: CanvasRenderingContext2D, path: Path2D, size: number) {
  for (const dx of [-size, 0, size]) {
    for (const dy of [-size, 0, size]) {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.stroke(path);
      ctx.restore();
    }
  }
}

function wanderingLine(ctx: CanvasRenderingContext2D, rand: () => number, size: number, steps: number, stepLen: number, width: number, style: string) {
  let x = rand() * size;
  let y = rand() * size;
  let heading = rand() * Math.PI * 2;
  const path = new Path2D();
  path.moveTo(x, y);
  for (let i = 0; i < steps; i++) {
    heading += (rand() - 0.5) * 1.1;
    x += Math.cos(heading) * stepLen;
    y += Math.sin(heading) * stepLen;
    path.lineTo(x, y);
    if (rand() < 0.12) {
      path.lineTo(x + Math.cos(heading + 1.2) * stepLen * 2, y + Math.sin(heading + 1.2) * stepLen * 2);
      path.moveTo(x, y);
    }
  }
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  strokeTiled(ctx, path, size);
}

function patchedAndCracked(ctx: CanvasRenderingContext2D, rand: () => number, size: number, scale: number) {
  for (let i = 0; i < 3 * scale; i++) {
    const w = size * (0.08 + rand() * 0.18);
    const h = size * (0.06 + rand() * 0.14);
    const x = rand() * (size - w);
    const y = rand() * (size - h);
    ctx.fillStyle = rand() < 0.5 ? "rgba(20,19,18,0.32)" : "rgba(92,90,86,0.32)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(14,13,12,0.55)";
    ctx.lineWidth = Math.max(1, size / 256);
    ctx.strokeRect(x, y, w, h);
  }
  for (let i = 0; i < 5 * scale; i++) wanderingLine(ctx, rand, size, 10 + Math.floor(rand() * 14), size / 64, Math.max(1.5, size / 170), "rgba(12,11,10,0.62)");
  for (let i = 0; i < 9 * scale; i++) wanderingLine(ctx, rand, size, 6 + Math.floor(rand() * 10), size / 90, Math.max(0.8, size / 400), "rgba(10,10,9,0.5)");
}

export function makeAsphaltTexture() {
  const size = 512;
  const { c, ctx, rand } = noiseCanvas(size, [146, 144, 140], 70, 101);
  blotches(ctx, rand, size, 60, "38,36,33", 20, 80, 0.18);
  blotches(ctx, rand, size, 14, "18,17,16", 6, 22, 0.35);
  patchedAndCracked(ctx, rand, size, 2);
  return repeating(c);
}

export function makeStainedConcreteTexture() {
  const size = 256;
  const { c, ctx, rand } = noiseCanvas(size, [168, 164, 156], 30, 606);
  blotches(ctx, rand, size, 30, "96,92,84", 10, 40, 0.22);
  for (let i = 0; i < 70; i++) {
    const x = rand() * size;
    const len = size * (0.2 + rand() * 0.8);
    const w = 1 + rand() * 5;
    const rgb = rand() < 0.18 ? "112,64,34" : "40,38,34";
    const g = ctx.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0, `rgba(${rgb},${0.25 + rand() * 0.35})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, w, len);
  }
  const bloom = ctx.createLinearGradient(0, size * 0.7, 0, size);
  bloom.addColorStop(0, "rgba(232,228,214,0)");
  bloom.addColorStop(1, "rgba(232,228,214,0.3)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, size * 0.7, size, size * 0.3);
  ctx.fillStyle = "rgba(30,28,26,0.5)";
  for (let y = 32; y < size; y += 64) for (let x = 32; x < size; x += 64) ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
  ctx.fillStyle = "rgba(40,38,34,0.4)";
  ctx.fillRect(0, size / 2, size, 1);
  return repeating(c);
}

export function makeConcreteTexture() {
  const { c, ctx } = noiseCanvas(256, [190, 187, 180], 36, 202);
  ctx.strokeStyle = "rgba(92,90,84,0.55)";
  ctx.lineWidth = 2;
  for (let v = 0; v <= 256; v += 64) {
    ctx.beginPath();
    ctx.moveTo(v, 0);
    ctx.lineTo(v, 256);
    ctx.moveTo(0, v);
    ctx.lineTo(256, v);
    ctx.stroke();
  }
  const t = new CanvasTexture(c);
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function repeating(c: HTMLCanvasElement) {
  const t = new CanvasTexture(c);
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function makeRoadTexture() {
  const { c, ctx, rand } = noiseCanvas(256, [68, 67, 64], 44, 303);
  ctx.fillStyle = "rgba(24,23,21,0.28)";
  ctx.fillRect(44, 0, 34, 256);
  ctx.fillRect(178, 0, 34, 256);
  patchedAndCracked(ctx, rand, 256, 1);
  ctx.fillStyle = "rgba(226,223,212,0.78)";
  ctx.fillRect(7, 0, 3, 256);
  ctx.fillRect(246, 0, 3, 256);
  ctx.fillStyle = "rgba(230,217,138,0.88)";
  for (let y = 0; y < 256; y += 128) ctx.fillRect(126, y + 26, 4, 62);
  return repeating(c);
}

export function makeShingleTexture() {
  const { c, ctx, rand } = noiseCanvas(128, [168, 160, 150], 26, 404);
  for (let row = 0, y = 0; y < 128; y += 12, row++) {
    const offset = (row % 2) * 10;
    for (let x = -20; x < 128; x += 20) {
      ctx.fillStyle = `rgba(0,0,0,${0.08 + rand() * 0.22})`;
      ctx.fillRect(x + offset, y, 19, 11);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(x + offset, y, 19, 1);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x + offset + 19, y, 1, 11);
    }
  }
  return repeating(c);
}

export function makeLawnTexture() {
  const { c, ctx, rand } = noiseCanvas(128, [64, 104, 62], 46, 505);
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 18; i++) {
    const x = rand() * 128;
    const y = rand() * 128;
    const r = 8 + rand() * 22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(128,112,52,1)");
    g.addColorStop(1, "rgba(128,112,52,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  ctx.globalAlpha = 1;
  return repeating(c);
}

export function makeShadowBlobTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(0,0,0,0.6)");
  g.addColorStop(0.6, "rgba(0,0,0,0.28)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(c);
}
