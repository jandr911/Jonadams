"use client";

import { Html, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Color, DoubleSide, Group, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, Vector3, type Texture } from "three";
import { ALTER_EGO } from "@/content/site";
import { DETROIT_POLICE, HELI_PITCH, HELI_SKID_DROP, HELI_SKID_X, HelicopterBody, spinHelicopter, type HelicopterParts } from "./Aircraft";
import { useCity } from "./CityContext";
import { type DayNight } from "./dayNight";
import { useDayNight } from "./DayNightContext";
import { LISTEN_ROOF_Y, PAD } from "./Landmarks";
import { HOVER_SCALE, LABEL_FADE_STYLE, destinationById, destinationPosition } from "./layout";
import { useLingeringLabel } from "./useLingeringLabel";
import { makeShadowBlobTexture } from "./textures";

const STAND_H = 20;
const WALK_H = STAND_H * 1.075;
const STANDING = { src: ALTER_EGO.art.standing, aspect: 430 / 775, anchor: { x: -0.0721, y: 0 } };
const SMOKE = { src: ALTER_EGO.art.smoke, aspect: 314 / 298, height: 0.3845 * STAND_H, anchor: { x: -0.4108, y: 0 } };
const SMOKE_ROOT = new Vector3(-0.0942 * STAND_H, 0.9626 * STAND_H, 0.02);
const WALKING = { src: ALTER_EGO.art.walking, aspect: 394 / 913, anchor: { x: 0.04, y: 0.62 } };
const ROPE_END = new Vector3(0, (0.9 - WALKING.anchor.y) * WALK_H, -0.8);
const ROPE = 12;

const CHOPPER_SCALE = 2.4;
const GRIP = new Vector3(HELI_SKID_X, -HELI_SKID_DROP, 0);
const ROOF_SPOT = { x: -6, z: 4.5 };
const SHADOW = { x: 0.6, width: 5.2, depth: 4.4 };
const ROPE_COLOR = "#c8582a";
const HOTSPOT_GROW = HOVER_SCALE - 1;
const ROOF_RISE = LISTEN_ROOF_Y - PAD;

const [FOX_X, FOX_Z] = destinationPosition(destinationById("listen"));
const STAND = new Vector3(FOX_X + ROOF_SPOT.x, LISTEN_ROOF_Y, FOX_Z + ROOF_SPOT.z);
const HOOK_HEIGHT = WALKING.anchor.y * WALK_H;
const HOVER = new Vector3(
  STAND.x - HELI_SKID_X * CHOPPER_SCALE,
  STAND.y + HOOK_HEIGHT + ROPE + HELI_SKID_DROP * Math.cos(HELI_PITCH) * CHOPPER_SCALE,
  STAND.z + HELI_SKID_DROP * Math.sin(HELI_PITCH) * CHOPPER_SCALE,
);

const CYCLE = 115;
const VISIBLE = [46, 113] as const;
const PICKUP = 67.5;
const DROP = 96.5;
const HOLDS = [
  [64.6, 69.8],
  [95.2, 98.8],
] as const;
const ROPE_REACH_SECONDS = 1.6;
const DRIFT_CLEAR_SECONDS = 1.5;

const at = (dx: number, dy: number, dz: number) => new Vector3(HOVER.x + dx, HOVER.y + dy, HOVER.z + dz);

const FLIGHT: { t: number; p: Vector3 }[] = [
  { t: 46, p: new Vector3(-800, 72, 100) },
  { t: 58, p: new Vector3(-200, 64, 100) },
  { t: 62.5, p: at(-4, 3, 14) },
  { t: 64.6, p: at(0, 3, 2) },
  { t: 65.8, p: at(0, 0, 0) },
  { t: 69, p: at(0, 0, 0) },
  { t: 69.8, p: at(0, 3, 0) },
  { t: 71, p: at(0, 3, 12) },
  { t: 76, p: new Vector3(-20, 60, 100) },
  { t: 81, p: new Vector3(100, 60, 100) },
  { t: 82.5, p: new Vector3(125, 60, 100) },
  { t: 84.5, p: new Vector3(125, 60, 100) },
  { t: 89, p: new Vector3(20, 60, 100) },
  { t: 92.5, p: new Vector3(-70, 64, 99) },
  { t: 94.2, p: at(4, 3, 14) },
  { t: 95.2, p: at(0, 2, 3) },
  { t: 96.2, p: at(0, 0, 0) },
  { t: 98, p: at(0, 0, 0) },
  { t: 99, p: at(0, 3, 0) },
  { t: 101, p: at(0, 3, 14) },
  { t: 106, p: new Vector3(-300, 64, 100) },
  { t: 113, p: new Vector3(-800, 72, 100) },
];

const BEAT_HZ = 1.53;
const BAR_SWELL_HZ = BEAT_HZ / 8;
const PUFF_SECONDS = 9;
const SMOKE_OPACITY = 0.94;
const PUFF_DRIFT = 1.2;
const PUFF_RISE = 3.2;
const PUFF_SWELL = 0.18;
const TAG_Y = SMOKE_ROOT.y + PUFF_RISE + SMOKE.height * (1 + PUFF_SWELL) * 1.02 + 1.5;

const GRAVITY = 50;
const AIR_DRAG = 0.35;
const HOLD_SETTLE = 5;
const SOFT_SWING = 0.3;
const SWING_STIFFNESS = 1000;
const MAX_SWING = 0.5;

interface Flight {
  pos: Vector3;
  ahead: Vector3;
  yaw: number;
  lastT: number;
  speed: number;
  accel: number;
  pitch: number;
}

function tangentAt(i: number, out: Vector3) {
  const prev = FLIGHT[Math.max(0, i - 1)];
  const cur = FLIGHT[i];
  const next = FLIGHT[Math.min(FLIGHT.length - 1, i + 1)];
  if (prev.p.equals(cur.p) || next.p.equals(cur.p) || next.t === prev.t) return out.set(0, 0, 0);
  return out.subVectors(next.p, prev.p).divideScalar(next.t - prev.t);
}

const m0 = new Vector3();
const m1 = new Vector3();

function flightPoint(t: number, out: Vector3) {
  if (t <= FLIGHT[0].t) return out.copy(FLIGHT[0].p);
  const last = FLIGHT[FLIGHT.length - 1];
  if (t >= last.t) return out.copy(last.p);
  let i = 0;
  while (FLIGHT[i + 1].t < t) i++;
  const a = FLIGHT[i];
  const b = FLIGHT[i + 1];
  const dt = b.t - a.t;
  const s = (t - a.t) / dt;
  const s2 = s * s;
  const s3 = s2 * s;
  tangentAt(i, m0).multiplyScalar(dt * (s3 - 2 * s2 + s));
  tangentAt(i + 1, m1).multiplyScalar(dt * (s3 - s2));
  return out
    .copy(a.p)
    .multiplyScalar(2 * s3 - 3 * s2 + 1)
    .addScaledVector(b.p, -2 * s3 + 3 * s2)
    .add(m0)
    .add(m1);
}

const ENTRY_YAW = Math.atan2(FLIGHT[1].p.x - FLIGHT[0].p.x, FLIGHT[1].p.z - FLIGHT[0].p.z);

function resetFlight(f: Flight) {
  f.lastT = -1;
  f.yaw = ENTRY_YAW;
  f.speed = 0;
  f.accel = 0;
  f.pitch = HELI_PITCH;
}

function inHold(t: number) {
  for (let i = 0; i < HOLDS.length; i++) if (t >= HOLDS[i][0] && t <= HOLDS[i][1]) return true;
  return false;
}

function wrapAngle(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function steerFlight(f: Flight, t: number) {
  const dt = f.lastT < 0 ? 0 : Math.min(0.1, Math.max(0, t - f.lastT));
  f.lastT = t;
  flightPoint(t, f.pos);
  flightPoint(t + 0.05, f.ahead);
  const vx = f.ahead.x - f.pos.x;
  const vz = f.ahead.z - f.pos.z;
  const hold = inHold(t);
  const target = hold ? 0 : Math.hypot(vx, vz) > 0.1 ? Math.atan2(vx, vz) : f.yaw;
  const before = f.yaw;
  f.yaw = wrapAngle(f.yaw + wrapAngle(target - f.yaw) * (1 - Math.exp(-dt * (hold ? 4 : 2.5))));
  const speed = f.ahead.distanceTo(f.pos) / 0.05;
  if (dt > 0) f.accel += ((speed - f.speed) / dt - f.accel) * (1 - Math.exp(-dt * 4));
  f.speed = speed;
  f.pitch = hold ? HELI_PITCH : HELI_PITCH + Math.min(speed * 0.004, 0.12) + Math.max(-0.2, Math.min(0.08, f.accel * 0.03));
  return dt > 0 ? wrapAngle(f.yaw - before) / dt : 0;
}

function holdDrift(t: number, c: number, out: Vector3) {
  let envelope = 0;
  for (let i = 0; i < HOLDS.length; i++) {
    const [from, to] = HOLDS[i];
    if (c > from && c < to) envelope = Math.min(1, c - from, to - c);
  }
  envelope *= Math.min(1, Math.abs(c - PICKUP) / DRIFT_CLEAR_SECONDS, Math.abs(c - DROP) / DRIFT_CLEAR_SECONDS);
  return out.set(Math.sin(t * 0.9) * 0.4, Math.sin(t * 1.3) * 0.2, Math.cos(t * 0.7) * 0.35).multiplyScalar(envelope);
}

function ropeReach(c: number) {
  const lowering = (c - (PICKUP - ROPE_REACH_SECONDS)) / ROPE_REACH_SECONDS;
  if (lowering > 0 && lowering < 1) return MathUtils.smoothstep(lowering, 0, 1);
  const raising = (c - DROP) / ROPE_REACH_SECONDS;
  if (raising >= 0 && raising < 1) return 1 - MathUtils.smoothstep(raising, 0, 1);
  return 0;
}

interface Swing {
  pos: Vector3;
  vel: Vector3;
  grip: Vector3;
  active: boolean;
}

const swingWas = new Vector3();
const swingArm = new Vector3();
const swingGrip = new Vector3();

function settleSwing(s: Swing, grip: Vector3) {
  s.pos.set(grip.x, grip.y - ROPE, grip.z);
  s.vel.set(0, 0, 0);
  s.grip.copy(grip);
  s.active = true;
}

function releaseSwing(s: Swing) {
  s.active = false;
}

function stepSwing(s: Swing, grip: Vector3, dt: number, hold: boolean) {
  const steps = Math.min(4, Math.max(1, Math.ceil(dt * 120)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const g = swingGrip.lerpVectors(s.grip, grip, (i + 1) / steps);
    swingWas.copy(s.pos);
    swingArm.subVectors(s.pos, g);
    const reach = Math.hypot(swingArm.x, swingArm.z);
    const excess = Math.atan2(reach, -swingArm.y) - SOFT_SWING;
    if (excess > 0 && reach > 1e-6) {
      const push = (SWING_STIFFNESS * excess * h) / reach;
      s.vel.x -= swingArm.x * push;
      s.vel.z -= swingArm.z * push;
    }
    s.vel.y -= GRAVITY * h;
    s.vel.multiplyScalar(Math.exp(-h * (AIR_DRAG + (hold ? HOLD_SETTLE : 0))));
    s.pos.addScaledVector(s.vel, h);
    if (hold) s.pos.lerp(swingArm.set(g.x, g.y - ROPE, g.z), 1 - Math.exp(-h * HOLD_SETTLE));
    swingArm.subVectors(s.pos, g);
    const across = Math.hypot(swingArm.x, swingArm.z);
    const lean = Math.min(Math.atan2(across, -swingArm.y), MAX_SWING);
    const k = across > 1e-6 ? (ROPE * Math.sin(lean)) / across : 0;
    s.pos.set(g.x + swingArm.x * k, g.y - ROPE * Math.cos(lean), g.z + swingArm.z * k);
    if (h > 0) s.vel.subVectors(s.pos, swingWas).divideScalar(h);
  }
  s.grip.copy(grip);
}

function spriteGeometry(height: number, aspect: number, anchor: { x: number; y: number }) {
  const width = height * aspect;
  return new PlaneGeometry(width, height).translate(-anchor.x * width, height / 2 - anchor.y * height, 0);
}

function spriteMaterial(map: Texture, maxAnisotropy: number, wisp = false) {
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = Math.min(4, maxAnisotropy);
  return new MeshBasicMaterial({ map, transparent: true, alphaTest: wisp ? 0.02 : 0.3, depthWrite: !wisp, side: DoubleSide, toneMapped: false });
}

const light = new Color();

interface Art {
  standing: MeshBasicMaterial;
  smoke: MeshBasicMaterial;
  walking: MeshBasicMaterial;
  shadow: MeshBasicMaterial;
  rope: MeshStandardMaterial;
}

function matchTimeOfDay(art: Art, dn: DayNight) {
  light.setRGB(1, 1, 1).lerp(dn.sunColor, 0.3).multiplyScalar(0.94 - 0.36 * dn.night);
  art.standing.color.copy(light);
  art.smoke.color.copy(light);
  art.walking.color.copy(light);
  art.shadow.opacity = 0.85 - 0.35 * dn.night;
  art.rope.emissiveIntensity = 0.08 + 0.17 * (1 - dn.night);
}

const up = new Vector3(0, 1, 0);

function ignoreRaycast() {}
const gripWorld = new Vector3();
const ropeEnd = new Vector3();
const ropeDir = new Vector3();

function faceCamera(obj: Group, camera: Vector3) {
  return Math.atan2(camera.x - obj.position.x, camera.z - obj.position.z);
}

interface RoofLift {
  value: number;
  hang: number;
}

const reachHang = new Vector3();

function poseRopeReach(rope: Mesh, body: Group, camera: Vector3, reach: number, lift: number) {
  body.updateWorldMatrix(true, false);
  gripWorld.copy(GRIP).applyMatrix4(body.matrixWorld);
  reachHang.set(gripWorld.x, gripWorld.y - ROPE + lift, gripWorld.z);
  const yaw = Math.atan2(camera.x - reachHang.x, camera.z - reachHang.z);
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  ropeEnd.set(ROPE_END.x * cos + ROPE_END.z * sin, ROPE_END.y, -ROPE_END.x * sin + ROPE_END.z * cos).add(reachHang);
  ropeEnd.lerpVectors(gripWorld, ropeEnd, reach);
  ropeDir.subVectors(gripWorld, ropeEnd);
  rope.position.copy(ropeEnd).addScaledVector(ropeDir, 0.5);
  rope.scale.set(1, ropeDir.length(), 1);
  rope.quaternion.setFromUnitVectors(up, ropeDir.normalize());
}

function liftWithHotspot(lift: RoofLift, listenHovered: boolean, dt: number, carried: boolean, held: boolean) {
  const target = listenHovered ? ROOF_RISE * HOTSPOT_GROW : 0;
  lift.value += (target - lift.value) * (1 - Math.exp(-dt * 10));
  lift.hang = carried ? lift.hang + ((held ? lift.value : 0) - lift.hang) * (1 - Math.exp(-dt * 4)) : lift.value;
}

function poseRoof(roof: Group, shadow: Mesh | null, camera: Vector3, t: number, still: boolean, lift: number) {
  const beat = still ? 0 : t * BEAT_HZ * Math.PI;
  const spread = lift / ROOF_RISE;
  roof.position.set(STAND.x + ROOF_SPOT.x * spread, STAND.y + lift, STAND.z + ROOF_SPOT.z * spread);
  roof.rotation.set(0, faceCamera(roof, camera), still ? 0 : Math.sin(beat) * 0.035, "YXZ");
  const accent = 0.75 + 0.25 * Math.sin(t * BAR_SWELL_HZ * Math.PI * 2);
  const bounce = still ? 0 : Math.sin(beat * 2) ** 2 * accent;
  roof.scale.set(1 - bounce * 0.012, 1 + bounce * 0.025, 1);
  if (shadow) {
    shadow.position.set(roof.position.x + SHADOW.x, STAND.y + lift + 0.05, roof.position.z);
    shadow.scale.setScalar(1 - bounce * 0.04);
  }
}

function poseSmoke(smoke: Group, mat: MeshBasicMaterial, t: number, still: boolean) {
  if (still) {
    smoke.position.copy(SMOKE_ROOT);
    smoke.rotation.set(0, 0, 0);
    smoke.scale.setScalar(1);
    mat.opacity = SMOKE_OPACITY;
    smoke.visible = true;
    return;
  }
  const p = (t % PUFF_SECONDS) / PUFF_SECONDS;
  const born = MathUtils.smoothstep(p, 0, 0.14);
  const gone = MathUtils.smoothstep(p, 0.62, 0.95);
  const travel = 1 - (1 - p) * (1 - p);
  mat.opacity = SMOKE_OPACITY * born * (1 - gone);
  smoke.visible = mat.opacity > 0.01;
  smoke.position.set(SMOKE_ROOT.x + travel * PUFF_DRIFT + Math.sin(t * 0.6) * 0.08, SMOKE_ROOT.y + travel * PUFF_RISE, SMOKE_ROOT.z);
  smoke.rotation.set(0, 0, Math.sin(t * 0.8) * 0.05 - travel * 0.1);
  smoke.scale.setScalar((0.55 + 0.45 * born + PUFF_SWELL * travel) * (1 + Math.sin(t * 2.1) * 0.015));
}

function poseHanging(hang: Group | null, rope: Mesh | null, body: Group | null, swing: Swing, camera: Vector3, dt: number, hold: boolean, lift: number) {
  if (!hang || !rope || !body) return;
  body.updateWorldMatrix(true, false);
  gripWorld.copy(GRIP).applyMatrix4(body.matrixWorld);
  if (!swing.active) settleSwing(swing, gripWorld);
  else stepSwing(swing, gripWorld, dt, hold);
  hang.position.copy(swing.pos);
  hang.position.y += lift;
  const yaw = faceCamera(hang, camera);
  ropeDir.subVectors(gripWorld, swing.pos);
  const across = ropeDir.x * Math.cos(yaw) - ropeDir.z * Math.sin(yaw);
  hang.rotation.set(0, yaw, -Math.atan2(across, ropeDir.y), "YXZ");
  hang.updateMatrix();
  ropeEnd.copy(ROPE_END).applyMatrix4(hang.matrix);
  ropeDir.subVectors(gripWorld, ropeEnd);
  rope.position.copy(ropeEnd).addScaledVector(ropeDir, 0.5);
  rope.scale.set(1, ropeDir.length(), 1);
  rope.quaternion.setFromUnitVectors(up, ropeDir.normalize());
}

export default function AlterEgo({ flyBy }: { flyBy: boolean }) {
  const dn = useDayNight();
  const { reducedMotion, navigating, hoveredRef } = useCity();
  const [lift] = useState<RoofLift>(() => ({ value: 0, hang: 0 }));
  const [standingMap, smokeMap, walkingMap] = useTexture([STANDING.src, SMOKE.src, WALKING.src]);
  const gl = useThree((s) => s.gl);
  const [art] = useState(() => {
    const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
    const shadowMap = makeShadowBlobTexture();
    return {
      standingGeo: spriteGeometry(STAND_H, STANDING.aspect, STANDING.anchor),
      smokeGeo: spriteGeometry(SMOKE.height, SMOKE.aspect, SMOKE.anchor),
      walkingGeo: spriteGeometry(WALK_H, WALKING.aspect, WALKING.anchor),
      standing: spriteMaterial(standingMap, maxAnisotropy),
      smoke: spriteMaterial(smokeMap, maxAnisotropy, true),
      walking: spriteMaterial(walkingMap, maxAnisotropy),
      shadowMap,
      shadow: new MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, opacity: 0.85 }),
      rope: new MeshStandardMaterial({ color: ROPE_COLOR, emissive: ROPE_COLOR, emissiveIntensity: 0.25, roughness: 0.85 }),
    };
  });
  useEffect(
    () => () => {
      art.standingGeo.dispose();
      art.smokeGeo.dispose();
      art.walkingGeo.dispose();
      art.standing.dispose();
      art.smoke.dispose();
      art.walking.dispose();
      art.shadowMap.dispose();
      art.shadow.dispose();
      art.rope.dispose();
    },
    [art],
  );
  useEffect(() => matchTimeOfDay(art, dn), [art, dn]);

  const [flight] = useState<Flight>(() => ({ pos: new Vector3(), ahead: new Vector3(), yaw: ENTRY_YAW, lastT: -1, speed: 0, accel: 0, pitch: HELI_PITCH }));
  const [drift] = useState(() => new Vector3());
  const [swing] = useState<Swing>(() => ({ pos: new Vector3(), vel: new Vector3(), grip: new Vector3(), active: false }));
  const label = useLingeringLabel();
  const roof = useRef<Group>(null);
  const smoke = useRef<Group>(null);
  const shadow = useRef<Mesh>(null);
  const hang = useRef<Group>(null);
  const rope = useRef<Mesh>(null);
  const chopper = useRef<Group>(null);
  const body = useRef<Group>(null);
  const rotor = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const beam = useRef<Group>(null);
  const [parts] = useState<HelicopterParts>(() => ({ body, rotor, tail, beam }));

  useFrame(({ clock, camera }, delta) => {
    const t = clock.elapsedTime;
    const dt = Math.min(0.1, delta);
    const c = t % CYCLE;
    const flying = flyBy && !reducedMotion && c >= VISIBLE[0] && c <= VISIBLE[1];
    const hanging = flying && c >= PICKUP && c < DROP;
    const hold = inHold(c);
    const heli = chopper.current;
    if (heli) {
      heli.visible = flying;
      if (flying) {
        const yawRate = steerFlight(flight, c);
        heli.position.copy(flight.pos).add(holdDrift(t, c, drift));
        heli.rotation.set(0, flight.yaw, 0);
        spinHelicopter(parts, t, dt, hold ? 0 : -yawRate * 0.83, flight.pitch, hold);
      } else {
        resetFlight(flight);
      }
    }
    const onRoof = roof.current;
    if (onRoof) {
      onRoof.visible = !hanging;
      liftWithHotspot(lift, hoveredRef.current?.id === "listen", dt, hanging, hold);
      if (!hanging) poseRoof(onRoof, shadow.current, camera.position, t, reducedMotion, lift.value);
    }
    if (shadow.current) shadow.current.visible = !hanging;
    if (smoke.current && !hanging) poseSmoke(smoke.current, art.smoke, t, reducedMotion);
    if (hanging && label.on) label.hide();
    if (hang.current) hang.current.visible = hanging;
    const reach = flying && !hanging ? ropeReach(c) : 0;
    if (rope.current) rope.current.visible = hanging || reach > 0.001;
    if (hanging) poseHanging(hang.current, rope.current, body.current, swing, camera.position, dt, hold, lift.hang);
    else {
      releaseSwing(swing);
      if (reach > 0.001 && rope.current && body.current) poseRopeReach(rope.current, body.current, camera.position, reach, lift.value);
    }
  });

  const named = ALTER_EGO.name.length > 0;

  return (
    <group name="alter-ego">
      {flyBy && (
        <group ref={chopper} visible={false}>
          <group scale={CHOPPER_SCALE}>
            <HelicopterBody livery={DETROIT_POLICE} bodyRef={body} rotorRef={rotor} tailRef={tail} beamRef={beam} />
          </group>
        </group>
      )}
      <mesh ref={shadow} position={[STAND.x + SHADOW.x, STAND.y + 0.05, STAND.z]} rotation={[-Math.PI / 2, 0, 0]} material={art.shadow} renderOrder={-1} raycast={ignoreRaycast}>
        <planeGeometry args={[SHADOW.width, SHADOW.depth]} />
      </mesh>
      <group
        ref={roof}
        position={STAND.toArray()}
        onPointerOver={() => {
          if (named && roof.current?.visible) label.show();
        }}
        onPointerOut={label.hide}
      >
        <mesh geometry={art.standingGeo} material={art.standing} />
        <group ref={smoke} position={SMOKE_ROOT.toArray()}>
          <mesh geometry={art.smokeGeo} material={art.smoke} renderOrder={1} raycast={ignoreRaycast} />
        </group>
        {label.mounted && named && !navigating && (
          <Html position={[0, TAG_Y, 0]} center distanceFactor={90} style={{ pointerEvents: "none" }} zIndexRange={[40, 0]}>
            <div className={`landmark-label ${label.on ? "is-on" : ""}`} style={LABEL_FADE_STYLE}>
              <strong>{ALTER_EGO.name}</strong>
              <span>{ALTER_EGO.note}</span>
            </div>
          </Html>
        )}
      </group>
      <group ref={hang} visible={false}>
        <mesh geometry={art.walkingGeo} material={art.walking} raycast={ignoreRaycast} />
      </group>
      <mesh ref={rope} visible={false} material={art.rope} raycast={ignoreRaycast}>
        <cylinderGeometry args={[0.13, 0.13, 1, 6]} />
      </mesh>
    </group>
  );
}
