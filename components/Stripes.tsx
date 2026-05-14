"use client";

import { useEffect, useRef } from "react";
import styles from "./Stripes.module.css";

export function Stripes() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let targetMx = 0;
    let currentMx = 0;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      const cx = window.innerWidth / 2;
      const dx = (e.clientX - cx) / cx;
      targetMx = -dx * 14;
    };

    const tick = () => {
      currentMx += (targetMx - currentMx) * 0.045;
      el.style.setProperty("--mx", currentMx.toFixed(2) + "px");
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={ref} className={styles.stripes} aria-hidden />
      <div className={styles.veil} aria-hidden />
    </>
  );
}
