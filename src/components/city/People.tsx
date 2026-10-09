"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BoxGeometry, BufferGeometry, Color, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useDayNight } from "./DayNightContext";
import { labelTexture } from "./labels";
import { BLOCK, CITY_HALF_X, CITY_HALF_Z, DESTINATIONS, allBlocks, blockCenter, destinationPosition } from "./layout";
import { mulberry32, pick, range } from "./rng";

const SKIN = ["#f1c9a5", "#e0ac7e", "#c68642", "#8d5524", "#5c3a1e", "#f5d6c6", "#a66a3a", "#3b2314"];
const TOPS = ["#f4f1ea", "#1d1d3f", "#c8102e", "#2a3a7a", "#ff4fa3", "#49d2f2", "#3f8a6a", "#d6b56e", "#202020", "#7b4f9d", "#e8e2d2", "#ff7a59", "#9dff57", "#ffb02e"];
const JACKETS = ["#15151c", "#2a1a10", "#1d1d3f", "#5a4636", "#3f3f4f", "#7a2e22", "#d6b56e"];
const LEGS = ["#1d1d2a", "#2a3a7a", "#3f3f4f", "#5a4636", "#0e0e14", "#9a95a8", "#c9b48c", "#4a2c3a"];
const HAIR = ["#0e0e14", "#2a1a10", "#5a3a1e", "#d6b56e", "#8a8a98", "#ff4fa3", "#49d2f2", "#1d1d3f", "#c8102e"];
const SHOES = ["#0e0e14", "#f4f1ea", "#5a4636", "#c8102e", "#2a3a7a"];

type HairStyle = 0 | 1 | 2 | 3 | 4 | 5;

interface Person {
  mode: "walk" | "stand";
  x: number;
  z: number;
  axis: "x" | "z";
  dir: 1 | -1;
  speed: number;
  len: number;
  start: number;
  phase: number;
  yaw: number;
  scale: number;
  wide: number;
  hair: HairStyle;
  jacket: boolean;
  skirt: boolean;
  bag: boolean;
  headphones: boolean;
  phone: boolean;
  camera: boolean;
  cheer: boolean;
  skinC: Color;
  topC: Color;
  jacketC: Color;
  legsC: Color;
  hairC: Color;
  shoeC: Color;
}

function person(rand: () => number, p: Partial<Person>): Person {
  const hairRoll = rand();
  const hair: HairStyle = hairRoll < 0.4 ? 0 : hairRoll < 0.58 ? 1 : hairRoll < 0.68 ? 2 : hairRoll < 0.8 ? 3 : hairRoll < 0.88 ? 4 : 5;
  return {
    mode: "walk",
    x: 0,
    z: 0,
    axis: "x",
    dir: 1,
    speed: range(rand, 0.9, 1.6),
    len: BLOCK - 2,
    start: rand(),
    phase: rand() * 10,
    yaw: 0,
    scale: range(rand, 0.84, 1.12),
    wide: range(rand, 0.85, 1.2),
    hair,
    jacket: rand() < 0.4,
    skirt: rand() < 0.22,
    bag: rand() < 0.3,
    headphones: rand() < 0.2,
    phone: false,
    camera: false,
    cheer: false,
    skinC: new Color(pick(rand, SKIN)),
    topC: new Color(pick(rand, TOPS)),
    jacketC: new Color(pick(rand, JACKETS)),
    legsC: new Color(pick(rand, LEGS)),
    hairC: new Color(hair === 5 ? pick(rand, ["#c8102e", "#1d1d3f", "#d6b56e", "#0e0e14"]) : pick(rand, HAIR)),
    shoeC: new Color(pick(rand, SHOES)),
    ...p,
  };
}

const WALK_EDGE = 0.1;
const WALK_KEEP_RIGHT = 0.3;

function crowd(rand: () => number, out: Person[], cx: number, cz: number, halfW: number, depth: number, n: number, phoneShare: number, cheerShare: number) {
  for (let i = 0; i < n; i++) {
    out.push(
      person(rand, {
        mode: "stand",
        x: cx + range(rand, -halfW, halfW),
        z: cz + range(rand, -depth, depth),
        yaw: Math.PI + range(rand, -0.5, 0.5),
        phone: rand() < phoneShare,
        cheer: rand() < cheerShare,
      }),
    );
  }
}

interface Extras {
  paparazzi: [number, number, number][];
  musician: [number, number, number];
  vendor: [number, number, number];
}

function buildPeople(): { people: Person[]; extras: Extras } {
  const rand = mulberry32(313);
  const out: Person[] = [];
  for (const { c, r, outer } of allBlocks()) {
    const [bx, bz] = blockCenter(c, r);
    const n = outer ? (rand() < 0.6 ? 1 : 2) : 3 + Math.floor(rand() * 4);
    for (let k = 0; k < n; k++) {
      const side = Math.floor(rand() * 4);
      const dir: 1 | -1 = rand() < 0.5 ? 1 : -1;
      const outward = side === 0 || side === 2 ? 1 : -1;
      const e = BLOCK / 2 + WALK_EDGE + dir * outward * WALK_KEEP_RIGHT;
      const axis: "x" | "z" = side < 2 ? "x" : "z";
      const fixed = side === 0 ? bz + e : side === 1 ? bz - e : side === 2 ? bx + e : bx - e;
      out.push(person(rand, { x: axis === "x" ? bx : fixed, z: axis === "x" ? fixed : bz, axis, dir }));
    }
  }
  for (let i = 0; i < 70; i++) {
    out.push(person(rand, { x: range(rand, -CITY_HALF_X - 30, CITY_HALF_X + 30), z: CITY_HALF_Z + 5 + rand() * 5, axis: "x", dir: rand() < 0.5 ? 1 : -1, speed: range(rand, 0.8, 1.4), len: 60 }));
  }
  for (let i = 0; i < 18; i++) {
    out.push(person(rand, { mode: "stand", x: range(rand, -CITY_HALF_X, CITY_HALF_X), z: CITY_HALF_Z + 9.5, yaw: range(rand, -0.4, 0.4), phone: rand() < 0.3 }));
  }
  const [clubX, clubZ] = destinationPosition(DESTINATIONS[0]);
  crowd(rand, out, clubX, clubZ + 12.9, 9.5, 0.5, 44, 0.4, 0.2);
  out.push(person(rand, { mode: "stand", x: clubX, z: clubZ + 11.9, yaw: 0, scale: 1.2, wide: 1.3, hair: 4, jacket: true, jacketC: new Color("#0e0e14"), topC: new Color("#0e0e14"), legsC: new Color("#0e0e14"), skirt: false, bag: false, headphones: false }));
  const paparazzi: [number, number, number][] = [
    [clubX + 11.5, 0.4, clubZ + 13.6],
    [clubX + 12.4, 0.4, clubZ + 12.4],
    [clubX - 11.8, 0.4, clubZ + 13.2],
  ];
  for (const p of paparazzi) out.push(person(rand, { mode: "stand", x: p[0], z: p[2], yaw: Math.atan2(clubX - p[0], clubZ + 12.5 - p[2]), camera: true, jacket: true, hair: 5, skirt: false }));
  const [foxX, foxZ] = destinationPosition(DESTINATIONS[1]);
  crowd(rand, out, foxX, foxZ + 12.6, 7.5, 0.55, 30, 0.35, 0.1);
  const musician: [number, number, number] = [foxX + 11.5, 0.4, foxZ + 12.2];
  out.push(person(rand, { mode: "stand", x: musician[0], z: musician[2], yaw: Math.PI * 0.75, hair: 3, jacket: true, jacketC: new Color("#d6b56e"), skirt: false, bag: false, camera: true }));
  for (let i = 0; i < 4; i++) out.push(person(rand, { mode: "stand", x: musician[0] + range(rand, -2.5, 1.5), z: musician[2] + range(rand, 1.2, 2.8), yaw: Math.PI + range(rand, -0.4, 0.4) }));
  const vendor: [number, number, number] = [-38, 0.4, CITY_HALF_Z + 8.6];
  out.push(person(rand, { mode: "stand", x: vendor[0], z: vendor[2] - 1.4, yaw: 0, jacket: false, topC: new Color("#f4f1ea"), hair: 5, hairC: new Color("#c8102e"), skirt: false, bag: false }));
  for (let i = 0; i < 3; i++) out.push(person(rand, { mode: "stand", x: vendor[0] + range(rand, -2, 2), z: vendor[2] + 1.6 + rand(), yaw: Math.PI + range(rand, -0.3, 0.3) }));
  return { people: out, extras: { paparazzi, musician, vendor } };
}

const UP = new Vector3(0, 1, 0);

const mat = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => new Matrix4().makeTranslation(x, y, z).scale(new Vector3(sx, sy, sz));

const PART = {
  head: mat(0, 1.56, 0, 0.17, 0.19, 0.17),
  eyes: mat(0, 1.58, 0.14, 1, 1, 1),
  hairShort: mat(0, 1.63, -0.02, 0.185, 0.14, 0.19),
  hairLong: mat(0, 1.63, -0.02, 0.19, 0.15, 0.2),
  hairBack: mat(0, 1.36, -0.13, 0.3, 0.5, 0.12),
  bun: mat(0, 1.74, -0.13, 0.09, 0.09, 0.09),
  afro: mat(0, 1.62, -0.01, 0.27, 0.25, 0.27),
  cap: mat(0, 1.65, -0.01, 0.19, 0.15, 0.19),
  brim: mat(0, 1.61, 0.2, 0.3, 0.03, 0.22),
  torso: mat(0, 1.1, 0, 0.42, 0.58, 0.24),
  jacket: mat(0, 1.08, -0.01, 0.5, 0.56, 0.3),
  hips: mat(0, 0.78, 0, 0.36, 0.12, 0.22),
  skirt: mat(0, 0.6, 0, 0.44, 0.4, 0.3),
  uArm: mat(0, -0.16, 0, 0.1, 0.32, 0.1),
  lArm: mat(0, -0.15, 0, 0.09, 0.3, 0.09),
  hand: mat(0, -0.33, 0, 0.09, 0.09, 0.06),
  uLeg: mat(0, -0.2, 0, 0.15, 0.4, 0.16),
  lLeg: mat(0, -0.19, 0, 0.13, 0.38, 0.14),
  shoe: mat(0, -0.4, 0.04, 0.15, 0.08, 0.26),
  bag: mat(0.3, 0.95, -0.02, 0.14, 0.28, 0.1),
  headphones: mat(0, 1.6, 0, 1, 1, 1),
  phone: mat(0, -0.36, 0.06, 0.09, 0.15, 0.02),
  camera: mat(0, -0.34, 0.1, 0.18, 0.12, 0.16),
};
const ELBOW = new Matrix4().makeTranslation(0, -0.32, 0);
const KNEE = new Matrix4().makeTranslation(0, -0.4, 0);

function eyesGeometry() {
  const l = new BoxGeometry(0.035, 0.035, 0.02).toNonIndexed();
  l.translate(-0.055, 0, 0);
  const r = new BoxGeometry(0.035, 0.035, 0.02).toNonIndexed();
  r.translate(0.055, 0, 0);
  return mergeGeometries([l, r])!;
}
function headphoneGeometry() {
  const band = new TorusGeometry(0.2, 0.025, 5, 16, Math.PI).toNonIndexed();
  const cupL = new SphereGeometry(0.055, 6, 6).toNonIndexed();
  cupL.translate(-0.19, -0.02, 0);
  const cupR = new SphereGeometry(0.055, 6, 6).toNonIndexed();
  cupR.translate(0.19, -0.02, 0);
  return mergeGeometries([band, cupL, cupR])!;
}

const PART_KEYS = ["head", "eyes", "hair", "hairBack", "bun", "brim", "torso", "jacket", "hips", "skirt", "uArmL", "lArmL", "handL", "uArmR", "lArmR", "handR", "uLegL", "lLegL", "shoeL", "uLegR", "lLegR", "shoeR", "bag", "headphones", "phone"] as const;
type PartKey = (typeof PART_KEYS)[number];

interface Scratch {
  pos: Vector3;
  q: Quaternion;
  sc: Vector3;
  M: Matrix4;
  T: Matrix4;
  R: Matrix4;
  J: Matrix4;
  out: Matrix4;
  zero: Matrix4;
  frame: number;
}

const PHONE_C = new Color("#e8fbff");
const CAMERA_C = new Color("#15151c");

function applyColors(m: Map<PartKey, InstancedMesh>, people: Person[]) {
  const color = (key: PartKey, pickColor: (p: Person) => Color) => {
    const im = m.get(key);
    if (!im) return;
    people.forEach((p, i) => im.setColorAt(i, pickColor(p)));
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  };
  color("head", (p) => p.skinC);
  color("hair", (p) => p.hairC);
  color("hairBack", (p) => p.hairC);
  color("bun", (p) => p.hairC);
  color("brim", (p) => p.hairC);
  color("torso", (p) => p.topC);
  color("jacket", (p) => p.jacketC);
  color("hips", (p) => p.legsC);
  color("skirt", (p) => p.legsC);
  color("uLegL", (p) => p.legsC);
  color("uLegR", (p) => p.legsC);
  color("lLegL", (p) => (p.skirt ? p.skinC : p.legsC));
  color("lLegR", (p) => (p.skirt ? p.skinC : p.legsC));
  color("shoeL", (p) => p.shoeC);
  color("shoeR", (p) => p.shoeC);
  color("uArmL", (p) => (p.jacket ? p.jacketC : p.topC));
  color("uArmR", (p) => (p.jacket ? p.jacketC : p.topC));
  color("lArmL", (p) => (p.jacket ? p.jacketC : p.skinC));
  color("lArmR", (p) => (p.jacket ? p.jacketC : p.skinC));
  color("handL", (p) => p.skinC);
  color("handR", (p) => p.skinC);
  color("bag", (p) => p.jacketC);
  color("phone", (p) => (p.camera ? CAMERA_C : PHONE_C));
}

interface Limb {
  u: InstancedMesh;
  l: InstancedMesh;
  e: InstancedMesh;
}

function limb(out: Matrix4, s: Scratch, M: Matrix4, px: number, py: number, upper: number, lower: number, upperPart: Matrix4, lowerPart: Matrix4, endPart: Matrix4, joint: Matrix4, dest: Limb, i: number) {
  s.T.makeTranslation(px, py, 0);
  s.R.makeRotationX(upper);
  s.J.multiplyMatrices(M, s.T).multiply(s.R);
  out.multiplyMatrices(s.J, upperPart);
  dest.u.setMatrixAt(i, out);
  s.R.makeRotationX(lower);
  s.J.multiply(joint).multiply(s.R);
  out.multiplyMatrices(s.J, lowerPart);
  dest.l.setMatrixAt(i, out);
  out.multiplyMatrices(s.J, endPart);
  dest.e.setMatrixAt(i, out);
}

function updatePeople(m: Map<PartKey, InstancedMesh>, people: Person[], t: number, s: Scratch, camX: number, camZ: number) {
  for (const k of PART_KEYS) if (!m.get(k)) return;
  const get = (k: PartKey) => m.get(k)!;
  const head = get("head");
  const eyes = get("eyes");
  const hair = get("hair");
  const hairBack = get("hairBack");
  const bun = get("bun");
  const brim = get("brim");
  const torso = get("torso");
  const jacket = get("jacket");
  const hips = get("hips");
  const skirt = get("skirt");
  const bag = get("bag");
  const headphones = get("headphones");
  const phone = get("phone");
  const armL: Limb = { u: get("uArmL"), l: get("lArmL"), e: get("handL") };
  const armR: Limb = { u: get("uArmR"), l: get("lArmR"), e: get("handR") };
  const legL: Limb = { u: get("uLegL"), l: get("lLegL"), e: get("shoeL") };
  const legR: Limb = { u: get("uLegR"), l: get("lLegR"), e: get("shoeR") };
  const { pos, q, sc, M, out, zero } = s;
  s.frame++;
  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    let x = p.x;
    let z = p.z;
    let yaw = p.yaw;
    let hipL = 0;
    let kneeL = 0;
    let kneeR = 0;
    let shL = 0;
    let shR = 0;
    let elL = 0.25;
    let elR = 0.25;
    let bob = 0;
    let heading: 1 | -1 = p.dir;
    if (p.mode === "walk") {
      const u = (p.start + (t * p.speed) / (2 * p.len)) % 1;
      const outbound = u < 0.5;
      const tri = outbound ? u * 2 : 2 - u * 2;
      const along = (tri - 0.5) * p.len * p.dir;
      heading = outbound ? p.dir : p.dir === 1 ? -1 : 1;
      x = p.axis === "x" ? p.x + along : p.x;
      z = p.axis === "x" ? p.z : p.z + along;
    }
    const dx = x - camX;
    const dz = z - camZ;
    if (dx * dx + dz * dz > 22500 && (s.frame + i) % 4 !== 0) continue;
    if (p.mode === "walk") {
      yaw = p.axis === "x" ? (heading > 0 ? Math.PI / 2 : -Math.PI / 2) : heading > 0 ? 0 : Math.PI;
      const w = t * p.speed * 5.2 + p.phase;
      const sw = Math.sin(w);
      hipL = sw * 0.5;
      kneeL = -(1 - Math.cos(w)) * 0.3;
      kneeR = -(1 + Math.cos(w)) * 0.3;
      shL = -sw * 0.45;
      shR = sw * 0.45;
      elL = 0.35 + sw * 0.15;
      elR = 0.35 - sw * 0.15;
      bob = Math.abs(Math.cos(w)) * 0.035;
    } else {
      yaw = p.yaw + Math.sin(t * 0.6 + p.phase) * 0.08;
      bob = Math.sin(t * 2.2 + p.phase) * 0.012;
      shL = Math.sin(t * 1.1 + p.phase) * 0.08;
      shR = -shL;
      if (p.cheer) {
        shL = -2.9 + Math.sin(t * 2.4 + p.phase) * 0.2;
        shR = -2.9 + Math.cos(t * 2.1 + p.phase) * 0.2;
        elL = -0.3;
        elR = -0.3;
        bob = Math.abs(Math.sin(t * 3 + p.phase)) * 0.05;
      } else if (p.phone) {
        shR = -2.45 + Math.sin(t * 1.4 + p.phase) * 0.1;
        elR = -0.55;
      } else if (p.camera) {
        shR = -1.45;
        elR = -1.3;
        shL = -1.45;
        elL = -1.3;
      }
    }
    pos.set(x, 0.4 + bob * p.scale, z);
    q.setFromAxisAngle(UP, yaw);
    sc.set(p.scale * p.wide, p.scale, p.scale);
    M.compose(pos, q, sc);
    head.setMatrixAt(i, out.multiplyMatrices(M, PART.head));
    eyes.setMatrixAt(i, out.multiplyMatrices(M, PART.eyes));
    const h = p.hair;
    hair.setMatrixAt(i, h === 4 ? zero : out.multiplyMatrices(M, h === 1 ? PART.hairLong : h === 3 ? PART.afro : h === 5 ? PART.cap : PART.hairShort));
    hairBack.setMatrixAt(i, h === 1 ? out.multiplyMatrices(M, PART.hairBack) : zero);
    bun.setMatrixAt(i, h === 2 ? out.multiplyMatrices(M, PART.bun) : zero);
    brim.setMatrixAt(i, h === 5 ? out.multiplyMatrices(M, PART.brim) : zero);
    torso.setMatrixAt(i, out.multiplyMatrices(M, PART.torso));
    jacket.setMatrixAt(i, p.jacket ? out.multiplyMatrices(M, PART.jacket) : zero);
    hips.setMatrixAt(i, out.multiplyMatrices(M, PART.hips));
    skirt.setMatrixAt(i, p.skirt ? out.multiplyMatrices(M, PART.skirt) : zero);
    bag.setMatrixAt(i, p.bag ? out.multiplyMatrices(M, PART.bag) : zero);
    headphones.setMatrixAt(i, p.headphones ? out.multiplyMatrices(M, PART.headphones) : zero);
    limb(out, s, M, -0.27, 1.34, shL, elL, PART.uArm, PART.lArm, PART.hand, ELBOW, armL, i);
    limb(out, s, M, 0.27, 1.34, shR, elR, PART.uArm, PART.lArm, PART.hand, ELBOW, armR, i);
    if (p.phone || p.camera) {
      out.multiplyMatrices(s.J, p.camera ? PART.camera : PART.phone);
      phone.setMatrixAt(i, out);
    } else phone.setMatrixAt(i, zero);
    limb(out, s, M, -0.1, 0.78, hipL, kneeL, PART.uLeg, PART.lLeg, PART.shoe, KNEE, legL, i);
    limb(out, s, M, 0.1, 0.78, -hipL, kneeR, PART.uLeg, PART.lLeg, PART.shoe, KNEE, legR, i);
  }
  for (const im of m.values()) im.instanceMatrix.needsUpdate = true;
}

function VelvetRope({ at }: { at: [number, number] }) {
  const [cx, cz] = at;
  const posts = Array.from({ length: 9 }, (_, i) => -10 + i * 2.5);
  return (
    <group position={[cx, 0.4, cz + 12.1]}>
      {posts.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 1, 6]} />
            <meshStandardMaterial color="#d6b56e" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.2, 0.22, 0.04, 10]} />
            <meshStandardMaterial color="#d6b56e" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.02, 0]}>
            <sphereGeometry args={[0.06, 6, 6]} />
            <meshStandardMaterial color="#f3dfae" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}
      {posts.slice(1).map((x) => (
        <mesh key={x} position={[x - 1.25, 0.9, 0]} rotation={[0, 0, Math.PI]} scale={[1, 0.22, 1]}>
          <torusGeometry args={[1.25, 0.035, 5, 14, Math.PI]} />
          <meshStandardMaterial color="#8b0f2a" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.0, 3.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[21, 2.2]} />
        <meshStandardMaterial color="#6b0f24" roughness={1} />
      </mesh>
    </group>
  );
}

function Flashes({ spots }: { spots: [number, number, number][] }) {
  const mats = useRef<(MeshStandardMaterial | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    mats.current.forEach((m, i) => {
      if (!m) return;
      const phase = (t * 0.9 + i * 0.37) % 1;
      m.emissiveIntensity = phase < 0.06 ? 14 : 0.1;
    });
  });
  return (
    <group>
      {spots.map((p, i) => (
        <mesh key={i} position={[p[0], p[1] + 1.55, p[2] + 0.3]}>
          <sphereGeometry args={[0.1, 6, 6]} />
          <meshStandardMaterial
            ref={(m) => {
              mats.current[i] = m;
            }}
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.1}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function ConeyCart({ at }: { at: [number, number, number] }) {
  const sign = useMemo(() => labelTexture("DETROIT CONEY", { width: 512, height: 128, bg: "#c8102e", fg: "#f4f1ea", border: "#f4f1ea" }), []);
  return (
    <group position={at}>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[2.6, 1.1, 1.3]} />
        <meshStandardMaterial color="#e8e2d2" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.28, 0]}>
        <boxGeometry args={[2.7, 0.06, 1.4]} />
        <meshStandardMaterial color="#aab0c4" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[-0.6, 1.36, 0]}>
        <boxGeometry args={[1.0, 0.1, 0.8]} />
        <meshStandardMaterial color="#15151c" roughness={0.9} />
      </mesh>
      <mesh position={[0.7, 1.45, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.3, 10]} />
        <meshStandardMaterial color="#c8ccd8" metalness={0.8} roughness={0.3} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.9, 0.3, 0.72]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.1, 12]} />
          <meshStandardMaterial color="#15151c" />
        </mesh>
      ))}
      <mesh position={[0, 1.9, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.4, 6]} />
        <meshStandardMaterial color="#aab0c4" />
      </mesh>
      <mesh position={[0, 2.6, 0]}>
        <coneGeometry args={[1.8, 0.6, 10, 1, true]} />
        <meshStandardMaterial color="#c8102e" side={2} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.02, 0.68]}>
        <boxGeometry args={[2.2, 0.5, 0.02]} />
        <meshStandardMaterial map={sign} />
      </mesh>
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[-0.6 + k * 0.1, 1.6 + k * 0.35, 0]}>
          <sphereGeometry args={[0.12 + k * 0.05, 6, 6]} />
          <meshStandardMaterial color="#f4f1ea" transparent opacity={0.25 - k * 0.06} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Busker({ at }: { at: [number, number, number] }) {
  return (
    <group position={at} rotation={[0, Math.PI * 0.75, 0]}>
      <mesh position={[0.1, 1.0, 0.32]} rotation={[0.2, 0.3, -0.9]}>
        <boxGeometry args={[0.9, 0.08, 0.34]} />
        <meshStandardMaterial color="#7a4a24" roughness={0.6} />
      </mesh>
      <mesh position={[0.52, 1.25, 0.38]} rotation={[0.2, 0.3, -0.9]}>
        <boxGeometry args={[0.7, 0.05, 0.08]} />
        <meshStandardMaterial color="#2a1a10" roughness={0.6} />
      </mesh>
      <mesh position={[0.6, 0.06, 1.0]}>
        <boxGeometry args={[1.0, 0.12, 0.4]} />
        <meshStandardMaterial color="#15151c" roughness={0.9} />
      </mesh>
      <mesh position={[0.6, 0.14, 1.0]}>
        <boxGeometry args={[0.9, 0.04, 0.3]} />
        <meshStandardMaterial color="#7a2e22" roughness={0.9} />
      </mesh>
      <mesh position={[-0.9, 0.9, 0.9]}>
        <cylinderGeometry args={[0.02, 0.02, 1.8, 5]} />
        <meshStandardMaterial color="#aab0c4" />
      </mesh>
      <mesh position={[-0.9, 1.82, 1.0]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.12, 0.26, 0.12]} />
        <meshStandardMaterial color="#15151c" />
      </mesh>
      <mesh position={[1.4, 0.4, 0.4]}>
        <boxGeometry args={[0.6, 0.8, 0.5]} />
        <meshStandardMaterial color="#15151c" roughness={0.9} />
      </mesh>
      <mesh position={[1.4, 0.4, 0.66]}>
        <boxGeometry args={[0.45, 0.45, 0.02]} />
        <meshStandardMaterial color="#3a3a46" />
      </mesh>
    </group>
  );
}

export default function People() {
  const dn = useDayNight();
  const [{ people, extras }] = useState(() => buildPeople());
  const refs = useRef(new Map<PartKey, InstancedMesh>());
  const phoneMat = useRef<MeshStandardMaterial>(null);
  const bind = useCallback(
    (key: PartKey) => (m: InstancedMesh | null) => {
      if (m) refs.current.set(key, m);
      else refs.current.delete(key);
    },
    [],
  );
  const geo = useMemo(
    () => ({ box: new BoxGeometry(1, 1, 1), sphere: new SphereGeometry(1, 7, 5), eyes: eyesGeometry(), headphones: headphoneGeometry() }) as Record<string, BufferGeometry>,
    [],
  );
  const scratch = useRef<Scratch>({ pos: new Vector3(), q: new Quaternion(), sc: new Vector3(), M: new Matrix4(), T: new Matrix4(), R: new Matrix4(), J: new Matrix4(), out: new Matrix4(), zero: new Matrix4().makeScale(0, 0, 0), frame: 0 });

  useEffect(() => {
    applyColors(refs.current, people);
  }, [people]);

  useEffect(() => {
    if (phoneMat.current) phoneMat.current.emissiveIntensity = 0.8 + dn.night * 3;
  }, [dn]);

  useFrame(({ clock, camera }) => {
    updatePeople(refs.current, people, clock.elapsedTime, scratch.current, camera.position.x, camera.position.z);
  });

  const n = people.length;
  const std = (key: PartKey, g: string, rough = 0.85) => (
    <instancedMesh key={key} ref={bind(key)} args={[geo[g], undefined, n]} frustumCulled={false}>
      <meshStandardMaterial color="#ffffff" roughness={rough} />
    </instancedMesh>
  );
  const [clubX, clubZ] = destinationPosition(DESTINATIONS[0]);
  return (
    <group>
      <VelvetRope at={[clubX, clubZ]} />
      <Flashes spots={extras.paparazzi} />
      <ConeyCart at={extras.vendor} />
      <Busker at={extras.musician} />
      {std("head", "sphere", 0.7)}
      <instancedMesh ref={bind("eyes")} args={[geo.eyes, undefined, n]} frustumCulled={false}>
        <meshStandardMaterial color="#120d0a" roughness={0.4} />
      </instancedMesh>
      {std("hair", "sphere", 0.95)}
      {std("hairBack", "box", 0.95)}
      {std("bun", "sphere", 0.95)}
      {std("brim", "box", 0.9)}
      {std("torso", "box")}
      {std("jacket", "box", 0.75)}
      {std("hips", "box")}
      {std("skirt", "box")}
      {std("uArmL", "box")}
      {std("lArmL", "box")}
      {std("handL", "box", 0.7)}
      {std("uArmR", "box")}
      {std("lArmR", "box")}
      {std("handR", "box", 0.7)}
      {std("uLegL", "box")}
      {std("lLegL", "box")}
      {std("shoeL", "box", 0.6)}
      {std("uLegR", "box")}
      {std("lLegR", "box")}
      {std("shoeR", "box", 0.6)}
      {std("bag", "box", 0.7)}
      <instancedMesh ref={bind("headphones")} args={[geo.headphones, undefined, n]} frustumCulled={false}>
        <meshStandardMaterial color="#15151c" roughness={0.5} metalness={0.3} />
      </instancedMesh>
      <instancedMesh ref={bind("phone")} args={[geo.box, undefined, n]} frustumCulled={false}>
        <meshStandardMaterial ref={phoneMat} color="#ffffff" emissive="#9ff2ff" emissiveIntensity={2} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
