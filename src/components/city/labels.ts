import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { DISPLAY_FONT, SCRIPT_FONT } from "./NeonSign";
import { mulberry32 } from "./rng";

const FACES: [string, string, FontFaceDescriptors][] = [
  ["CityDisplay", DISPLAY_FONT, {}],
  ["CityScript", SCRIPT_FONT, { style: "italic" }],
];

let fontReady: Promise<void> | null = null;
function loadFont() {
  if (!fontReady) {
    fontReady = (async () => {
      await Promise.all(
        FACES.map(async ([family, src, descriptors]) => {
          try {
            const face = new FontFace(family, `url(${src})`, descriptors);
            await face.load();
            document.fonts.add(face);
          } catch {
            /* fall back to the system font */
          }
        }),
      );
    })();
  }
  return fontReady;
}

function seedOf(text: string) {
  let h = 7;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

function newCanvasTexture(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return { c, tex };
}

function weather(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number, strength = 1) {
  for (let i = 0; i < 10; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = (0.1 + rand() * 0.3) * h;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone = rand() < 0.5 ? "236,230,214" : "40,36,30";
    g.addColorStop(0, `rgba(${tone},${0.18 * strength})`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < Math.round(w / 14); i++) {
    const x = rand() * w;
    const len = h * (0.2 + rand() * 0.8);
    const rust = rand() < 0.25;
    const g = ctx.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0, rust ? `rgba(120,64,30,${0.4 * strength})` : `rgba(30,26,22,${0.28 * strength})`);
    g.addColorStop(1, "rgba(30,26,22,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 1 + rand() * 3, len);
  }
  const dirt = ctx.createLinearGradient(0, h * 0.65, 0, h);
  dirt.addColorStop(0, "rgba(40,34,26,0)");
  dirt.addColorStop(1, `rgba(40,34,26,${0.32 * strength})`);
  ctx.fillStyle = dirt;
  ctx.fillRect(0, h * 0.65, w, h * 0.35);
}

export interface LabelOptions {
  width?: number;
  height?: number;
  bg?: string;
  fg?: string;
  size?: number;
  stripe?: string;
  border?: string;
  repeatX?: number;
  weathered?: boolean;
}

const cache = new Map<string, CanvasTexture>();

export function labelTexture(text: string, o: LabelOptions = {}): CanvasTexture {
  const key = JSON.stringify([text, o]);
  const hit = cache.get(key);
  if (hit) return hit;
  const w = o.width ?? 512;
  const h = o.height ?? 128;
  const { c, tex } = newCanvasTexture(w, h);
  if (o.repeatX) {
    tex.wrapS = RepeatWrapping;
    tex.repeat.x = o.repeatX;
  }
  const draw = () => {
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = o.bg ?? "#0c0a1e";
    ctx.fillRect(0, 0, w, h);
    if (o.stripe) {
      const s = h / 3;
      ctx.fillStyle = o.stripe;
      for (let y = 0; y < 3; y++) for (let x = 0; x < w / s; x++) if ((x + y) % 2 === 0) ctx.fillRect(x * s, y * s, s, s);
    }
    if (o.border) {
      ctx.strokeStyle = o.border;
      ctx.lineWidth = Math.max(2, h * 0.05);
      ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
    }
    if (text) {
      const size = o.size ?? h * 0.62;
      ctx.font = `${size}px CityDisplay, "Bebas Neue", Impact, sans-serif`;
      ctx.fillStyle = o.fg ?? "#f3dfae";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, w / 2, h / 2 + size * 0.04, w * 0.94);
    }
    if (o.weathered) weather(ctx, w, h, mulberry32(seedOf(text)));
    tex.needsUpdate = true;
  };
  draw();
  void loadFont().then(draw);
  cache.set(key, tex);
  return tex;
}

function cached(key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const { c, tex } = newCanvasTexture(w, h);
  const draw = () => {
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    paint(ctx);
    tex.needsUpdate = true;
  };
  draw();
  void loadFont().then(draw);
  cache.set(key, tex);
  return tex;
}

export function carvedStoneTexture(text: string, stone = "#c9b48c") {
  const w = 1024;
  const h = 96;
  return cached(`carved|${text}|${stone}`, w, h, (ctx) => {
    const rand = mulberry32(seedOf(text));
    const rgb = [1, 3, 5].map((i) => parseInt(stone.slice(i, i + 2), 16));
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (rand() - 0.5) * 26;
      img.data[i] = rgb[0] + n;
      img.data[i + 1] = rgb[1] + n;
      img.data[i + 2] = rgb[2] + n;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    ctx.fillStyle = "rgba(60,48,32,0.35)";
    for (let x = 0; x < w; x += 128) ctx.fillRect(x + Math.round(rand() * 6), 0, 2, h);
    const size = h * 0.56;
    ctx.font = `${size}px "Trajan Pro", "Times New Roman", Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const spaced = text.split("").join(" ");
    ctx.fillStyle = "rgba(255,246,226,0.55)";
    ctx.fillText(spaced, w / 2 + 2, h / 2 + 3, w * 0.94);
    ctx.fillStyle = "rgba(48,38,26,0.9)";
    ctx.fillText(spaced, w / 2, h / 2, w * 0.94);
    ctx.fillStyle = "rgba(24,18,12,0.35)";
    ctx.fillText(spaced, w / 2 - 1.5, h / 2 - 1.5, w * 0.94);
    weather(ctx, w, h, rand, 0.8);
  });
}

export function handPaintedBillboardTexture(script: string, headline: string, footer: string) {
  const w = 1024;
  const h = 544;
  return cached(`painted|${script}|${headline}|${footer}`, w, h, (ctx) => {
    const rand = mulberry32(seedOf(headline));
    ctx.fillStyle = "#e6dbc2";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#8f2a22";
    ctx.lineWidth = 22;
    ctx.strokeRect(22, 22, w - 44, h - 44);
    ctx.strokeStyle = "#1f1d1b";
    ctx.lineWidth = 3;
    ctx.strokeRect(44, 44, w - 88, h - 88);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `italic ${h * 0.2}px CityScript, Georgia, serif`;
    ctx.fillStyle = "#9a6a1e";
    ctx.fillText(script, w / 2, h * 0.24, w * 0.8);
    const big = h * 0.36;
    ctx.font = `${big}px CityDisplay, "Bebas Neue", Impact, sans-serif`;
    ctx.fillStyle = "#8f2a22";
    ctx.fillText(headline, w / 2 + 7, h * 0.55 + 7, w * 0.86);
    ctx.fillStyle = "#1f1d1b";
    ctx.fillText(headline, w / 2, h * 0.55, w * 0.86);
    ctx.fillStyle = "#8f2a22";
    ctx.fillRect(w * 0.2, h * 0.73, w * 0.6, 4);
    ctx.font = `${h * 0.075}px CityDisplay, "Bebas Neue", Impact, sans-serif`;
    ctx.fillStyle = "#1f1d1b";
    ctx.fillText(footer, w / 2, h * 0.82, w * 0.8);
    for (let i = 0; i < 9; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 8 + rand() * 30;
      ctx.fillStyle = "rgba(150,146,136,0.55)";
      ctx.beginPath();
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        const rr = r * (0.5 + rand() * 0.6);
        if (k === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    }
    weather(ctx, w, h, rand, 1.2);
  });
}

export function ghostAdTexture(lines: string[], ground: string, ink: string) {
  const w = 512;
  const h = 320;
  return cached(`ghost|${lines.join("|")}|${ground}|${ink}`, w, h, (ctx) => {
    const rand = mulberry32(seedOf(lines.join()));
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = ground;
    ctx.fillRect(12, 12, w - 24, h - 24);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 8;
    ctx.strokeRect(30, 30, w - 60, h - 60);
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${h * 0.2}px CityDisplay, "Bebas Neue", Impact, sans-serif`;
    ctx.fillText(lines[0], w / 2, h * 0.3, w * 0.8);
    ctx.font = `${h * 0.25}px CityDisplay, "Bebas Neue", Impact, sans-serif`;
    ctx.fillText(lines[1], w / 2, h * 0.56, w * 0.84);
    ctx.font = `italic ${h * 0.11}px CityScript, Georgia, serif`;
    ctx.fillText(lines[2], w / 2, h * 0.8, w * 0.72);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 46; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 10 + rand() * 60;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${0.4 + rand() * 0.5})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    for (let y = 0, row = 0; y < h; y += 7, row++) {
      ctx.fillRect(0, y, w, 1.5);
      for (let x = (row % 2) * 9; x < w; x += 18) ctx.fillRect(x, y, 1.5, 7);
    }
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  });
}
