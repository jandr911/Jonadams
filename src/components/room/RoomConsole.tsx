"use client";

import { useState } from "react";
import RoomLink from "./RoomLink";

export interface ConsoleKey {
  id: string;
  index: string;
  label: string;
  accent?: string;
  href?: string;
}

interface RoomConsoleProps {
  keys: ConsoleKey[];
  screens: React.ReactNode[];
  label: string;
  crt?: boolean;
  preview?: boolean;
}

export default function RoomConsole({ keys, screens, label, crt = false, preview = true }: RoomConsoleProps) {
  const [active, setActive] = useState(0);
  const current = keys[active];
  if (!current) return null;
  const accent = current.accent ? { ["--accent" as string]: current.accent } : undefined;
  return (
    <>
      <div className={crt ? "stage__screen stage__screen--crt" : "stage__screen"} aria-hidden={crt || undefined} style={accent}>
        <div key={current.id} className="stage__screen-body">
          {screens[active]}
        </div>
      </div>
      <nav className="stage__keys" aria-label={label}>
        {keys.map((k, i) => {
          const body = (
            <>
              <span className="stage__key-index">{k.index}</span>
              <span className="stage__key-label">{k.label}</span>
            </>
          );
          const style = k.accent ? { ["--accent" as string]: k.accent } : undefined;
          const on = i === active;
          const select = preview ? { onPointerEnter: () => setActive(i), onFocus: () => setActive(i) } : undefined;
          return k.href ? (
            <RoomLink key={k.id} href={k.href} className="stage__key" data-active={on || undefined} style={style} {...select}>
              {body}
            </RoomLink>
          ) : (
            <button
              key={k.id}
              type="button"
              className="stage__key"
              data-active={on || undefined}
              aria-pressed={on}
              style={style}
              {...select}
              onClick={() => setActive(i)}
            >
              {body}
            </button>
          );
        })}
      </nav>
    </>
  );
}
