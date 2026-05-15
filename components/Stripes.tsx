import styles from "./Stripes.module.css";

export function Stripes() {
  return (
    <>
      <div className={styles.uncover} aria-hidden />
      <div className={styles.veil} aria-hidden />
    </>
  );
}
