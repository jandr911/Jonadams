"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const loadCityCanvas = () => import("./CityCanvas");
const CityCanvas = dynamic(loadCityCanvas);

export default function CityHost() {
  const pathname = usePathname();
  const active = pathname === "/";
  const admin = pathname.startsWith("/admin");
  const [opened, setOpened] = useState(false);
  if (active && !opened) setOpened(true);
  useEffect(() => {
    if (!opened && !admin) void loadCityCanvas();
  }, [opened, admin]);
  if (admin || !opened) return null;
  return <CityCanvas active={active} />;
}
