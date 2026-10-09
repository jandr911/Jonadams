import {
  Color,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
} from "three";
import type { DayNight } from "./dayNight";

const vertexShader = /* glsl */ `
  attribute float aSeed;
  uniform float uSeed;
  uniform vec3 uColor;
  uniform float uCylindrical;
  varying vec3 vNormalW;
  varying vec2 vFace;
  varying vec2 vTopXZ;
  varying vec3 vSize;
  varying float vSeed;
  varying vec3 vColor;
  varying float vTop;
  varying float vLocalY;
  varying vec3 vWorld;
  #include <fog_pars_vertex>

  void main() {
    mat4 m = modelMatrix;
    #ifdef USE_INSTANCING
      m = modelMatrix * instanceMatrix;
      vSeed = aSeed;
    #else
      vSeed = uSeed;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #else
      vColor = uColor;
    #endif
    vec3 scale = vec3(length(m[0].xyz), length(m[1].xyz), length(m[2].xyz));
    vSize = scale;
    vNormalW = normalize(mat3(m) * normal);
    vec3 p = position;
    if (uCylindrical > 0.5) vFace = vec2(atan(p.z, p.x) * scale.x, p.y * scale.y);
    else if (abs(normal.x) > 0.5) vFace = vec2(p.z * scale.z, p.y * scale.y);
    else if (abs(normal.z) > 0.5) vFace = vec2(p.x * scale.x, p.y * scale.y);
    else vFace = vec2(-100.0);
    vTopXZ = vec2(p.x * scale.x, p.z * scale.z);
    vTop = abs(normal.y) > 0.5 ? 1.0 : 0.0;
    vLocalY = p.y * scale.y;
    vec4 wp = m * vec4(position, 1.0);
    vWorld = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uNight;
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSunIntensity;
  uniform float uAmbient;
  uniform vec3 uHemiSky;
  uniform vec3 uHemiGround;
  uniform vec2 uWinSize;
  uniform vec2 uWinMargin;
  uniform float uLitDensity;
  uniform float uWinBoost;
  uniform vec3 uWarm;
  uniform vec3 uCool;
  uniform float uGlow;
  uniform float uCylindrical;
  uniform float uShop;
  varying vec3 vNormalW;
  varying vec2 vFace;
  varying vec2 vTopXZ;
  varying vec3 vSize;
  varying float vSeed;
  varying vec3 vColor;
  varying float vTop;
  varying float vLocalY;
  varying vec3 vWorld;
  #include <fog_pars_fragment>

  const float SHOP_GLAZING_TOP = 3.4;
  const float SHOP_FASCIA_TOP = 4.2;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vWorld);
    vec3 l = normalize(uSunDir);
    float ndl = max(dot(n, l), 0.0);
    float hemi = n.y * 0.5 + 0.5;
    vec3 light = uSunColor * uSunIntensity * ndl + mix(uHemiGround, uHemiSky, hemi) * uAmbient * 2.2;
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    vec3 hv = normalize(l + v);
    float spec = pow(max(dot(n, hv), 0.0), 48.0) * uSunIntensity * 0.35;

    float lum = dot(vColor, vec3(0.299, 0.587, 0.114));
    float isGlass = 1.0 - step(0.2, lum);
    float isStone = step(0.5, lum);

    // masonry coursing: bricks on brick, ashlar blocks on stone, flat render on painted walls
    float painted = step(0.82, hash(vec2(vSeed * 1.9, 5.0))) * (1.0 - isGlass);
    vec2 bsize = mix(vec2(1.1, 0.42), vec2(2.4, 1.1), isStone);
    vec2 bc = vFace / bsize;
    bc.x += step(0.5, fract(bc.y * 0.5)) * 0.5;
    float brickTone = 0.8 + 0.4 * hash(floor(bc) + vSeed * 7.1);
    float mortar = max(step(0.9, fract(bc.x)), step(0.84, fract(bc.y)));
    float masonry = mix(brickTone, 0.58, mortar * 0.85);
    masonry = mix(masonry, 0.97 + 0.06 * hash(floor(vFace * 1.3) + vSeed), painted);
    float floorBand = 0.9 + 0.2 * hash(vec2(floor(vFace.y / 3.4), vSeed * 4.3));
    float grain = hash(floor(vFace * 0.18) + vSeed * 3.0);
    float repaired = smoothstep(0.55, 0.85, grain) * 0.14;
    masonry = (masonry * floorBand - repaired) * (1.0 - isGlass) + isGlass;

    // weathering: ground grime, roofline water stains, soot drift
    float streak = vnoise(vec2(vFace.x * 0.35 + vSeed, vFace.y * 0.05));
    float roofStain = streak * smoothstep(vSize.y * 0.72, vSize.y, vLocalY);
    float soot = grain * 0.12;
    float grime = 1.0 - (0.34 * streak * (1.0 - smoothstep(0.0, vSize.y * 0.6, vLocalY)) + 0.3 * roofStain + soot) * (1.0 - isGlass);
    float groundAO = 0.72 + 0.28 * smoothstep(0.0, 4.5, vLocalY);

    vec3 base = vColor * masonry * grime * groundAO;
    vec3 glassBase = vColor * 0.9 + uHemiSky * fres * 0.5 + uHemiSky * 0.08;
    base = mix(base, glassBase, isGlass);
    vec3 facade = base * light + vColor * uGlow * (0.35 + 0.65 * uNight)
                + uHemiSky * fres * mix(0.3, 0.6, isGlass) + uSunColor * spec * mix(1.0, 2.0, isGlass);

    // bays + windows
    float groundFloor = step(vWorld.y - vLocalY, 1.5) * step(6.0, vSize.y) * uShop;
    float shop = step(vLocalY, mix(SHOP_FASCIA_TOP, SHOP_GLAZING_TOP, isGlass)) * (1.0 - vTop) * groundFloor;
    float fascia = shop * step(SHOP_GLAZING_TOP, vLocalY);
    float cornice = step(vSize.y - 1.3, vLocalY) * (1.0 - vTop);
    vec2 margin = mix(uWinMargin, vec2(0.09, 0.2), isGlass);
    margin = mix(margin, vec2(0.05, 0.04), shop);
    vec2 winSize = uWinSize * vec2(0.85 + 0.3 * hash(vec2(vSeed, 1.7)), 0.88 + 0.28 * hash(vec2(vSeed, 2.9)));
    vec2 g = vFace / winSize;
    vec2 shopG = vec2(vFace.x / (winSize.x * 2.2), (vFace.y - 0.5) / (SHOP_GLAZING_TOP - 0.5));
    g = mix(g, shopG, shop);
    vec2 cell = floor(g);
    vec2 f = fract(g);
    float inWin = step(margin.x, f.x) * step(f.x, 1.0 - margin.x)
                * step(margin.y, f.y) * step(f.y, 1.0 - margin.y);
    inWin *= (1.0 - vTop) * step(0.5, vLocalY) * (1.0 - cornice) * (1.0 - fascia);

    float h = hash(cell + vSeed * 13.17);
    float floorDark = step(0.12, hash(vec2(cell.y, vSeed * 3.7)));
    float lit = max(step(1.0 - uLitDensity * uNight, h) * floorDark, shop * step(0.25, h) * uNight);
    float flick = 1.0 - 0.45 * step(0.992, hash(cell + floor(uTime * 0.7) + vSeed));
    vec3 tint = mix(uWarm, uCool, step(0.72, hash(cell * 1.71 + vSeed)));
    float hue = hash(cell * 0.77 + vSeed * 2.3);
    tint = mix(tint, tint * vec3(0.9, 0.97, 1.1), step(0.8, hue));
    tint = mix(tint, tint * vec3(1.1, 0.97, 0.88), step(hue, 0.15));
    if (shop > 0.0) {
      float neonPick = hash(vec2(vSeed * 5.3, 11.0));
      vec3 neonCol = mix(mix(vec3(1.0, 0.31, 0.64), vec3(0.29, 0.95, 0.84), step(0.33, neonPick)), vec3(1.0, 0.69, 0.18), step(0.66, neonPick));
      tint = mix(tint, neonCol, step(0.45, hash(vec2(vSeed * 2.1, 13.0))));
    }
    float bright = mix(0.55, 1.15, hash(cell * 3.3 + vSeed * 5.9));
    float skyGrad = smoothstep(0.0, max(vSize.y, 1.0), vLocalY);

    // blinds / curtains per window
    float dress = hash(cell * 2.3 + vSeed * 0.7);
    float fy = (f.y - margin.y) / max(1.0 - 2.0 * margin.y, 0.001);
    float shade = step(hash(cell * 4.7 + vSeed * 1.9), 0.3) * smoothstep(0.6, 0.7, fy);
    float blinds = step(dress, 0.28) * (0.7 + 0.3 * step(0.5, fract(fy * 7.0)));
    float curtain = step(0.28, dress) * step(dress, 0.5) * step(fy, 0.35 + 0.4 * hash(cell + 9.0));
    float dressing = mix(1.0, blinds, step(dress, 0.28)) * mix(1.0, mix(1.0, 0.25, 1.0 - step(fy, 0.35 + 0.4 * hash(cell + 9.0))), step(0.28, dress) * step(dress, 0.5));
    dressing = mix(dressing, 1.0, shop);

    // recessed look: lintel shadow at top, side reveal, sill highlight at bottom
    float fx = (f.x - margin.x) / max(1.0 - 2.0 * margin.x, 0.001);
    float lintel = 1.0 - 0.5 * smoothstep(0.78, 1.0, fy);
    float reveal = 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.14, fx)) * (1.0 - isGlass);
    float sill = step(fy, 0.08) * (1.0 - shop);

    // daytime rooms: sky reflections, dark interiors, a few offices lit
    float dayKind = hash(cell * 1.3 + vSeed * 7.7);
    vec3 dayGlass = (mix(vColor * 0.4, uHemiSky * 0.95, 0.6) * (0.55 + 0.6 * ndl)
                + uSunColor * spec * 2.5 + uHemiSky * fres * 0.6 + uHemiSky * (0.05 + 0.25 * skyGrad))
                * (0.85 + 0.15 * bright);
    vec3 dayDark = vColor * 0.18 + uHemiSky * (0.06 + 0.1 * fres);
    vec3 dayLit = tint * 0.55 * dressing + uHemiSky * 0.1;
    vec3 dayWin = mix(mix(dayGlass, dayDark, step(0.6, dayKind)), dayLit, step(0.9, dayKind) * (1.0 - shop));
    dayWin = dayWin * lintel * reveal * (1.0 - 0.35 * shade);
    vec3 nightUnlit = ((facade * 0.5 + vColor * 0.06) * lintel + uHemiSky * 0.05 * skyGrad) * reveal;
    vec3 nightLit = (tint * uWinBoost * dressing * bright + uHemiSky * fres * 0.3) * (1.0 - 0.6 * shade);
    vec3 win = mix(dayWin, mix(nightUnlit, nightLit, lit * flick), uNight);
    win = mix(win, facade * 1.25, sill * (1.0 - isGlass));

    // pilasters between bays, mullions on glass
    float edge = min(f.x, 1.0 - f.x);
    float pilaster = step(edge, 0.045) * (1.0 - vTop) * (1.0 - isGlass);
    float mullion = step(edge, 0.02) * (1.0 - vTop) * isGlass;
    float ledge = step(0.96, f.y) * (1.0 - vTop) * (1.0 - isGlass);
    float spandrel = step(0.92, f.y) * (1.0 - vTop) * isGlass;

    float shopBay = hash(vec2(cell.x * 1.37 + vSeed * 4.4, 3.0));
    float isDoor = shop * (1.0 - fascia) * step(0.74, shopBay);
    float doorMask = isDoor * step(0.3, f.x) * step(f.x, 0.7) * step(fy, 0.76) * inWin;
    float shopMullion = shop * inWin * (step(abs(f.x - 0.5), 0.012) * (1.0 - isDoor) + step(abs(fy - 0.74), 0.016));
    float fasciaTone = hash(vec2(vSeed * 3.1, 7.0));
    vec3 fasciaCol = vec3(0.07, 0.07, 0.08);
    fasciaCol = mix(fasciaCol, vec3(0.12, 0.26, 0.18), step(0.2, fasciaTone));
    fasciaCol = mix(fasciaCol, vec3(0.32, 0.08, 0.1), step(0.4, fasciaTone));
    fasciaCol = mix(fasciaCol, vec3(0.08, 0.1, 0.24), step(0.6, fasciaTone));
    fasciaCol = mix(fasciaCol, vec3(0.78, 0.72, 0.58), step(0.8, fasciaTone));
    float fasciaEdge = step(SHOP_FASCIA_TOP - 0.1, vLocalY) + step(vLocalY, SHOP_GLAZING_TOP + 0.1);

    vec3 col = mix(facade, win, inWin);
    // rust and water streaks running down from a few sills
    float under = step(f.y, margin.y) * (1.0 - inWin) * (1.0 - vTop) * (1.0 - isGlass) * (1.0 - shop);
    float streakHere = step(0.8, hash(cell + vSeed * 2.9)) * step(abs(f.x - 0.5), 0.08 + 0.12 * hash(cell * 1.9 + vSeed));
    float rust = under * streakHere * (1.0 - smoothstep(0.0, margin.y, f.y)) * 0.8;
    col = mix(col, col * vec3(0.55, 0.42, 0.34), rust);
    float sillShadow = step(f.y, margin.y) * step(margin.y - 0.06, f.y) * (1.0 - vTop) * (1.0 - isGlass) * (1.0 - shop);
    col = mix(col, col * 0.7, sillShadow);
    col = mix(col, vec3(0.06, 0.05, 0.07) + tint * 0.06 * uNight, doorMask);
    col = mix(col, vec3(0.12, 0.12, 0.14) * light, shopMullion);
    col = mix(col, facade * 0.78, pilaster * 0.7 * (1.0 - shop));
    col = mix(col, vec3(0.55, 0.6, 0.68) * light, mullion);
    col = mix(col, facade * 0.7, ledge * 0.6 * (1.0 - shop));
    col = mix(col, vColor * 0.55 * light, spandrel * (1.0 - shop));
    col = mix(col, facade * 1.12, cornice * step(0.5, fract(vLocalY * 2.0)));
    col = mix(col, facade * 0.6, step(vLocalY, 0.5) * (1.0 - vTop));
    col = mix(col, mix(fasciaCol * light, facade * 1.1, fasciaEdge * 0.6), fascia);

    // roof: gravel, parapet rim, slight AO
    vec2 rim = vSize.xz * 0.5 - abs(vTopXZ);
    float parapet = step(min(rim.x, rim.y), 0.7);
    float gravel = 0.85 + 0.3 * hash(floor(vTopXZ * 3.0) + vSeed);
    vec3 roof = vColor * 0.55 * light * gravel;
    roof = mix(roof, facade * 1.05, parapet);
    col = mix(col, roof, vTop * step(0.5, n.y));

    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface WindowMaterialOptions {
  color?: string;
  seed?: number;
  winSize?: [number, number];
  winMargin?: [number, number];
  litDensity?: number;
  winBoost?: number;
  warm?: string;
  cool?: string;
  cylindrical?: boolean;
  glow?: number;
  storefront?: boolean;
}

export function createWindowMaterial(opts: WindowMaterialOptions = {}) {
  const mat = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uSeed: { value: opts.seed ?? Math.random() * 100 },
        uCylindrical: { value: opts.cylindrical ? 1 : 0 },
        uShop: { value: opts.storefront === false || opts.cylindrical ? 0 : 1 },
        uGlow: { value: opts.glow ?? 0 },
        uColor: { value: new Color(opts.color ?? "#5a4d7a") },
        uNight: { value: 1 },
        uTime: { value: 0 },
        uSunDir: { value: new Vector3(0.5, 0.8, -0.3) },
        uSunColor: { value: new Color("#ffffff") },
        uSunIntensity: { value: 1 },
        uAmbient: { value: 0.3 },
        uHemiSky: { value: new Color("#8888ff") },
        uHemiGround: { value: new Color("#222222") },
        uWinSize: { value: new Vector2(...(opts.winSize ?? [1.6, 2.1])) },
        uWinMargin: { value: new Vector2(...(opts.winMargin ?? [0.27, 0.32])) },
        uLitDensity: { value: opts.litDensity ?? 0.3 },
        uWinBoost: { value: opts.winBoost ?? 1.55 },
        uWarm: { value: new Color(opts.warm ?? "#ffd9a0") },
        uCool: { value: new Color(opts.cool ?? "#bfe6ff") },
      },
    ]),
  });
  return mat;
}

export function tickWindowMaterial(mat: ShaderMaterial, time: number) {
  mat.uniforms.uTime.value = time;
}

export function applyDayNight(mat: ShaderMaterial, dn: DayNight) {
  const u = mat.uniforms;
  u.uNight.value = dn.night;
  (u.uSunDir.value as Vector3).set(...dn.sunDir);
  (u.uSunColor.value as Color).copy(dn.sunColor);
  u.uSunIntensity.value = dn.sunIntensity;
  u.uAmbient.value = dn.ambient;
  (u.uHemiSky.value as Color).copy(dn.hemiSky);
  (u.uHemiGround.value as Color).copy(dn.hemiGround);
}
