import styles from "./Ribbons.module.css";

export function Ribbons() {
  return (
    <>
      <div className={`${styles.ribbon} ${styles.tl}`}>
        <span>nyári lúd</span>
        <span className={styles.vrule} />
        <span>est. {/* TODO: confirm founding year */}2026 · budapest</span>
      </div>
      <div className={`${styles.ribbon} ${styles.tr}`}>
        <a
          href="https://instagram.com/nyari.lud"
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
