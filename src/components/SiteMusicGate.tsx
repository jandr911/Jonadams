"use client";

import { usePathname } from "next/navigation";
import SiteMusic from "./SiteMusic";

export default function SiteMusicGate() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <SiteMusic />;
}
