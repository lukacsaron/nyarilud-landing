import { Stripes } from "./Stripes";
import { Ribbons } from "./Ribbons";
import { Goose } from "./Goose";
import { Wordmark } from "./Wordmark";
import { ScrollCue } from "./ScrollCue";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero}>
      <Stripes />
      <Ribbons />

      <div className={styles.stage}>
        <Goose />
        <Wordmark />
        <p className={styles.poem}>
          kicsi bolt a Pozsonyi úton, tele ruhákkal,
          <br />
          amik már megéltek egy életet
          <br />
          &mdash; és most új sztorira várnak.
        </p>
      </div>

      <ScrollCue />
    </section>
  );
}
