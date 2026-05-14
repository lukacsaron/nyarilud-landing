"use client";

import { useEffect, useRef, useState } from "react";
import { HandDrawnMap } from "./HandDrawnMap";
import styles from "./FindUs.module.css";

const MAPS_URL = "https://maps.google.com/?q=Pozsonyi+%C3%BAt+30%2C+Budapest";
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
      .writeText("hello@nyarilud.hu")
      .then(() => {
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        window.location.href = "mailto:hello@nyarilud.hu";
      });
  };

  return (
    <span className={styles.emailWrap}>
      <a href="mailto:hello@nyarilud.hu" onClick={handleClick}>
        hello@nyarilud.hu
      </a>
      {copied && <span className={styles.copiedBadge}>másolva</span>}
    </span>
  );
}

type Status =
  | { open: true }
  | { open: false; nextDayLabel: string | null; nextHour: number };

function OpenStatus() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const compute = (): Status => {
      const now = new Date();
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Budapest",
        weekday: "short",
        hour: "numeric",
        hour12: false,
      });
      const parts = fmt.formatToParts(now);
      const weekdayShort = parts.find((p) => p.type === "weekday")?.value ?? "";
      const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
      const hour = parseInt(hourStr, 10) % 24;
      const dayMap: Record<string, number> = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
      };
      const day = dayMap[weekdayShort] ?? 0;
      const isOpenDay = day >= 2 && day <= 6;
      if (isOpenDay && hour >= 11 && hour < 18) {
        return { open: true };
      }
      const dayNames = ["vasárnap", "hétfőn", "kedden", "szerdán", "csütörtökön", "pénteken", "szombaton"];
      if (isOpenDay && hour < 11) {
        return { open: false, nextDayLabel: "ma", nextHour: 11 };
      }
      let next = (day + 1) % 7;
      while (!(next >= 2 && next <= 6)) next = (next + 1) % 7;
      return { open: false, nextDayLabel: dayNames[next], nextHour: 11 };
    };
    setStatus(compute());
    const id = setInterval(() => setStatus(compute()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!status) return null;

  if (status.open) {
    return (
      <span className={styles.statusPill} data-open="true">
        <span className={styles.statusDot} aria-hidden />
        most nyitva
      </span>
    );
  }

  const label = status.nextDayLabel
    ? `zárva · ${status.nextDayLabel} ${status.nextHour}-kor nyit`
    : `zárva · ${status.nextHour}-kor nyit`;

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
              <span className={styles.hoursLabel}>nyitva</span>
              <OpenStatus />
            </div>
            <div className={styles.schedule}>
              <div className={styles.scheduleRow}>
                <span className={styles.day}>Kedd — Szombat</span>
                <span className={styles.leader} aria-hidden />
                <span className={styles.time}>11 — 18</span>
              </div>
              <div className={`${styles.scheduleRow} ${styles.scheduleRowMuted}`}>
                <span className={styles.day}>Vasárnap, Hétfő</span>
                <span className={styles.leader} aria-hidden />
                <span className={styles.time}>zárva</span>
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
              href="https://instagram.com/nyari.lud"
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
