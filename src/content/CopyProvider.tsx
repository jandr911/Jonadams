"use client";

import { createContext, useContext } from "react";
import { DEFAULT_COPY, type SiteCopy } from "./copy";

const CopyContext = createContext<SiteCopy>(DEFAULT_COPY);

export function CopyProvider({ copy, children }: { copy: SiteCopy; children: React.ReactNode }) {
  return <CopyContext.Provider value={copy}>{children}</CopyContext.Provider>;
}

export function useCopy(): SiteCopy {
  return useContext(CopyContext);
}
