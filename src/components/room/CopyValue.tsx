"use client";

import { useEffect, useRef, useState } from "react";
import { JOIN } from "@/content/site";

type Status = "idle" | "copied" | "blocked";

export default function CopyValue({ value, display }: { value: string; display: string }) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timer = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const selectValue = () => {
    const el = valueRef.current;
    const selection = window.getSelection();
    if (!el || !selection) return;
    selection.removeAllRanges();
    selection.selectAllChildren(el);
  };

  const onCopy = async () => {
    if (!navigator.clipboard?.writeText) {
      selectValue();
      setStatus("blocked");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch (err) {
      console.error(err);
      selectValue();
      setStatus("blocked");
    }
  };

  return (
    <>
      <span ref={valueRef} className="join-contact__value">
        {display}
      </span>
      <button type="button" className="join-contact__copy" onClick={onCopy} aria-label={`${JOIN.copy} ${display}`}>
        {JOIN.copy}
      </button>
      <span className="join-contact__status" role="status" aria-live="polite">
        {status === "copied" ? JOIN.copied : status === "blocked" ? JOIN.copyBlocked : ""}
      </span>
    </>
  );
}
