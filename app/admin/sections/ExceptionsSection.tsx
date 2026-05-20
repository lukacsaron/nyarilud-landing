"use client";

import { useState, useTransition } from "react";
import type { Site, SiteException } from "@/lib/site/schema";
import { saveExceptionsAction } from "../actions";
import { useDirtyForm } from "../hooks/useDirtyForm";
import { useDirtyRegistration } from "../DirtyTracker";
import { useToast } from "../Toast";
import styles from "../admin.module.css";

const blankException = (): SiteException => ({
  date: new Date().toISOString().slice(0, 10),
  label: "",
  mode: "closed",
  opens: "10:00",
  closes: "15:00",
});

export function ExceptionsSection({ site }: { site: Site }) {
  const { value, setValue, dirty, reset } = useDirtyForm<SiteException[]>(site.exceptions);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  useDirtyRegistration("exceptions", dirty);

  const add = () => setValue((v) => [...v, blankException()]);
  const update = (i: number, patch: Partial<SiteException>) =>
    setValue((v) => v.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const remove = (i: number) => {
    if (!confirm("Biztos törlöd?")) return;
    setValue((v) => v.filter((_, idx) => idx !== i));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean: SiteException[] = value.map((ex) =>
      ex.mode === "closed"
        ? { date: ex.date, label: ex.label || undefined, mode: "closed" }
        : { date: ex.date, label: ex.label || undefined, mode: "custom", opens: ex.opens!, closes: ex.closes! }
    );
    startTransition(async () => {
      const result = await saveExceptionsAction(clean);
      if (result.ok) {
        reset(clean);
        setSavedAt(new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" }));
        toast.push({ text: "Ünnepek mentve", href: "/" });
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <form id="unnepek" className={styles.section} onSubmit={onSubmit}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Ünnepek és kivételek</h2>
        {savedAt && <span className={styles.sectionSavedAt}>Mentve {savedAt}</span>}
      </div>

      <div className={styles.exceptionList}>
        {value.map((ex, i) => (
          <div key={i} className={styles.exceptionCard}>
            <input type="date" className={styles.input} value={ex.date}
                   onChange={(e) => update(i, { date: e.target.value })} required />
            <input className={styles.input} placeholder="címke (pl. Karácsony)"
                   value={ex.label ?? ""}
                   onChange={(e) => update(i, { label: e.target.value })} />
            <div className={styles.exceptionRadio}>
              <label>
                <input type="radio" name={`mode-${i}`} checked={ex.mode === "closed"}
                       onChange={() => update(i, { mode: "closed" })} />
                Zárva
              </label>
              <label>
                <input type="radio" name={`mode-${i}`} checked={ex.mode === "custom"}
                       onChange={() => update(i, { mode: "custom" })} />
                Egyedi nyitva
              </label>
            </div>
            {ex.mode === "custom" && (
              <div className={styles.exceptionTimes}>
                <input type="time" className={styles.input} value={ex.opens ?? "10:00"}
                       onChange={(e) => update(i, { opens: e.target.value })} />
                <span aria-hidden>—</span>
                <input type="time" className={styles.input} value={ex.closes ?? "15:00"}
                       onChange={(e) => update(i, { closes: e.target.value })} />
              </div>
            )}
            <button type="button" className={styles.trashBtn} onClick={() => remove(i)} aria-label="Törlés">
              Törlés
            </button>
          </div>
        ))}
      </div>

      <button type="button" className={styles.addBtn} onClick={add}>+ Új kivétel</button>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.saveRow}>
        <button type="submit" className={styles.saveBtn} data-dirty={dirty} disabled={!dirty || pending}>
          {pending ? "Mentés..." : "Mentés"}
        </button>
      </div>
    </form>
  );
}
