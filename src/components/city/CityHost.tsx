"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import CityCanvas from "./CityCanvas";

export default function CityHost() {
  const pathname = usePathname();
  const active = pathname === "/";
  const [opened, setOpened] = useState(false);
  if (active && !opened) setOpened(true);
  if (pathname.startsWith("/admin") || !opened) return null;
  return <CityCanvas active={active} />;
}
