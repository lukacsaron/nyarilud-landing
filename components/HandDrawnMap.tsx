import Image from "next/image";
import styles from "./HandDrawnMap.module.css";

const POI = { x: 56, y: 46 };

export function HandDrawnMap() {
  return (
    <div className={styles.mapWrap}>
      <Image
        src="/nyarilud-map.png"
        alt="Kézzel rajzolt térkép a Nyári Lúd környékéről, Pozsonyi út 30, Budapest"
        fill
        sizes="(max-width: 880px) 92vw, 540px"
        className={styles.image}
        priority={false}
      />

      <div
        className={styles.poi}
        style={{ left: `${POI.x}%`, top: `${POI.y}%` }}
      >
        <span className={styles.poiHalo} aria-hidden />
        <span className={styles.poiHaloLate} aria-hidden />
        <span className={styles.poiDot} aria-hidden />
        <span className={styles.poiLabel}>Pozsonyi&nbsp;út&nbsp;30</span>
      </div>
    </div>
  );
}
