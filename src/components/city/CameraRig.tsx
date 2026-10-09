"use client";

import { CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Box3, Vector3 } from "three";
import { useCity } from "./CityContext";
import { HOME_CAMERA, INTRO_CAMERA, destinationPosition, type Destination } from "./layout";

const EYE_FLOOR = 3.2;
const MAX_POLAR = 1.56;

export default function CameraRig() {
  const ref = useRef<CameraControls>(null);
  const { flyRef, camRef, reducedMotion, navigating } = useCity();
  const size = useThree((s) => s.size);
  const keys = useRef(new Set<string>());
  const tmpTarget = useRef(new Vector3());

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
      if (isTyping(e)) return;
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "q", "e", "pageup", "pagedown", "+", "-", "=", "_", "r"].includes(k)) {
        keys.current.add(k);
        if (k.startsWith("arrow") || k.startsWith("page")) e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", () => keys.current.clear());
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
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
      if (k.has("arrowleft") || k.has("a")) tx -= step;
      if (k.has("arrowright") || k.has("d")) tx += step;
      if (k.has("arrowup") || k.has("w")) ty += step;
      if (k.has("arrowdown") || k.has("s")) ty -= step;
      if (tx || ty) c.truck(tx, 0, false);
      if (ty) c.forward(ty, false);
      if (k.has("q") || k.has("pagedown")) c.elevate(-step, false);
      if (k.has("e") || k.has("pageup")) c.elevate(step, false);
      if (k.has("+") || k.has("=")) c.dolly(step, false);
      if (k.has("-") || k.has("_")) c.dolly(-step, false);
      if (k.has("r")) {
        k.delete("r");
        c.setLookAt(...HOME_CAMERA.position, ...HOME_CAMERA.target, !reducedMotion);
      }
      return;
    }
    if (reducedMotion || c.active) return;
    c.rotate(Math.sin(clock.elapsedTime * 0.12) * 0.00009, Math.cos(clock.elapsedTime * 0.09) * 0.00003, false);
  });

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.setBoundary(new Box3(new Vector3(-620, EYE_FLOOR, -720), new Vector3(620, 270, 470)));
    c.boundaryEnclosesCamera = true;
    const portrait = size.width < size.height;
    const home = {
      position: [HOME_CAMERA.position[0], HOME_CAMERA.position[1] + (portrait ? 40 : 0), HOME_CAMERA.position[2] + (portrait ? 190 : 0)] as [number, number, number],
      target: HOME_CAMERA.target,
    };
    c.setLookAt(...INTRO_CAMERA.position, ...INTRO_CAMERA.target, false);
    const run = async () => {
      if (reducedMotion) {
        await c.setLookAt(...home.position, ...home.target, false);
        return;
      }
      await c.setLookAt(...home.position, ...home.target, true);
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
