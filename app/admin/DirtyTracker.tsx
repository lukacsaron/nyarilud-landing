"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useBeforeUnload } from "./hooks/useBeforeUnload";

type Ctx = {
  setDirty: (id: string, dirty: boolean) => void;
};

const DirtyContext = createContext<Ctx | null>(null);

export function DirtyTrackerProvider({ children }: { children: React.ReactNode }) {
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
  const setDirty = useCallback((id: string, dirty: boolean) => {
    setDirtyMap((prev) => {
      if (prev[id] === dirty) return prev;
      return { ...prev, [id]: dirty };
    });
  }, []);
  const anyDirty = Object.values(dirtyMap).some(Boolean);
  useBeforeUnload(anyDirty);
  return (
    <DirtyContext.Provider value={{ setDirty }}>{children}</DirtyContext.Provider>
  );
}

export function useDirtyRegistration(id: string, dirty: boolean) {
  const ctx = useContext(DirtyContext);
  useEffect(() => {
    ctx?.setDirty(id, dirty);
    return () => ctx?.setDirty(id, false);
  }, [ctx, id, dirty]);
}
