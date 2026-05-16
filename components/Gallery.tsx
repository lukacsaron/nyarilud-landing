"use client";

import { useState, type KeyboardEvent } from "react";
import Image, { type StaticImageData } from "next/image";

import styles from "./Gallery.module.css";

import photo5 from "../photos/nyari_lud_final_5.JPG_1.5.1.jpg";
import photo7 from "../photos/nyari_lud_final_7.JPG_1.7.1.jpg";
import photo38 from "../photos/nyari_lud_final_38.JPG_1.38.1.jpg";
import photo48 from "../photos/nyari_lud_final_48.JPG_1.48.1.jpg";
import photo66 from "../photos/nyari_lud_final_66.JPG_1.66.1.jpg";

type PinStyle = "tape-top" | "tape-tl" | "tape-tr" | "pin";

type Polaroid = {
  slot: 1 | 2 | 3 | 4 | 5;
  src: StaticImageData;
  alt: string;
  pin: PinStyle;
  blueTape?: boolean;
  tapeRot?: string;
};

const photos: Polaroid[] = [
  { slot: 1, src: photo38, alt: "Nyári lúd — sárga csíkos kabát", pin: "tape-top" },
  { slot: 2, src: photo48, alt: "Nyári lúd — hímzett mellény",   pin: "tape-tl", blueTape: true },
  { slot: 3, src: photo66, alt: "Nyári lúd — sárga öv hangtag-gel", pin: "pin" },
  { slot: 4, src: photo7,  alt: "Nyári lúd — boltbelső",          pin: "tape-tr" },
  { slot: 5, src: photo5,  alt: "Nyári lúd — a kirakat",          pin: "tape-top", blueTape: true, tapeRot: "2deg" },
];

function PinElement({ kind, tapeRot }: { kind: PinStyle; tapeRot?: string }) {
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

export function Gallery() {
  const [shutters, setShutters] = useState<Record<number, number>>({});

  const fire = (slot: number) =>
    setShutters((prev) => ({ ...prev, [slot]: (prev[slot] ?? 0) + 1 }));

  const onKey = (e: KeyboardEvent<HTMLElement>, slot: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fire(slot);
    }
  };

  return (
    <section id="gallery" className={styles.section} aria-label="Galéria">
      <div className={styles.wall}>
        {photos.map((p) => {
          const slotClass = styles[`w${p.slot}` as `w${1|2|3|4|5}`];
          const shutter = shutters[p.slot] ?? 0;
          const variant = shutter === 0 ? undefined : shutter % 2 === 0 ? "a" : "b";
          return (
            <figure
              key={p.slot}
              className={`${styles.figure} ${slotClass} ${p.blueTape ? styles.blueTape : ""}`}
              data-shutter={variant}
              role="button"
              tabIndex={0}
              aria-label={p.alt}
              onClick={() => fire(p.slot)}
              onKeyDown={(e) => onKey(e, p.slot)}
            >
              <PinElement kind={p.pin} tapeRot={p.tapeRot} />
              <div className={styles.ph} data-shutter={variant}>
                <Image
                  src={p.src}
                  alt={p.alt}
                  fill
                  sizes="(max-width: 620px) 88vw, (max-width: 980px) 48vw, (max-width: 1480px) 46vw, 720px"
                  placeholder="blur"
                />
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
