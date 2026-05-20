"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export function useDirtyForm<T>(initial: T): {
  value: T;
  setValue: (v: T | ((prev: T) => T)) => void;
  dirty: boolean;
  reset: (next: T) => void;
} {
  const [value, setValue] = useState<T>(initial);
  const baselineRef = useRef<string>(JSON.stringify(initial));
  const currentJson = useMemo(() => JSON.stringify(value), [value]);
  const dirty = currentJson !== baselineRef.current;

  useEffect(() => {
    baselineRef.current = JSON.stringify(initial);
    setValue(initial);
  }, [JSON.stringify(initial)]);

  return {
    value,
    setValue,
    dirty,
    reset: (next: T) => {
      baselineRef.current = JSON.stringify(next);
      setValue(next);
    },
  };
}
