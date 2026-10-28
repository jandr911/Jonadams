"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useSyncExternalStore } from "react";
import { GA_ID, isOwnDevice } from "@/lib/analytics/track";

const noSubscribe = () => () => {};
const enabledSnapshot = () => Boolean(GA_ID) && !isOwnDevice();
const serverSnapshot = () => false;
const TITLE_SETTLE_MS = 200;

function ensureGtag() {
  if (window.gtag) return;
  window.dataLayer ??= [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params -- gtag.js only reads an Arguments object, never an array
    window.dataLayer?.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });
}

export default function Analytics() {
  const pathname = usePathname();
  const enabled = useSyncExternalStore(noSubscribe, enabledSnapshot, serverSnapshot) && !pathname.startsWith("/admin");

  useEffect(() => {
    if (!enabled) {
      if (window.gtag) (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = true;
      return;
    }
    ensureGtag();
    const send = () => window.gtag?.("event", "page_view", { page_path: pathname, page_location: location.href, page_title: document.title });
    const t = setTimeout(send, TITLE_SETTLE_MS);
    return () => clearTimeout(t);
  }, [enabled, pathname]);

  if (!enabled) return null;
  return <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`} strategy="lazyOnload" />;
}
