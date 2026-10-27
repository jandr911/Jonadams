export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

const OWN_DEVICE_KEY = "adams:own-device";

type EventParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(name: string, params: EventParams = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
}

export function isOwnDevice(): boolean {
  try {
    return localStorage.getItem(OWN_DEVICE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOwnDevice() {
  try {
    localStorage.setItem(OWN_DEVICE_KEY, "1");
  } catch {
    return;
  }
}
