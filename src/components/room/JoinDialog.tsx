"use client";

import { useEffect, useRef } from "react";
import { JOIN } from "@/content/site";

const HASH = "#join";

export default function JoinDialog({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    const sync = (fromHashChange: boolean) => {
      const dialog = ref.current;
      if (!dialog) return;
      if (window.location.hash === HASH) {
        pushed.current = fromHashChange;
        if (!dialog.open) dialog.showModal();
      } else if (dialog.open) {
        dialog.close();
      }
    };
    const onHashChange = () => sync(true);
    sync(false);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const onClose = () => {
    if (window.location.hash !== HASH) return;
    if (pushed.current) window.history.back();
    else window.history.replaceState(null, "", window.location.pathname + window.location.search);
    pushed.current = false;
  };

  const onBackdrop = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) e.currentTarget.close();
  };

  return (
    <dialog ref={ref} id="join" className="join-card" aria-labelledby="join-title" onClose={onClose} onClick={onBackdrop}>
      <div className="join-card__panel">
        <form method="dialog" className="join-card__close-row">
          <button type="submit" className="join-card__close" aria-label={JOIN.close}>
            <svg viewBox="0 0 24 24" aria-hidden focusable="false">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </form>
        {children}
      </div>
    </dialog>
  );
}
