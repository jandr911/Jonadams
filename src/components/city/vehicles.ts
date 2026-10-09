import { BoxGeometry, BufferGeometry, CylinderGeometry, ExtrudeGeometry, PlaneGeometry, Shape, SphereGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { LabelOptions } from "./labels";

export type VehicleKind = "sedan" | "suv" | "van" | "pickup" | "taxi" | "police" | "bus";
export const VEHICLE_KINDS: VehicleKind[] = ["sedan", "suv", "van", "pickup", "taxi", "police", "bus"];

type Pt = [number, number];
export type PartKey = "dark" | "trim" | "chrome" | "glass" | "accent" | "amber" | "strobe" | "decal";
interface Extra {
  mat: PartKey;
  size: [number, number, number];
  pos: [number, number, number];
  rot?: [number, number, number];
}

export interface VehicleSpec {
  length: number;
  width: number;
  body: Pt[];
  glass: Pt[];
  roof: { z: number; len: number; y: number } | null;
  axles: number[];
  wheelR: number;
  lamp: { z: number; y: number; w: number; inset: number };
  mirror: { z: number; y: number } | null;
  driver: [number, number, number];
  decal?: { text: string; opts: LabelOptions };
  extras: Extra[];
}

const box = (mat: PartKey, size: [number, number, number], pos: [number, number, number], rot?: [number, number, number]): Extra => ({ mat, size, pos, rot });

function carCommon(L: number, W: number, belt: number, bumperY: number, axles: number[], wheelR: number, seams: number[], glassTop: number, pillars: number[]): Extra[] {
  const side = W / 2 + 0.06;
  const out: Extra[] = [
    box("dark", [W - 0.1, 0.22, 0.34], [0, bumperY, L / 2 - 0.08]),
    box("dark", [W - 0.1, 0.22, 0.34], [0, bumperY, -L / 2 + 0.08]),
    box("dark", [W * 0.42, 0.2, 0.08], [0, bumperY + 0.27, L / 2 + 0.02]),
    box("chrome", [W * 0.44, 0.04, 0.05], [0, bumperY + 0.3, L / 2 + 0.05]),
    box("chrome", [W * 0.44, 0.04, 0.05], [0, bumperY + 0.2, L / 2 + 0.05]),
    box("trim", [0.46, 0.13, 0.03], [0, bumperY + 0.02, L / 2 + 0.14]),
    box("trim", [0.46, 0.13, 0.03], [0, bumperY + 0.02, -L / 2 - 0.14]),
    box("chrome", [0.09, 0.09, 0.34], [-W / 2 + 0.35, 0.34, -L / 2 - 0.1]),
    box("trim", [0.025, 0.42, 0.025], [W * 0.3, belt + 0.7, -L / 2 + 0.9]),
    box("dark", [W * 0.9, 0.025, 0.05], [0, belt - 0.02, L / 2 - 1.05]),
  ];
  for (const z of axles) {
    for (const s of [-1, 1]) {
      out.push(box("dark", [0.1, 0.4, 1.3], [s * (side - 0.02), wheelR + 0.34, z]));
    }
  }
  for (const s of [-1, 1]) out.push(box("dark", [0.06, 0.1, L * 0.3], [s * side, 0.34, 0]));
  for (const z of seams) {
    for (const s of [-1, 1]) {
      out.push(box("dark", [0.02, belt - 0.42, 0.035], [s * side, 0.4 + (belt - 0.42) / 2, z]));
      out.push(box("chrome", [0.035, 0.04, 0.2], [s * (side + 0.01), belt - 0.16, z - 0.28]));
    }
  }
  for (const z of pillars) out.push(box("dark", [W + 0.1, glassTop - belt - 0.04, 0.07], [0, (glassTop + belt) / 2, z]));
  for (const s of [-1, 1]) {
    out.push(box("amber", [0.16, 0.1, 0.06], [s * (W / 2 - 0.1), bumperY + 0.46, L / 2 + 0.02]));
    out.push(box("amber", [0.16, 0.1, 0.06], [s * (W / 2 - 0.1), bumperY + 0.46, -L / 2 - 0.02]));
  }
  return out;
}

const SEDAN: VehicleSpec = {
  length: 4.5,
  width: 1.85,
  body: [[2.25, 0.3], [2.25, 0.72], [2.0, 0.8], [0.95, 0.9], [-1.3, 0.95], [-2.15, 0.9], [-2.25, 0.75], [-2.25, 0.3]],
  glass: [[0.9, 0.9], [0.3, 1.42], [-0.75, 1.42], [-1.3, 0.95]],
  roof: { z: -0.22, len: 1.12, y: 1.45 },
  axles: [1.45, -1.45],
  wheelR: 0.36,
  lamp: { z: 2.26, y: 0.62, w: 0.5, inset: 0.4 },
  mirror: { z: 0.85, y: 1.05 },
  driver: [-0.36, 0.55, 0.3],
  extras: carCommon(4.5, 1.85, 0.92, 0.42, [1.45, -1.45], 0.36, [0.85, -0.5], 1.42, [-0.25]),
};

const SUV: VehicleSpec = {
  length: 4.7,
  width: 1.95,
  body: [[2.35, 0.3], [2.35, 0.85], [2.1, 0.95], [1.1, 1.05], [-2.25, 1.05], [-2.35, 0.9], [-2.35, 0.3]],
  glass: [[1.05, 1.05], [0.5, 1.75], [-2.1, 1.75], [-2.25, 1.05]],
  roof: { z: -0.8, len: 2.7, y: 1.78 },
  axles: [1.5, -1.5],
  wheelR: 0.4,
  lamp: { z: 2.36, y: 0.7, w: 0.5, inset: 0.42 },
  mirror: { z: 1.0, y: 1.2 },
  driver: [-0.38, 0.68, 0.45],
  extras: [
    ...carCommon(4.7, 1.95, 1.06, 0.44, [1.5, -1.5], 0.4, [1.0, -0.4], 1.75, [-0.2, -1.5]),
    box("trim", [0.08, 0.08, 2.4], [0.7, 1.86, -0.8]),
    box("trim", [0.08, 0.08, 2.4], [-0.7, 1.86, -0.8]),
    box("trim", [1.5, 0.06, 0.06], [0, 1.86, 0.3]),
    box("trim", [1.5, 0.06, 0.06], [0, 1.86, -1.9]),
    box("dark", [0.6, 0.6, 0.2], [0, 0.9, -2.42]),
  ],
};

const VAN: VehicleSpec = {
  length: 5.2,
  width: 2.0,
  body: [[2.6, 0.3], [2.6, 0.9], [2.3, 1.0], [1.7, 1.05], [-2.55, 1.05], [-2.6, 0.9], [-2.6, 0.3]],
  glass: [[1.65, 1.05], [1.2, 2.1], [-2.5, 2.1], [-2.55, 1.05]],
  roof: { z: -0.65, len: 3.8, y: 2.13 },
  axles: [1.7, -1.6],
  wheelR: 0.38,
  lamp: { z: 2.61, y: 0.75, w: 0.5, inset: 0.42 },
  mirror: { z: 1.6, y: 1.3 },
  driver: [-0.4, 0.72, 1.15],
  extras: [
    ...carCommon(5.2, 2.0, 1.06, 0.44, [1.7, -1.6], 0.38, [0.9, -1.4], 2.1, [0.5, -1.5]),
    box("dark", [0.04, 0.9, 1.4], [1.06, 1.5, -0.5]),
    box("dark", [0.04, 0.9, 1.4], [-1.06, 1.5, -0.5]),
    box("trim", [1.7, 0.06, 0.06], [0, 2.2, 0.6]),
    box("trim", [1.7, 0.06, 0.06], [0, 2.2, -1.9]),
    box("trim", [0.06, 0.06, 2.6], [0.8, 2.2, -0.65]),
    box("trim", [0.06, 0.06, 2.6], [-0.8, 2.2, -0.65]),
    box("dark", [0.03, 1.1, 0.04], [0, 1.5, -2.62]),
  ],
};

const PICKUP: VehicleSpec = {
  length: 5.3,
  width: 1.95,
  body: [[2.65, 0.3], [2.65, 0.8], [2.4, 0.9], [1.3, 1.0], [-0.5, 1.0], [-0.55, 1.1], [-2.6, 1.1], [-2.65, 0.9], [-2.65, 0.3]],
  glass: [[1.25, 1.0], [0.75, 1.72], [-0.45, 1.72], [-0.5, 1.0]],
  roof: { z: 0.15, len: 1.3, y: 1.75 },
  axles: [1.75, -1.6],
  wheelR: 0.42,
  lamp: { z: 2.66, y: 0.68, w: 0.5, inset: 0.42 },
  mirror: { z: 1.2, y: 1.2 },
  driver: [-0.38, 0.66, 0.5],
  extras: [
    ...carCommon(5.3, 1.95, 1.02, 0.44, [1.75, -1.6], 0.42, [1.2], 1.72, [-0.42]),
    box("dark", [1.7, 0.06, 2.0], [0, 1.02, -1.6]),
    box("chrome", [0.05, 0.05, 2.0], [0.9, 1.2, -1.6]),
    box("chrome", [0.05, 0.05, 2.0], [-0.9, 1.2, -1.6]),
    box("dark", [1.8, 0.03, 0.03], [0, 1.1, -2.66]),
    box("amber", [0.1, 0.06, 0.08], [-0.5, 1.8, 0.7]),
    box("amber", [0.1, 0.06, 0.08], [0, 1.8, 0.7]),
    box("amber", [0.1, 0.06, 0.08], [0.5, 1.8, 0.7]),
  ],
};

const TAXI: VehicleSpec = {
  ...SEDAN,
  decal: { text: "", opts: { width: 1024, height: 96, bg: "#111118", stripe: "#f4f1ea" } },
  extras: [
    ...SEDAN.extras,
    box("accent", [0.9, 0.26, 0.34], [0, 1.62, -0.2]),
    box("dark", [0.06, 0.1, 0.06], [0, 1.47, -0.2]),
    box("decal", [1.98, 0.2, 3.4], [0, 0.72, 0]),
  ],
};

const POLICE: VehicleSpec = {
  ...SEDAN,
  decal: { text: "DETROIT POLICE", opts: { width: 512, height: 160, bg: "#1d1d3f", fg: "#f4f1ea", border: "#d6b56e" } },
  extras: [
    ...SEDAN.extras,
    box("strobe", [1.5, 0.14, 0.32], [0, 1.56, -0.1]),
    box("dark", [1.5, 0.06, 0.32], [0, 1.47, -0.1]),
    box("trim", [0.04, 0.04, 0.6], [0.4, 1.12, 1.4]),
    box("chrome", [0.06, 0.4, 0.06], [-0.5, 0.6, 2.42]),
    box("chrome", [0.06, 0.4, 0.06], [0.5, 0.6, 2.42]),
    box("chrome", [1.2, 0.06, 0.06], [0, 0.78, 2.44]),
    box("chrome", [1.2, 0.06, 0.06], [0, 0.5, 2.44]),
    box("trim", [0.12, 0.12, 0.14], [-0.95, 1.1, 0.95]),
    box("decal", [1.98, 0.42, 1.2], [0, 0.66, 0.15]),
  ],
};

const BUS: VehicleSpec = {
  length: 10.5,
  width: 2.5,
  body: [[5.25, 0.3], [5.25, 2.0], [5.0, 2.5], [-5.1, 2.5], [-5.25, 2.2], [-5.25, 0.3]],
  glass: [[4.6, 1.3], [4.6, 2.2], [-5.0, 2.2], [-5.0, 1.3]],
  roof: null,
  axles: [3.4, -3.0],
  wheelR: 0.5,
  lamp: { z: 5.26, y: 0.85, w: 0.6, inset: 0.45 },
  mirror: { z: 4.9, y: 2.0 },
  driver: [-0.7, 0.95, 4.2],
  decal: { text: "J. ADAMS · LIVE AT CLUB ADAMS", opts: { width: 1024, height: 128, bg: "#07060f", fg: "#f3dfae", border: "#d6b56e" } },
  extras: [
    box("glass", [2.3, 1.2, 0.08], [0, 1.85, 5.24]),
    box("glass", [2.2, 0.9, 0.08], [0, 1.9, -5.24]),
    box("accent", [1.6, 0.3, 0.1], [0, 2.3, 5.26]),
    box("decal", [2.62, 0.6, 7.4], [0, 0.78, -0.4]),
    ...[3.6, 2.2, 0.8, -0.6, -2.0, -3.4].map((z) => box("dark", [2.62, 0.96, 0.08], [0, 1.75, z])),
    box("dark", [0.05, 1.9, 1.0], [1.3, 1.25, 4.2]),
    box("dark", [0.05, 1.9, 1.0], [1.3, 1.25, -1.3]),
    box("glass", [0.04, 1.2, 0.8], [1.33, 1.5, 4.2]),
    box("glass", [0.04, 1.2, 0.8], [1.33, 1.5, -1.3]),
    box("dark", [1.4, 0.3, 2.2], [0, 2.6, -1.5]),
    box("dark", [1.4, 0.3, 2.2], [0, 2.6, 2.2]),
    box("dark", [2.5, 0.22, 0.4], [0, 0.42, 5.1]),
    box("dark", [2.5, 0.22, 0.4], [0, 0.42, -5.1]),
    box("dark", [1.6, 1.0, 0.06], [0, 1.0, -5.27]),
    box("chrome", [1.5, 0.04, 0.04], [0, 0.8, -5.3]),
    box("chrome", [1.5, 0.04, 0.04], [0, 1.0, -5.3]),
    box("chrome", [1.5, 0.04, 0.04], [0, 1.2, -5.3]),
    box("trim", [0.46, 0.13, 0.03], [0, 0.5, -5.3]),
    box("trim", [0.025, 0.5, 0.025], [0.6, 2.8, 3.8]),
    ...[3.4, -3.0].flatMap((z) => [-1, 1].map((s) => box("dark", [0.1, 0.5, 1.6], [s * 1.3, 0.9, z]))),
    ...[-1, 1].flatMap((s) => [box("amber", [0.2, 0.12, 0.06], [s * 1.1, 1.3, 5.28]), box("amber", [0.2, 0.12, 0.06], [s * 1.1, 1.3, -5.28])]),
  ],
};

export const VEHICLE_SPECS: Record<VehicleKind, VehicleSpec> = { sedan: SEDAN, suv: SUV, van: VAN, pickup: PICKUP, taxi: TAXI, police: POLICE, bus: BUS };

function extrudeProfile(pts: Pt[], width: number, bevel: number) {
  const shape = new Shape();
  pts.forEach(([z, y], i) => (i === 0 ? shape.moveTo(z, y) : shape.lineTo(z, y)));
  shape.closePath();
  const g = new ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 4,
  });
  g.rotateY(-Math.PI / 2);
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  g.translate(-(bb.min.x + bb.max.x) / 2, 0, 0);
  return g;
}

function boxAt(size: [number, number, number], pos: [number, number, number], rot?: [number, number, number]) {
  const g = new BoxGeometry(...size).toNonIndexed();
  if (rot) {
    g.rotateX(rot[0]);
    g.rotateY(rot[1]);
    g.rotateZ(rot[2]);
  }
  g.translate(...pos);
  return g;
}

export interface VehicleKindGeometry {
  body: BufferGeometry;
  glass: BufferGeometry;
  parts: Partial<Record<Exclude<PartKey, "glass">, BufferGeometry>>;
}

export function buildKindGeometry(kind: VehicleKind): VehicleKindGeometry {
  const s = VEHICLE_SPECS[kind];
  const bodyPieces: BufferGeometry[] = [extrudeProfile(s.body, s.width, 0.05)];
  if (s.roof) bodyPieces.push(boxAt([s.width + 0.02, 0.07, s.roof.len], [0, s.roof.y, s.roof.z]));
  const body = mergeGeometries(bodyPieces)!;
  const glassPieces: BufferGeometry[] = [extrudeProfile(s.glass, s.width + 0.06, 0)];
  const grouped: Partial<Record<Exclude<PartKey, "glass">, BufferGeometry[]>> = {};
  for (const e of s.extras) {
    if (e.mat === "glass") {
      glassPieces.push(boxAt(e.size, e.pos, e.rot));
      continue;
    }
    (grouped[e.mat] ??= []).push(boxAt(e.size, e.pos, e.rot));
  }
  const parts: VehicleKindGeometry["parts"] = {};
  for (const k of Object.keys(grouped) as Exclude<PartKey, "glass">[]) parts[k] = mergeGeometries(grouped[k]!)!;
  return { body, glass: mergeGeometries(glassPieces)!, parts };
}

export function buildWheelGeometry() {
  const tire = mergeGeometries([new CylinderGeometry(1, 1, 0.3, 16).toNonIndexed(), new CylinderGeometry(0.86, 0.86, 0.34, 16).toNonIndexed()])!;
  tire.rotateZ(Math.PI / 2);
  const rimPieces: BufferGeometry[] = [new CylinderGeometry(0.64, 0.64, 0.3, 12).toNonIndexed(), new CylinderGeometry(0.18, 0.18, 0.4, 8).toNonIndexed()];
  for (let i = 0; i < 5; i++) {
    const spoke = new BoxGeometry(1.1, 0.34, 0.12).toNonIndexed();
    spoke.rotateY((i / 5) * Math.PI);
    rimPieces.push(spoke);
  }
  const rim = mergeGeometries(rimPieces)!;
  rim.rotateZ(Math.PI / 2);
  return { tire, rim };
}

export function buildLampGeometry() {
  return new BoxGeometry(1, 1, 0.12);
}

export function buildMirrorGeometry() {
  return mergeGeometries([boxAt([0.12, 0.1, 0.2], [0.12, 0, 0]), boxAt([0.14, 0.03, 0.03], [0.02, 0, 0])])!;
}

export function buildDriverGeometry() {
  const head = new SphereGeometry(0.14, 8, 6).toNonIndexed();
  head.translate(0, 0.62, 0);
  const torso = new BoxGeometry(0.42, 0.5, 0.26).toNonIndexed();
  torso.translate(0, 0.25, 0);
  const wheel = new CylinderGeometry(0.17, 0.17, 0.03, 10).toNonIndexed();
  wheel.rotateX(Math.PI / 2 - 0.5);
  wheel.translate(0, 0.42, 0.34);
  return mergeGeometries([head, torso, wheel])!;
}

export function buildPoolGeometry() {
  const g = new PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2);
  return g;
}
