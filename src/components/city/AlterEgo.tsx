"use client";

import { Html, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, SRGBColorSpace, Vector3, type Texture } from "three";
import { ALTER_EGO } from "@/content/site";
import { DETROIT_POLICE, HELI_PITCH, HELI_SKID_DROP, HELI_SKID_X, HelicopterBody, spinHelicopter, type HelicopterParts } from "./Aircraft";
import { useCity } from "./CityContext";
import { useDayNight } from "./DayNightContext";
import { LISTEN_ROOF_Y, PAD } from "./Landmarks";
import { destinationById, destinationPosition } from "./layout";

const STANDING = { src: ALTER_EGO.art.standing, aspect: 225 / 512 };
const WALKING = { src: ALTER_EGO.art.walking, aspect: 221 / 512 };
const HEIGHT = 24;
const WALK_HAND = { x: 0.09, y: 0.55 };
const ROPE = 12;

const CHOPPER_SCALE = 2.4;
const GRIP = new Vector3(HELI_SKID_X, -HELI_SKID_DROP, 0);
const ROOF_SPOT = { x: -6, z: 4.5 };
const HOTSPOT_GROW = 0.035;

const [FOX_X, FOX_Z] = destinationPosition(destinationById("listen"));
const STAND = new Vector3(FOX_X + ROOF_SPOT.x, LISTEN_ROOF_Y, FOX_Z + ROOF_SPOT.z);
const HAND_HEIGHT = WALK_HAND.y * HEIGHT;
const HOVER = new Vector3(
  STAND.x - HELI_SKID_X * CHOPPER_SCALE,
  STAND.y + HAND_HEIGHT + ROPE + HELI_SKID_DROP * Math.cos(HELI_PITCH) * CHOPPER_SCALE,
  STAND.z + HELI_SKID_DROP * Math.sin(HELI_PITCH) * CHOPPER_SCALE,
);

const CYCLE = 115;
const VISIBLE = [50, 113] as const;
const PICKUP = 67.5;
const DROP = 96.5;
const HOLDS = [
  [65.2, 69.8],
  [94.2, 98.8],
] as const;

const at = (dx: number, dy: number, dz: number) => new Vector3(HOVER.x + dx, HOVER.y + dy, HOVER.z + dz);

const FLIGHT: { t: number; p: Vector3 }[] = [
  { t: 50, p: new Vector3(-800, 72, 100) },
  { t: 61, p: new Vector3(-200, 64, 100) },
  { t: 64, p: at(0, 3, 12) },
  { t: 65, p: at(0, 3, 0) },
  { t: 66, p: at(0, 0, 0) },
  { t: 69, p: at(0, 0, 0) },
  { t: 69.8, p: at(0, 3, 0) },
  { t: 71, p: at(0, 3, 12) },
  { t: 76, p: new Vector3(-20, 60, 100) },
  { t: 81, p: new Vector3(100, 60, 100) },
  { t: 82.5, p: new Vector3(125, 60, 100) },
  { t: 84.5, p: new Vector3(125, 60, 100) },
  { t: 89, p: new Vector3(20, 60, 100) },
  { t: 92.5, p: new Vector3(-70, 64, 99) },
  { t: 94, p: at(0, 3, 12) },
  { t: 95, p: at(0, 3, 0) },
  { t: 95.8, p: at(0, 0, 0) },
  { t: 98, p: at(0, 0, 0) },
  { t: 99, p: at(0, 3, 0) },
  { t: 101, p: at(0, 3, 14) },
  { t: 106, p: new Vector3(-300, 64, 100) },
  { t: 113, p: new Vector3(-800, 72, 100) },
];

const BEAT_HZ = 1.53;

interface Flight {
  pos: Vector3;
  ahead: Vector3;
  yaw: number;
  lastT: number;
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
  return dt > 0 ? wrapAngle(f.yaw - before) / dt : 0;
}

function spriteGeometry(aspect: number, anchor: { x: number; y: number }) {
  return new PlaneGeometry(HEIGHT * aspect, HEIGHT).translate(-anchor.x * HEIGHT * aspect, HEIGHT / 2 - anchor.y * HEIGHT, 0);
}

function spriteMaterial(map: Texture) {
  map.colorSpace = SRGBColorSpace;
  return new MeshBasicMaterial({ map, alphaTest: 0.5, side: DoubleSide, toneMapped: false });
}

function dimForNight(mats: MeshBasicMaterial[], night: number) {
  for (const m of mats) m.color.setScalar(1 - night * 0.45);
}

const up = new Vector3(0, 1, 0);

function ignoreRaycast() {}
const gripWorld = new Vector3();
const ropeDir = new Vector3();
const ropeQuat = new Quaternion();

function faceCamera(obj: Group, camera: Vector3) {
  return Math.atan2(camera.x - obj.position.x, camera.z - obj.position.z);
}

interface RoofLift {
  value: number;
}

function liftWithHotspot(lift: RoofLift, listenHovered: boolean, dt: number) {
  const target = listenHovered ? (LISTEN_ROOF_Y - PAD) * HOTSPOT_GROW : 0;
  lift.value += (target - lift.value) * (1 - Math.exp(-dt * 10));
}

function poseRoof(roof: Group, camera: Vector3, t: number, still: boolean, lift: number) {
  const beat = still ? 0 : t * BEAT_HZ * Math.PI * 2;
  roof.position.copy(STAND);
  roof.position.y += lift;
  roof.rotation.set(0, faceCamera(roof, camera), still ? 0 : Math.sin(beat * 0.5) * 0.035, "YXZ");
  const bounce = still ? 0 : Math.abs(Math.sin(beat));
  roof.scale.set(1 - bounce * 0.012, 1 + bounce * 0.025, 1);
}

function poseHanging(hang: Group | null, rope: Mesh | null, body: Group | null, camera: Vector3, t: number, still: boolean, lift: number) {
  if (!hang || !rope || !body) return;
  body.updateWorldMatrix(true, false);
  gripWorld.copy(GRIP).applyMatrix4(body.matrixWorld);
  hang.position.set(gripWorld.x, gripWorld.y - ROPE + lift, gripWorld.z);
  hang.rotation.set(0, faceCamera(hang, camera), still ? 0 : Math.sin(t * 1.4) * 0.07, "YXZ");
  ropeDir.subVectors(gripWorld, hang.position);
  rope.position.copy(hang.position).addScaledVector(ropeDir, 0.5);
  rope.scale.set(1, ropeDir.length(), 1);
  ropeQuat.setFromUnitVectors(up, ropeDir.normalize());
  rope.quaternion.copy(ropeQuat);
}

export default function AlterEgo({ flyBy }: { flyBy: boolean }) {
  const dn = useDayNight();
  const { reducedMotion, navigating, hovered } = useCity();
  const [lift] = useState<RoofLift>(() => ({ value: 0 }));
  const [standingMap, walkingMap] = useTexture([STANDING.src, WALKING.src]);
  const [art] = useState(() => ({
    standingGeo: spriteGeometry(STANDING.aspect, { x: 0, y: 0 }),
    walkingGeo: spriteGeometry(WALKING.aspect, { x: WALK_HAND.x, y: WALK_HAND.y }),
    standing: spriteMaterial(standingMap),
    walking: spriteMaterial(walkingMap),
  }));
  useEffect(
    () => () => {
      art.standingGeo.dispose();
      art.walkingGeo.dispose();
      art.standing.dispose();
      art.walking.dispose();
    },
    [art],
  );
  useEffect(() => dimForNight([art.standing, art.walking], dn.night), [art, dn.night]);

  const [flight] = useState<Flight>(() => ({ pos: new Vector3(), ahead: new Vector3(), yaw: ENTRY_YAW, lastT: -1 }));
  const [hover, setHover] = useState(false);
  const roof = useRef<Group>(null);
  const hang = useRef<Group>(null);
  const rope = useRef<Mesh>(null);
  const chopper = useRef<Group>(null);
  const body = useRef<Group>(null);
  const rotor = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const beam = useRef<Group>(null);
  const [parts] = useState<HelicopterParts>(() => ({ body, rotor, tail, beam }));

  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime;
    const c = t % CYCLE;
    const flying = flyBy && c >= VISIBLE[0] && c <= VISIBLE[1];
    const hanging = flying && c >= PICKUP && c < DROP;
    const heli = chopper.current;
    if (heli) {
      heli.visible = flying;
      if (flying) {
        const yawRate = steerFlight(flight, c);
        heli.position.copy(flight.pos);
        heli.rotation.set(0, flight.yaw, 0);
        const hold = inHold(c);
        spinHelicopter(parts, t, hold ? 0 : -yawRate * 0.83, hold);
      } else {
        resetFlight(flight);
      }
    }
    const onRoof = roof.current;
    if (onRoof) {
      onRoof.visible = !hanging;
      liftWithHotspot(lift, hovered?.id === "listen", dt);
      if (!hanging) poseRoof(onRoof, camera.position, t, reducedMotion, lift.value);
    }
    if (hanging && hover) setHover(false);
    if (hang.current) hang.current.visible = hanging;
    if (rope.current) rope.current.visible = hanging;
    if (hanging) poseHanging(hang.current, rope.current, body.current, camera.position, t, reducedMotion, inHold(c) ? lift.value : 0);
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
      <group
        ref={roof}
        position={STAND.toArray()}
        onPointerOver={() => {
          if (named && roof.current?.visible) setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      >
        <mesh geometry={art.standingGeo} material={art.standing} />
        {hover && named && !navigating && (
          <Html position={[0, HEIGHT + 1.5, 0]} center distanceFactor={90} style={{ pointerEvents: "none" }} zIndexRange={[40, 0]}>
            <div className="landmark-label">
              <strong>{ALTER_EGO.name}</strong>
              <span>{ALTER_EGO.note}</span>
            </div>
          </Html>
        )}
      </group>
      <group ref={hang} visible={false}>
        <mesh geometry={art.walkingGeo} material={art.walking} raycast={ignoreRaycast} />
      </group>
      <mesh ref={rope} visible={false} raycast={ignoreRaycast}>
        <cylinderGeometry args={[0.09, 0.09, 1, 6]} />
        <meshStandardMaterial color="#2a2622" roughness={0.9} />
      </mesh>
    </group>
  );
}
