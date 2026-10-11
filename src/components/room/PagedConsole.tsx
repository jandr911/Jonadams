"use client";

import { useState } from "react";
import { fill } from "@/content/copy";
import RoomConsole, { type ConsoleKey } from "./RoomConsole";

export interface WallPage {
  keys: ConsoleKey[];
  screens: React.ReactNode[];
}

interface PagedConsoleProps {
  pages: WallPage[];
  label: string;
  more: string;
  moreLabel: string;
  preview?: boolean;
  crt?: boolean;
}

export default function PagedConsole({ pages, label, more, moreLabel, preview, crt }: PagedConsoleProps) {
  const [page, setPage] = useState(0);
  const current = pages[page];
  if (!current) return null;
  const count = pages.length;
  const next = (page + 1) % count;
  return (
    <>
      <RoomConsole key={page} keys={current.keys} screens={current.screens} label={label} preview={preview} crt={crt} />
      {count > 1 && (
        <button type="button" className="stage__flip" aria-label={fill(moreLabel, { next: next + 1, pages: count })} onClick={() => setPage(next)}>
          {fill(more, { page: page + 1, pages: count })}
        </button>
      )}
    </>
  );
}
