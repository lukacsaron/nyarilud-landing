"use client";

import styles from "./ScrollCue.module.css";

export function ScrollCue() {
  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault();
    const target = document.getElementById("find-us");
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <a
      className={styles.cue}
      href="#find-us"
      onClick={handleClick}
      aria-label="görgess a térképhez"
    >
      <span>merre vagyunk</span>
      <span className={styles.line} />
    </a>
  );
}
