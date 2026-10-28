"use client";

import { useEffect } from "react";
import { markOwnDevice } from "@/lib/analytics/track";

export default function OwnDevice() {
  useEffect(() => {
    markOwnDevice();
  }, []);
  return null;
}
