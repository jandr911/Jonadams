"use client";

import { useEffect, useRef, useState } from "react";
import { LABEL_FADE_MS } from "./layout";

export function useLingeringLabel() {
  const [on, setOn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = () => {
    clearTimeout(timer.current);
    setOn(true);
    setMounted(true);
  };
  const hide = () => {
    setOn(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMounted(false), LABEL_FADE_MS);
  };
  return { on, mounted, show, hide };
}
