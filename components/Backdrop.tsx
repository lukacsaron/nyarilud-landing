"use client";

import { useEffect, useRef } from "react";
import styles from "./Backdrop.module.css";

export function Backdrop() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    if (!hero) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        el.dataset.heroInView = entry.isIntersecting ? "true" : "false";
      },
      { threshold: 0 },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  return <div ref={ref} className={styles.backdrop} data-hero-in-view="true" aria-hidden />;
}
