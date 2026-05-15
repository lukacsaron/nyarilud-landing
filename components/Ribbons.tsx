"use client";

import { useOpenStatus } from "@/lib/useOpenStatus";
import styles from "./Ribbons.module.css";

function NavOpenStatus() {
  const status = useOpenStatus();
  if (!status) return <span className={styles.statusSlot} aria-hidden />;

  if (status.open) {
    return (
      <span
        className={styles.navStatus}
        data-open="true"
        aria-label="A bolt most nyitva"
      >
        <span className={styles.navStatusDot} aria-hidden />
        <span className={styles.navStatusLabel}>Most nyitva</span>
      </span>
    );
  }

  const detail = status.nextDayLabel
    ? `${status.nextDayLabel} ${status.nextHour}-kor`
    : `${status.nextHour}-kor`;

  return (
    <span
      className={styles.navStatus}
      data-open="false"
      aria-label={`A bolt most ZÁRVA · nyitás ${detail}`}
    >
      <span className={styles.navStatusDot} aria-hidden />
      <span className={styles.navStatusLabel}>Most zárva</span>
      <span className={styles.navStatusDetail}> · nyitás {detail}</span>
    </span>
  );
}

export function Ribbons() {
  return (
    <>
      <div className={`${styles.ribbon} ${styles.tl}`}>
        <span>nyári lúd</span>
        <span className={styles.vrule} />
        <span>est. {/* TODO: confirm founding year */}2026 · budapest</span>
      </div>
      <div className={`${styles.ribbon} ${styles.tr}`}>
        <NavOpenStatus />
        <span className={styles.vrule} />
        <a
          href="https://www.instagram.com/nyarilud/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          Instagram ↗
        </a>
      </div>
    </>
  );
}
