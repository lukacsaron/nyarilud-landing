"use client";

import { useState, type KeyboardEvent } from "react";
import Image from "next/image";
import styles from "./Gallery.module.css";

import seed1 from "../photos/nyari_lud_final_38.JPG_1.38.1.jpg";
import seed2 from "../photos/nyari_lud_final_48.JPG_1.48.1.jpg";
import seed3 from "../photos/nyari_lud_final_66.JPG_1.66.1.jpg";
import seed4 from "../photos/nyari_lud_final_7.JPG_1.7.1.jpg";
import seed5 from "../photos/nyari_lud_final_5.JPG_1.5.1.jpg";

import type { SitePhoto } from "@/lib/site/schema";

const SEED_SOURCES: Record<string, { src: typeof seed1 }> = {
  "seed-1": { src: seed1 },
  "seed-2": { src: seed2 },
  "seed-3": { src: seed3 },
  "seed-4": { src: seed4 },
  "seed-5": { src: seed5 },
};

const AR_MIN = 0.6;
const AR_MAX = 1.6;

/** Display aspect ratio (width/height), clamped so nothing is absurdly tall/wide. */
function clampAr(w: number, h: number): number {
  if (!w || !h) return 1;
  return Math.min(AR_MAX, Math.max(AR_MIN, w / h));
}

function orientOf(ar: number): "portrait" | "square" | "landscape" {
  if (ar < 0.9) return "portrait";
  if (ar > 1.15) return "landscape";
  return "square";
}

function PinElement({ kind, tapeRot }: { kind: SitePhoto["pin"]; tapeRot?: string }) {
  if (kind === "pin") return <span className={styles.pin} aria-hidden />;
  const cls =
    kind === "tape-top" ? `${styles.tape} ${styles.tapeTop}` :
    kind === "tape-tl"  ? `${styles.tape} ${styles.tapeTl}`  :
                          `${styles.tape} ${styles.tapeTr}`;
  const style = kind === "tape-top" && tapeRot
    ? ({ ["--tapeRot" as string]: tapeRot } as React.CSSProperties)
    : undefined;
  return <span className={cls} style={style} aria-hidden />;
}

export function Gallery({ photos }: { photos: SitePhoto[] }) {
  const [shutters, setShutters] = useState<Record<number, number>>({});

  const fire = (slot: number) =>
    setShutters((prev) => ({ ...prev, [slot]: (prev[slot] ?? 0) + 1 }));

  const onKey = (e: KeyboardEvent<HTMLElement>, slot: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fire(slot);
    }
  };

  const ordered = [...photos].sort((a, b) => a.slot - b.slot);

  return (
    <section id="gallery" className={styles.section} aria-label="Galéria">
      <div className={styles.wall}>
        {ordered.map((p) => {
          const slotClass = styles[`w${p.slot}` as `w${1|2|3|4|5}`];
          const shutter = shutters[p.slot] ?? 0;
          const variant = shutter === 0 ? undefined : shutter % 2 === 0 ? "a" : "b";
          const seed = SEED_SOURCES[p.id];
          const ar = seed ? clampAr(seed.src.width, seed.src.height) : clampAr(p.width, p.height);
          const orient = orientOf(ar);
          return (
            <figure key={p.slot}
                    className={`${styles.figure} ${slotClass} ${p.blueTape ? styles.blueTape : ""}`}
                    data-shutter={variant}
                    data-orient={orient}
                    style={{ ["--ar" as string]: ar } as React.CSSProperties}
                    role="button" tabIndex={0} aria-label={p.alt}
                    onClick={() => fire(p.slot)}
                    onKeyDown={(e) => onKey(e, p.slot)}>
              <PinElement kind={p.pin} tapeRot={p.tapeRot} />
              <div className={styles.ph} data-shutter={variant}>
                {seed ? (
                  <Image src={seed.src} alt={p.alt} fill
                         sizes="(max-width: 620px) 88vw, (max-width: 980px) 48vw, (max-width: 1480px) 46vw, 720px"
                         placeholder="blur" />
                ) : (
                  <Image src={`/photos/${p.id}.webp`} alt={p.alt}
                         width={p.width} height={p.height}
                         sizes="(max-width: 620px) 88vw, (max-width: 980px) 48vw, (max-width: 1480px) 46vw, 720px"
                         placeholder="blur" blurDataURL={p.blurDataURL}
                         style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
                {shutter > 0 && (
                  <span key={shutter} className={styles.developSeq} aria-hidden>
                    <span className={styles.flash} />
                    <span className={styles.milky} />
                    <span className={styles.vignette} />
                    <span className={styles.halation} />
                  </span>
                )}
              </div>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
