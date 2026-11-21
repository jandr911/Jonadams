"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import type { Group } from "three";
import { createBatcher, disposeBatcher, tickBatcher, type Batcher } from "./batching";

export default function StaticBatch({ label, finishes = false, children }: { label: string; finishes?: boolean; children: ReactNode }) {
  const root = useRef<Group>(null);
  const batcher = useRef<Batcher | null>(null);
  useEffect(() => {
    if (!root.current) return;
    const b = createBatcher(root.current, label, finishes);
    batcher.current = b;
    return () => {
      disposeBatcher(b);
      batcher.current = null;
    };
  }, [label, finishes]);
  useFrame(() => {
    if (batcher.current) tickBatcher(batcher.current);
  });
  return <group ref={root}>{children}</group>;
}
