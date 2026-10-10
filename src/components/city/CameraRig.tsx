"use client";

import { CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Box3, PerspectiveCamera, Vector3 } from "three";
import { useCity } from "./CityContext";
import { CAMERA_CEILING, INTRO_CAMERA, destinationPosition, homeCamera, type Destination } from "./layout";

const EYE_FLOOR = 3.2;

function applyFov(cam: PerspectiveCamera, fov: number) {
  cam.fov = fov;
  cam.updateProjectionMatrix();
}
const MAX_POLAR = 1.56;
type Action = "left" | "right" | "forward" | "back" | "up" | "down" | "in" | "out" | "home";

const ACTIONS: Record<string, Action> = {
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

export default function CameraRig() {
  const ref = useRef<CameraControls>(null);
  const { flyRef, camRef, reducedMotion, navigating } = useCity();
  const size = useThree((s) => s.size);
  const aspect = size.width / size.height;
  const keys = useRef(new Set<Action>());
  const tmpTarget = useRef(new Vector3());
  const introPlayed = useRef(false);

  useEffect(() => {
    camRef.current = ref.current;
    if (process.env.NODE_ENV !== "production" && ref.current) {
      (window as unknown as { __cityControls?: CameraControls }).__cityControls = ref.current;
    }
    return () => {
      camRef.current = null;
    };
  }, [camRef]);

  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const action = ACTIONS[key];
      if (isTyping(e) || !action) return;
      keys.current.add(action);
      if (key.startsWith("arrow") || key.startsWith("page")) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      const action = ACTIONS[e.key.toLowerCase()];
      if (action) keys.current.delete(action);
    };
    const clear = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, []);

  useFrame(({ clock }, dt) => {
    const c = ref.current;
    if (!c || navigating) return;
    const target = c.getTarget(tmpTarget.current);
    const need = (EYE_FLOOR - target.y) / Math.max(c.distance, 0.001);
    c.maxPolarAngle = need >= 1 ? 0.02 : need <= -1 ? MAX_POLAR : Math.min(MAX_POLAR, Math.acos(need));
    const k = keys.current;
    if (k.size > 0) {
      const step = Math.max(2, c.distance) * 0.32 * dt;
      let tx = 0;
      let ty = 0;
      if (k.has("left")) tx -= step;
      if (k.has("right")) tx += step;
      if (k.has("forward")) ty += step;
      if (k.has("back")) ty -= step;
      if (tx || ty) c.truck(tx, 0, false);
      if (ty) c.forward(ty, false);
      if (k.has("down")) c.elevate(-step, false);
      if (k.has("up")) c.elevate(step, false);
      if (k.has("in")) c.dolly(step, false);
      if (k.has("out")) c.dolly(-step, false);
      if (k.has("home")) {
        k.delete("home");
        const home = homeCamera(aspect);
        c.setLookAt(...home.position, ...home.target, !reducedMotion);
      }
      return;
    }
    if (reducedMotion || c.active) return;
    c.rotate(Math.sin(clock.elapsedTime * 0.12) * 0.00009, Math.cos(clock.elapsedTime * 0.09) * 0.00003, false);
  });

  useEffect(() => {
    const cam = ref.current?.camera;
    if (cam instanceof PerspectiveCamera) applyFov(cam, homeCamera(aspect).fov);
  }, [aspect]);

  useEffect(() => {
    const c = ref.current;
    if (!c || introPlayed.current) return;
    introPlayed.current = true;
    c.setBoundary(new Box3(new Vector3(-620, EYE_FLOOR, -720), new Vector3(620, CAMERA_CEILING, 470)));
    c.boundaryEnclosesCamera = true;
    const home = homeCamera(aspect);
    c.setLookAt(...INTRO_CAMERA.position, ...INTRO_CAMERA.target, false);
    const run = async () => {
      if (reducedMotion) {
        await c.setLookAt(...home.position, ...home.target, false);
        return;
      }
      await c.setLookAt(...home.position, ...home.target, true);
    };
    void run();
  }, [aspect, reducedMotion]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    flyRef.current = async (d: Destination) => {
      const [x, z] = destinationPosition(d);
      const from: [number, number, number] = [x + d.view.from[0], d.view.from[1], z + d.view.from[2]];
      const at: [number, number, number] = [x + d.view.at[0], d.view.at[1], z + d.view.at[2]];
      await c.setLookAt(...from, ...at, !reducedMotion);
    };
    return () => {
      flyRef.current = null;
    };
  }, [flyRef, reducedMotion]);

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
