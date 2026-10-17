"use client";

import { CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Box3, MathUtils, PerspectiveCamera, Vector3 } from "three";
import { collectSolids, pushOutOfSolids, type Solids } from "./cameraCollision";
import { useCity, type Move } from "./CityContext";
import { CAMERA_CEILING, INTRO_CAMERA, destinationPosition, homeCamera, type Destination } from "./layout";

const EYE_FLOOR = 3.2;
const SOLID_MARGIN = 2;
const MAX_POLAR = 1.56;
const FLY_DISTRICT_SECONDS = 2;
const FLY_HOME_SECONDS = 1.6;
const FLY_INTRO_SECONDS = 3.4;
const MOVE_RESPONSE = 7;
const MOVE_SPEED = 0.32;
const DRIFT_YAW = 0.0054;
const DRIFT_PITCH = 0.0018;
const WORLD_BOUNDS = new Box3(new Vector3(-620, EYE_FLOOR, -720), new Vector3(620, CAMERA_CEILING, 470));

function applyFov(cam: PerspectiveCamera, fov: number) {
  cam.fov = fov;
  cam.updateProjectionMatrix();
}

const ACTIONS: Record<string, Move | "home"> = {
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
  arrowup: "forward",
  w: "forward",
  arrowdown: "back",
  s: "back",
  e: "up",
  pageup: "up",
  q: "down",
  pagedown: "down",
  "+": "in",
  "=": "in",
  "-": "out",
  _: "out",
  r: "home",
};

type Vec3 = [number, number, number];

export interface CameraView {
  position: Vec3;
  target: Vec3;
}

interface Pose {
  tx: number;
  ty: number;
  tz: number;
  radius: number;
  theta: number;
  phi: number;
}

interface Flight {
  from: Pose;
  to: Pose;
  start: number;
  duration: number;
  home: boolean;
  done: () => void;
}

function poseOf(p: Vector3, t: Vector3): Pose {
  const dx = p.x - t.x;
  const dy = p.y - t.y;
  const dz = p.z - t.z;
  const radius = Math.max(0.001, Math.hypot(dx, dy, dz));
  return { tx: t.x, ty: t.y, tz: t.z, radius, theta: Math.atan2(dx, dz), phi: Math.acos(Math.min(1, Math.max(-1, dy / radius))) };
}

function viewOf(pose: Pose): CameraView {
  const s = Math.sin(pose.phi) * pose.radius;
  return {
    position: [pose.tx + s * Math.sin(pose.theta), pose.ty + Math.cos(pose.phi) * pose.radius, pose.tz + s * Math.cos(pose.theta)],
    target: [pose.tx, pose.ty, pose.tz],
  };
}

function shortestTurn(from: number, to: number) {
  const d = ((((to - from) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return from + d;
}

function axis(keys: Set<Move>, pad: Set<Move>, plus: Move, minus: Move) {
  return (keys.has(plus) || pad.has(plus) ? 1 : 0) - (keys.has(minus) || pad.has(minus) ? 1 : 0);
}

export default function CameraRig({ live, resumeRef }: { live: boolean; resumeRef: RefObject<CameraView | null> }) {
  const ref = useRef<CameraControls>(null);
  const { flyRef, homeRef, held, reducedMotion, navigating, active } = useCity();
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  const clock = useThree((s) => s.clock);
  const aspect = size.width / size.height;
  const vel = useRef({ x: 0, y: 0, f: 0, d: 0 });
  const keys = useRef(new Set<Move>());
  const flight = useRef<Flight | null>(null);
  const solids = useRef<Solids | null>(null);
  const [scratch] = useState(() => ({ p: new Vector3(), t: new Vector3(), eye: new Vector3() }));
  const placed = useRef(false);
  const introPlayed = useRef(false);
  const takeOver = useRef(() => {});

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && ref.current) {
      (window as unknown as { __cityControls?: CameraControls }).__cityControls = ref.current;
    }
  }, []);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const { p, t } = scratch;
    const stopFlight = () => {
      flight.current?.done();
      flight.current = null;
    };
    const settle = () => {
      stopFlight();
      const v = vel.current;
      v.x = v.f = v.y = v.d = 0;
    };
    const fly = (to: Vec3, at: Vec3, duration: number, home = false) => {
      settle();
      c.normalizeRotations();
      c.maxPolarAngle = MAX_POLAR;
      const from = poseOf(c.getPosition(p, false), c.getTarget(t, false));
      const end = poseOf(p.set(...to), t.set(...at));
      end.theta = shortestTurn(from.theta, end.theta);
      return new Promise<void>((resolve) => {
        flight.current = { from, to: end, start: clock.elapsedTime, duration, home, done: resolve };
      });
    };
    const jump = (to: Vec3, at: Vec3) => {
      settle();
      return c.setLookAt(...to, ...at, false);
    };
    homeRef.current = () => {
      if (navigating) return;
      const home = homeCamera(aspect);
      void (reducedMotion ? jump(home.position, home.target) : fly(home.position, home.target, FLY_HOME_SECONDS, true));
    };
    flyRef.current = async (d: Destination) => {
      const [x, z] = destinationPosition(d);
      const from: Vec3 = [x + d.view.from[0], d.view.from[1], z + d.view.from[2]];
      const at: Vec3 = [x + d.view.at[0], d.view.at[1], z + d.view.at[2]];
      await (reducedMotion ? jump(from, at) : fly(from, at, FLY_DISTRICT_SECONDS));
    };
    if (!placed.current) {
      placed.current = true;
      c.setBoundary(WORLD_BOUNDS);
      c.boundaryEnclosesCamera = true;
      const view = resumeRef.current;
      resumeRef.current = null;
      if (view) {
        introPlayed.current = true;
        void jump(view.position, view.target);
      } else if (reducedMotion) {
        introPlayed.current = true;
        const home = homeCamera(aspect);
        void jump(home.position, home.target);
      } else void jump(INTRO_CAMERA.position, INTRO_CAMERA.target);
    }
    if (live && !introPlayed.current) {
      introPlayed.current = true;
      if (!navigating && !flight.current) {
        const home = homeCamera(aspect);
        void fly(home.position, home.target, FLY_INTRO_SECONDS, true);
      }
    }
    const current = flight.current;
    if (current?.home) {
      const home = homeCamera(aspect);
      current.to = poseOf(p.set(...home.position), t.set(...home.target));
      current.to.theta = shortestTurn(current.from.theta, current.to.theta);
    }
    const yieldFlight = () => {
      if (!navigating) stopFlight();
    };
    takeOver.current = yieldFlight;
    const canvas = gl.domElement;
    c.addEventListener("controlstart", yieldFlight);
    canvas.addEventListener("wheel", yieldFlight, { passive: true });
    return () => {
      c.removeEventListener("controlstart", yieldFlight);
      canvas.removeEventListener("wheel", yieldFlight);
      flyRef.current = null;
      homeRef.current = null;
    };
  }, [aspect, clock, flyRef, gl, homeRef, live, navigating, reducedMotion, resumeRef, scratch]);

  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    };
    const pressed = keys.current;
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const action = ACTIONS[key];
      if (!active || isTyping(e) || !action || e.metaKey || e.ctrlKey || e.altKey) return;
      if (key.startsWith("arrow") || key.startsWith("page")) e.preventDefault();
      if (action === "home") {
        if (!e.repeat) homeRef.current?.();
        return;
      }
      if (!e.repeat) takeOver.current();
      pressed.add(action);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Meta") pressed.clear();
      const action = ACTIONS[e.key.toLowerCase()];
      if (action && action !== "home") pressed.delete(action);
    };
    const clear = () => {
      pressed.clear();
      held.current.clear();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [active, held, homeRef]);

  const wasActive = useRef(active);
  useEffect(() => {
    const returning = active && !wasActive.current;
    wasActive.current = active;
    if (returning && introPlayed.current) homeRef.current?.();
  }, [active, homeRef]);

  useFrame((state, delta) => {
    const c = ref.current;
    if (!c) return;
    const dt = Math.min(delta, 0.05);
    const f = flight.current;
    if (f && !navigating && held.current.size > 0) takeOver.current();
    if (f && flight.current) {
      const u = Math.min(1, (state.clock.elapsedTime - f.start) / f.duration);
      const e = MathUtils.smootherstep(u, 0, 1);
      const tx = f.from.tx + (f.to.tx - f.from.tx) * e;
      const ty = f.from.ty + (f.to.ty - f.from.ty) * e;
      const tz = f.from.tz + (f.to.tz - f.from.tz) * e;
      const radius = Math.exp(Math.log(f.from.radius) + (Math.log(f.to.radius) - Math.log(f.from.radius)) * e);
      const theta = f.from.theta + (f.to.theta - f.from.theta) * e;
      const phi = f.from.phi + (f.to.phi - f.from.phi) * e;
      const s = Math.sin(phi) * radius;
      void c.setLookAt(tx + s * Math.sin(theta), ty + Math.cos(phi) * radius, tz + s * Math.cos(theta), tx, ty, tz, false);
      if (u >= 1) {
        flight.current = null;
        f.done();
      }
      return;
    }
    if (navigating) return;
    const target = c.getTarget(scratch.t);
    const need = (EYE_FLOOR - target.y) / Math.max(c.distance, 0.001);
    c.maxPolarAngle = need >= 1 ? 0.02 : need <= -1 ? MAX_POLAR : Math.min(MAX_POLAR, Math.acos(need));
    const k = keys.current;
    const pad = held.current;
    const v = vel.current;
    v.x = MathUtils.damp(v.x, axis(k, pad, "right", "left"), MOVE_RESPONSE, dt);
    v.f = MathUtils.damp(v.f, axis(k, pad, "forward", "back"), MOVE_RESPONSE, dt);
    v.y = MathUtils.damp(v.y, axis(k, pad, "up", "down"), MOVE_RESPONSE, dt);
    v.d = MathUtils.damp(v.d, axis(k, pad, "in", "out"), MOVE_RESPONSE, dt);
    if (Math.abs(v.x) + Math.abs(v.f) + Math.abs(v.y) + Math.abs(v.d) > 0.002) {
      const step = Math.max(2, c.distance) * MOVE_SPEED * dt;
      if (v.x) c.truck(v.x * step, 0, false);
      if (v.f) c.forward(v.f * step, false);
      if (v.y) c.elevate(v.y * step, false);
      if (v.d) c.dolly(v.d * step, false);
      return;
    }
    v.x = v.f = v.y = v.d = 0;
    if (reducedMotion || c.active) return;
    const t = state.clock.elapsedTime;
    c.rotate(Math.sin(t * 0.12) * DRIFT_YAW * dt, Math.cos(t * 0.09) * DRIFT_PITCH * dt, false);
  });

  useFrame(() => {
    const c = ref.current;
    if (!c || !live) return;
    if (!solids.current) solids.current = collectSolids(scene, SOLID_MARGIN);
    const s = solids.current;
    const heading = c.getPosition(scratch.eye, true);
    if (pushOutOfSolids(s, heading)) void c.setPosition(heading.x, heading.y, heading.z, true);
    const now = c.getPosition(scratch.eye, false);
    if (!pushOutOfSolids(s, now)) return;
    void c.setPosition(now.x, now.y, now.z, false);
    c.update(0);
  });

  useEffect(() => {
    const canvas = gl.domElement;
    const remember = () => {
      const c = ref.current;
      if (!c || !introPlayed.current) return;
      const f = flight.current;
      resumeRef.current = f
        ? viewOf(f.to)
        : { position: c.getPosition(scratch.p, false).toArray(), target: c.getTarget(scratch.t, false).toArray() };
    };
    canvas.addEventListener("webglcontextlost", remember);
    return () => canvas.removeEventListener("webglcontextlost", remember);
  }, [gl, resumeRef, scratch]);

  useEffect(() => {
    const cam = ref.current?.camera;
    if (cam instanceof PerspectiveCamera) applyFov(cam, homeCamera(aspect).fov);
  }, [aspect]);

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={2.5}
      maxDistance={720}
      minPolarAngle={0.05}
      maxPolarAngle={MAX_POLAR}
      smoothTime={0.7}
      draggingSmoothTime={0.14}
      dollySpeed={0.8}
      truckSpeed={1.6}
      dollyToCursor
      infinityDolly={false}
      mouseButtons-right={2}
      mouseButtons-middle={2}
      mouseButtons-shiftLeft={2}
      touches-two={4096}
      touches-three={128}
    />
  );
}
