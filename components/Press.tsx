import Image from "next/image";
import type { SitePress } from "@/lib/site/schema";
import { PRESS_LOGOS, isKnownLogo, huDate } from "@/lib/press";
import styles from "./Press.module.css";

/** Deterministic per-index tilt — no Math.random(), so SSR and client agree. */
const ROTATIONS = [-1.1, 0.9, -0.7, 1.2, -1.3, 0.6, -0.5, 1.0];

function PressCard({ item, index }: { item: SitePress; index: number }) {
  const logo = isKnownLogo(item.logo) ? PRESS_LOGOS[item.logo] : null;
  return (
    <a
      className={styles.card}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ ["--rot" as string]: `${ROTATIONS[index % ROTATIONS.length]}deg` } as React.CSSProperties}
    >
      <span className={styles.tape} aria-hidden />

      <span className={styles.lockup}>
        {logo && (
          <Image
            className={styles.logo}
            src={`/press/${item.logo}`}
            alt=""
            width={logo.width}
            height={logo.height}
            sizes="40px"
          />
        )}
        <span className={styles.outlet}>{item.outlet}</span>
      </span>

      <span className={styles.rule} aria-hidden />

      <h3 className={styles.headline}>{item.title}</h3>

      {item.quote && <p className={styles.quote}>„{item.quote}”</p>}

      <span className={styles.foot}>
        <span className={styles.date}>{huDate(item.date)}</span>
        {item.author && (
          <>
            <span className={styles.sep} aria-hidden>
              ·
            </span>
            <span className={styles.author}>{item.author}</span>
          </>
        )}
        <span className={styles.arrow} aria-hidden>
          ↗
        </span>
      </span>
    </a>
  );
}

export function Press({ items }: { items: SitePress[] }) {
  if (!items || items.length === 0) return null;
  const ordered = [...items].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section id="press" className={styles.section} aria-labelledby="press-title">
      <div className={styles.head}>
        <span className={styles.label}>
          <h2 id="press-title" className={styles.eyebrow}>
            rólunk írták
          </h2>
        </span>
      </div>
      <div className={styles.wall} data-count={ordered.length}>
        {ordered.map((item, i) => (
          <PressCard key={item.id} item={item} index={i} />
        ))}
      </div>
    </section>
  );
}
