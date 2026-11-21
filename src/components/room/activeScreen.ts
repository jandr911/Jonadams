import { useSyncExternalStore } from "react";

const active = new Map<string, string>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishActive(channel: string, id: string) {
  if (active.get(channel) === id) return;
  active.set(channel, id);
  listeners.forEach((l) => l());
}

export function clearActive(channel: string) {
  if (!active.delete(channel)) return;
  listeners.forEach((l) => l());
}

export function useActive(channel: string) {
  return useSyncExternalStore(
    subscribe,
    () => active.get(channel),
    () => undefined,
  );
}
