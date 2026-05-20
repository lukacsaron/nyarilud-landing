import { Stripes } from "./Stripes";
import { Ribbons } from "./Ribbons";
import { Goose } from "./Goose";
import { Wordmark } from "./Wordmark";
import { ScrollCue } from "./ScrollCue";
import type { Site } from "@/lib/site/schema";
import styles from "./Hero.module.css";

export function Hero({ slogan, site }: { slogan: string; site: Site }) {
  const lines = slogan.split("\n");
  return (
    <section className={styles.hero} data-hero>
      <Stripes />
      <Ribbons site={site} />
      <div className={styles.stage}>
        <Goose />
        <Wordmark />
        <p className={styles.poem}>
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
      </div>
      <ScrollCue />
    </section>
  );
}
