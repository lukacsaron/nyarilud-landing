"use client";

import { useEffect, useRef, useState } from "react";
import { HandDrawnMap } from "./HandDrawnMap";
import { useOpenStatus } from "@/lib/useOpenStatus";
import styles from "./FindUs.module.css";

const MAPS_URL = "https://maps.app.goo.gl/BJohLrrUkpDCzEyU9";
const VERBS = ["nézelődj", "bóklássz", "időzz", "próbálj"];

function CyclingVerb() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (reduced || paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % VERBS.length);
    }, 2500);
    return () => clearInterval(id);
  }, [reduced, paused]);

  return (
    <em
      className={styles.cyclingVerb}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-live="polite"
      aria-atomic="true"
    >
      <span key={index} className={styles.cyclingWord}>
        {VERBS[index]}
      </span>
    </em>
  );
}

function EmailLink() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!navigator.clipboard?.writeText) return;
    e.preventDefault();
    navigator.clipboard
      .writeText("dora@nyarilud.hu")
      .then(() => {
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        window.location.href = "mailto:dora@nyarilud.hu";
      });
  };

  return (
    <span className={styles.emailWrap}>
      <a href="mailto:dora@nyarilud.hu" onClick={handleClick}>
        dora@nyarilud.hu
      </a>
      {copied && <span className={styles.copiedBadge}>másolva</span>}
    </span>
  );
}

function OpenStatus() {
  const status = useOpenStatus();
  if (!status) return null;

  if (status.open) {
    return (
      <span className={styles.statusPill} data-open="true">
        <span className={styles.statusDot} aria-hidden />
        Most nyitva
      </span>
    );
  }

  const label = status.nextDayLabel
    ? `Most ZÁRVA · nyitás ${status.nextDayLabel} ${status.nextHour}-kor`
    : `Most ZÁRVA · nyitás ${status.nextHour}-kor`;

  return (
    <span className={styles.statusPill} data-open="false">
      <span className={styles.statusDot} aria-hidden />
      {label}
    </span>
  );
}

export function FindUs() {
  return (
    <section id="find-us" className={styles.section} aria-label="Merre vagyunk">
      <div className={styles.grid}>
        <a
          href={MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Megnyitás Google Térképen"
          className={styles.mapFrame}
        >
          <HandDrawnMap />
        </a>

        <div className={styles.card}>
          <div className={styles.eyebrow}>merre vagyunk</div>
          <h2 className={styles.title}>
            gyere be, <CyclingVerb />,
            <br />
            találd meg a kedvenced.
          </h2>
          <p className={styles.address}>
            <strong>Pozsonyi út 30</strong>
            <br />
            Budapest, 1137
            <br />
            Újlipótváros
          </p>

          <div className={styles.hoursBlock}>
            <div className={styles.hoursHead}>
              <span className={styles.hoursLabel}>nyitvatartás</span>
              <OpenStatus />
            </div>
            <div className={styles.schedule}>
              <div className={styles.scheduleRow}>
                <span className={styles.day}>Kedd–Csüt, Szo</span>
                <span className={styles.leader} aria-hidden />
                <span className={styles.time}>10 — 15</span>
              </div>
              <div className={styles.scheduleRow}>
                <span className={styles.day}>Péntek</span>
                <span className={styles.leader} aria-hidden />
                <span className={styles.time}>10 — 18</span>
              </div>
              <div className={`${styles.scheduleRow} ${styles.scheduleRowMuted}`}>
                <span className={styles.day}>Vasárnap, Hétfő</span>
                <span className={styles.leader} aria-hidden />
                <span className={styles.time}>ZÁRVA</span>
              </div>
            </div>
          </div>

          <dl className={styles.meta}>
            <dt>írj</dt>
            <dd>
              <EmailLink />
            </dd>
          </dl>

          <div className={styles.links}>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.linkPrimary}
            >
              mutasd a térképen <span className={styles.arrow}>→</span>
            </a>
            <a
              href="https://www.instagram.com/nyarilud/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              instagram <span className={styles.arrow}>↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
