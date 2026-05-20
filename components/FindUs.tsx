"use client";

import { useEffect, useRef, useState } from "react";
import { HandDrawnMap } from "./HandDrawnMap";
import { useOpenStatus } from "@/lib/useOpenStatus";
import { toHumanGroups, todaysExceptionBanner } from "@/lib/site/hours";
import type { Site } from "@/lib/site/schema";
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
    const id = setInterval(() => setIndex((i) => (i + 1) % VERBS.length), 2500);
    return () => clearInterval(id);
  }, [reduced, paused]);
  return (
    <em className={styles.cyclingVerb}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-live="polite" aria-atomic="true">
      <span key={index} className={styles.cyclingWord}>{VERBS[index]}</span>
    </em>
  );
}

function EmailLink({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { return () => { if (timer.current) clearTimeout(timer.current); }; }, []);
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!navigator.clipboard?.writeText) return;
    e.preventDefault();
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    }).catch(() => { window.location.href = `mailto:${email}`; });
  };
  return (
    <span className={styles.emailWrap}>
      <a href={`mailto:${email}`} onClick={handleClick}>{email}</a>
      {copied && <span className={styles.copiedBadge}>másolva</span>}
    </span>
  );
}

function OpenStatusPill({ site }: { site: Site }) {
  const status = useOpenStatus(site);
  if (!status) return null;
  if (status.open) {
    return (
      <span className={styles.statusPill} data-open="true">
        <span className={styles.statusDot} aria-hidden />Most nyitva
      </span>
    );
  }
  const label = status.nextDayLabel
    ? `Most ZÁRVA · nyitás ${status.nextDayLabel} ${status.nextHour}-kor`
    : `Most ZÁRVA · nyitás ${status.nextHour}-kor`;
  return (
    <span className={styles.statusPill} data-open="false">
      <span className={styles.statusDot} aria-hidden />{label}
    </span>
  );
}

export function FindUs({ site }: { site: Site }) {
  const groups = toHumanGroups(site);
  const [banner, setBanner] = useState<string | null>(null);
  useEffect(() => {
    setBanner(todaysExceptionBanner(site, new Date()));
    const id = setInterval(() => setBanner(todaysExceptionBanner(site, new Date())), 60_000);
    return () => clearInterval(id);
  }, [site]);
  const addr = site.contact.address;

  return (
    <section id="find-us" className={styles.section} aria-label="Merre vagyunk">
      <div className={styles.grid}>
        <a href={MAPS_URL} target="_blank" rel="noopener noreferrer"
           aria-label="Megnyitás Google Térképen" className={styles.mapFrame}>
          <HandDrawnMap />
        </a>
        <div className={styles.card}>
          <div className={styles.eyebrow}>merre vagyunk</div>
          <h2 className={styles.title}>
            gyere be, <CyclingVerb />,<br />találd meg a kedvenced.
          </h2>
          <p className={styles.address}>
            <strong>{addr.streetAddress}</strong><br />
            {addr.addressLocality}, {addr.postalCode}<br />
            {addr.neighborhood}
          </p>
          <div className={styles.hoursBlock}>
            <div className={styles.hoursHead}>
              <span className={styles.hoursLabel}>nyitvatartás</span>
              <OpenStatusPill site={site} />
            </div>
            {banner && (
              <div className={styles.banner} role="note">{banner}</div>
            )}
            <div className={styles.schedule}>
              {groups.map((g) => (
                <div key={g.label}
                     className={`${styles.scheduleRow}${g.muted ? ` ${styles.scheduleRowMuted}` : ""}`}>
                  <span className={styles.day}>{g.label}</span>
                  <span className={styles.leader} aria-hidden />
                  <span className={styles.time}>{g.time}</span>
                </div>
              ))}
            </div>
          </div>
          <dl className={styles.meta}>
            <dt>írj</dt>
            <dd><EmailLink email={site.contact.email} /></dd>
          </dl>
          <div className={styles.links}>
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className={styles.linkPrimary}>
              mutasd a térképen <span className={styles.arrow}>→</span>
            </a>
            <a href="https://www.instagram.com/nyarilud/" target="_blank" rel="noopener noreferrer" className={styles.link}>
              instagram <span className={styles.arrow}>↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
