"use client";

import { useState, useTransition } from "react";
import { DAY_KEYS, type DayKey, type Site } from "@/lib/site/schema";
import { saveHoursAction } from "../actions";
import { useDirtyForm } from "../hooks/useDirtyForm";
import { useDirtyRegistration } from "../DirtyTracker";
import { useToast } from "../Toast";
import styles from "../admin.module.css";

const DAY_LABEL_HU: Record<DayKey, string> = {
  mon: "Hétfő",
  tue: "Kedd",
  wed: "Szerda",
  thu: "Csütörtök",
  fri: "Péntek",
  sat: "Szombat",
  sun: "Vasárnap",
};

export function HoursSection({ site }: { site: Site }) {
  const { value, setValue, dirty, reset } = useDirtyForm<Site["hours"]>(site.hours);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  useDirtyRegistration("hours", dirty);

  const setDay = (k: DayKey, patch: Partial<Site["hours"][DayKey]>) =>
    setValue((v) => ({ ...v, [k]: { ...v[k], ...patch } }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveHoursAction(value);
      if (result.ok) {
        reset(value);
        setSavedAt(new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" }));
        toast.push({ text: "Nyitvatartás mentve", href: "/" });
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <form id="nyitva" className={styles.section} onSubmit={onSubmit}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Nyitvatartás</h2>
        {savedAt && <span className={styles.sectionSavedAt}>Mentve {savedAt}</span>}
      </div>

      <div role="grid">
        {DAY_KEYS.map((k) => {
          const d = value[k];
          return (
            <div key={k} className={styles.hoursRow}>
              <span className={styles.hoursDay}>{DAY_LABEL_HU[k]}</span>
              <input
                type="time"
                className={styles.input}
                value={d.opens}
                onChange={(e) => setDay(k, { opens: e.target.value })}
                disabled={d.closed}
                aria-label={`${DAY_LABEL_HU[k]} nyitás`}
              />
              <span aria-hidden>—</span>
              <input
                type="time"
                className={styles.input}
                value={d.closes}
                onChange={(e) => setDay(k, { closes: e.target.value })}
                disabled={d.closed}
                aria-label={`${DAY_LABEL_HU[k]} zárás`}
              />
              <label className={styles.hoursClosed}>
                <input
                  type="checkbox"
                  checked={d.closed}
                  onChange={(e) => setDay(k, { closed: e.target.checked })}
                />
                Zárva
              </label>
            </div>
          );
        })}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.saveRow}>
        <button type="submit" className={styles.saveBtn} data-dirty={dirty} disabled={!dirty || pending}>
          {pending ? "Mentés..." : "Mentés"}
        </button>
      </div>
    </form>
  );
}
