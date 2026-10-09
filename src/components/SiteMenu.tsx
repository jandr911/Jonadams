"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface MenuLink {
  href: string;
  label: string;
  sub: string;
  accent: string;
  index: string;
}

export interface MenuCta {
  href: string;
  label: string;
}

const DESKTOP = "(min-width: 900px)";

export default function SiteMenu({ links, cta, current }: { links: MenuLink[]; cta: MenuCta; current?: string }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const mq = window.matchMedia(DESKTOP);
    const onDesktop = () => {
      if (mq.matches) setOpen(false);
    };
    const toggle = button.current;
    const covered = Array.from(document.querySelectorAll<HTMLElement>("main, footer"));
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    covered.forEach((el) => (el.inert = true));
    panel.current?.querySelector<HTMLElement>("a")?.focus();
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onDesktop);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onDesktop);
      covered.forEach((el) => (el.inert = false));
      root.style.overflow = overflow;
      toggle?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="site-menu">
      <button
        ref={button}
        type="button"
        className={`btn-outline site-menu__btn ${open ? "is-open" : ""}`}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={open ? "site-menu-panel" : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="site-menu__bars" aria-hidden />
      </button>
      {open &&
        createPortal(
          <nav ref={panel} id="site-menu-panel" className="site-menu__panel" aria-label="Primary">
            {links.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="site-menu__link"
                style={{ ["--c" as string]: n.accent }}
                aria-current={n.index === current ? "page" : undefined}
                onClick={close}
              >
                <span className="site-menu__index">{n.index}</span>
                <span className="site-menu__label">
                  {n.label}
                  <span className="site-menu__sub">{n.sub}</span>
                </span>
                <span className="site-menu__arrow" aria-hidden>
                  →
                </span>
              </Link>
            ))}
            <Link href={cta.href} className="btn-outline site-menu__cta" onClick={close}>
              {cta.label}
            </Link>
          </nav>,
          document.body,
        )}
    </div>
  );
}
