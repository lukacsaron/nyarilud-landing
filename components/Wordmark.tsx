import styles from "./Wordmark.module.css";

const WORDS: string[][] = [
  ["n", "y", "á", "r", "i"],
  ["l", "ú", "d"],
];

const BASE_DELAY = 2200;
const STEP = 60;
const WORD_PAUSE = 60;

export function Wordmark() {
  let cursor = 0;
  return (
    <div className={styles.wrap}>
      <h1 className={styles.wordmark} aria-label="nyári lúd">
        {WORDS.map((chars, wi) => {
          if (wi > 0) cursor += WORD_PAUSE / STEP;
          return (
            <span key={wi} className={styles.word}>
              {chars.map((ch, ci) => {
                const delay = BASE_DELAY + cursor * STEP;
                cursor += 1;
                return (
                  <span
                    key={ci}
                    className={styles.ch}
                    style={{ ["--d" as string]: `${delay}ms` }}
                  >
                    {ch}
                  </span>
                );
              })}
            </span>
          );
        })}
      </h1>
      <p className={styles.tagline} aria-hidden>
        <span className={styles.taglineRule} />
        <span className={styles.taglineText}>premium preloved boutique</span>
        <span className={styles.taglineRule} />
      </p>
    </div>
  );
}
