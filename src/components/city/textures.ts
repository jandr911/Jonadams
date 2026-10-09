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

export function makeAsphaltTexture() {
  const { c, ctx, rand } = noiseCanvas(256, [150, 150, 158], 70, 101);
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 40; i++) {
    const x = rand() * 256;
    const y = rand() * 256;
    const r = 10 + rand() * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(40,40,48,1)");
    g.addColorStop(1, "rgba(40,40,48,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  ctx.globalAlpha = 1;
  const t = new CanvasTexture(c);
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function makeConcreteTexture() {
  const { c, ctx } = noiseCanvas(256, [190, 188, 196], 36, 202);
  ctx.strokeStyle = "rgba(90,90,104,0.55)";
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
