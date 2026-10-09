import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

let fontReady: Promise<void> | null = null;
function loadFont() {
  if (!fontReady) {
    fontReady = (async () => {
      try {
        const face = new FontFace("CityDisplay", "url(/fonts/BebasNeue-Regular.ttf)");
        await face.load();
        document.fonts.add(face);
      } catch {
        /* fall back to the system font */
      }
    })();
  }
  return fontReady;
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
}

const cache = new Map<string, CanvasTexture>();

export function labelTexture(text: string, o: LabelOptions = {}): CanvasTexture {
  const key = JSON.stringify([text, o]);
  const hit = cache.get(key);
  if (hit) return hit;
  const w = o.width ?? 512;
  const h = o.height ?? 128;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
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
    tex.needsUpdate = true;
  };
  draw();
  void loadFont().then(draw);
  cache.set(key, tex);
  return tex;
}
