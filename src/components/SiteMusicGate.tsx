"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import SiteMusic, { cueMusic } from "./SiteMusic";

export default function SiteMusicGate() {
  const pathname = usePathname();
  const admin = pathname.startsWith("/admin");
  useEffect(() => {
    if (!admin && pathname !== "/") cueMusic();
  }, [admin, pathname]);
  if (admin) return null;
  return <SiteMusic />;
}
