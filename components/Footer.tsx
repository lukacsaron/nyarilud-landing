import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.left}>
        <span>© nyári lúd · est. {/* TODO: confirm founding year */}2026 · budapest</span>
      </div>
    </footer>
  );
}
