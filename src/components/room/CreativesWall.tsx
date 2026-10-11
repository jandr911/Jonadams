"use client";

import { useState } from "react";
import { ROOMS } from "@/content/site";
import RoomConsole, { type ConsoleKey } from "./RoomConsole";

export interface WallPage {
  keys: ConsoleKey[];
  screens: React.ReactNode[];
}

export default function CreativesWall({ pages, label }: { pages: WallPage[]; label: string }) {
  const [page, setPage] = useState(0);
  const current = pages[page];
  if (!current) return null;
  const count = pages.length;
  const next = (page + 1) % count;
  return (
    <>
      <RoomConsole key={page} keys={current.keys} screens={current.screens} label={label} />
      {count > 1 && (
        <button
          type="button"
          className="stage__flip"
          aria-label={ROOMS.creatives.moreLabel(next + 1, count)}
          onClick={() => setPage(next)}
        >
          {ROOMS.creatives.more(page + 1, count)}
        </button>
      )}
    </>
  );
}
