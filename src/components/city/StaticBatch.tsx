"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import type { Group } from "three";
import { createBatcher, disposeBatcher, tickBatcher, type Batcher } from "./batching";

export default function StaticBatch({ label, children }: { label: string; children: ReactNode }) {
  const root = useRef<Group>(null);
  const batcher = useRef<Batcher | null>(null);
  useEffect(() => {
    if (!root.current) return;
    const b = createBatcher(root.current, label);
    batcher.current = b;
    return () => {
      disposeBatcher(b);
      batcher.current = null;
    };
  }, [label]);
  useFrame(() => {
    if (batcher.current) tickBatcher(batcher.current);
  });
  return <group ref={root}>{children}</group>;
}
