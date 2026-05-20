"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import styles from "./Toast.module.css";

type Toast = { id: number; text: string; href?: string };
type Ctx = { push: (t: Omit<Toast, "id">) => void };

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className={styles.region} aria-live="polite" aria-atomic="true">
        {items.map((t) => (
          <div key={t.id} className={styles.toast}>
            <span>{t.text}</span>
            {t.href && (
              <a href={t.href} target="_blank" rel="noopener noreferrer" className={styles.link}>
                Megnyitás ↗
              </a>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Ctx {
  const v = useContext(ToastContext);
  if (!v) throw new Error("useToast outside ToastProvider");
  return v;
}
