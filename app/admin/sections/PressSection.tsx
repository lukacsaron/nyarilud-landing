"use client";

import { useState, useTransition } from "react";
import type { Site, SitePress } from "@/lib/site/schema";
import { PRESS_LOGO_OPTIONS } from "@/lib/press";
import { savePressAction } from "../actions";
import { useDirtyForm } from "../hooks/useDirtyForm";
import { useDirtyRegistration } from "../DirtyTracker";
import { useToast } from "../Toast";
import styles from "../admin.module.css";

const MAX_ITEMS = 8;

function newId(): string {
  return `press-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const blankItem = (): SitePress => ({
  id: newId(),
  outlet: "",
  title: "",
  quote: "",
  url: "",
  date: new Date().toISOString().slice(0, 10),
  author: "",
  logo: "",
});

export function PressSection({ site }: { site: Site }) {
  const { value, setValue, dirty, reset } = useDirtyForm<SitePress[]>(site.press);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  useDirtyRegistration("press", dirty);

  const add = () => setValue((v) => (v.length >= MAX_ITEMS ? v : [...v, blankItem()]));
  const update = (i: number, patch: Partial<SitePress>) =>
    setValue((v) => v.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const remove = (i: number) => {
    if (!confirm("Biztos törlöd ezt a cikket?")) return;
    setValue((v) => v.filter((_, idx) => idx !== i));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Empty optional strings must become undefined — "" fails z.url() and
    // would otherwise render an empty byline on the card.
    const clean: SitePress[] = value.map((p) => ({
      id: p.id,
      outlet: p.outlet.trim(),
      title: p.title.trim(),
      url: p.url.trim(),
      date: p.date,
      quote: p.quote?.trim() ? p.quote.trim() : undefined,
      author: p.author?.trim() ? p.author.trim() : undefined,
      logo: p.logo ? p.logo : undefined,
    }));
    startTransition(async () => {
      const result = await savePressAction(clean);
      if (result.ok) {
        reset(clean);
        setSavedAt(new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" }));
        toast.push({ text: "Sajtómegjelenések mentve", href: "/#press" });
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <form id="sajto" className={styles.section} onSubmit={onSubmit}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Sajtómegjelenések</h2>
        {savedAt && <span className={styles.sectionSavedAt}>Mentve {savedAt}</span>}
      </div>
      <p className={styles.sectionIntro}>
        Cikkek, amik a boltról szóltak. A nyitóoldalon a galéria alatt jelennek meg papír
        kivágásként, a legfrissebb elöl. Ha üresen hagyod, az egész szekció eltűnik az oldalról.
      </p>

      <div className={styles.exceptionList}>
        {value.length === 0 && (
          <p className={styles.exceptionEmpty}>
            Még nincs sajtómegjelenés. Vegyél fel egyet a lenti gombbal.
          </p>
        )}

        {value.map((p, i) => (
          <div key={p.id} className={styles.pressCard}>
            <div className={styles.pressCardHead}>
              <span className={styles.pressCardTitle}>{p.outlet || "Új megjelenés"}</span>
              <button
                type="button"
                className={styles.trashBtn}
                onClick={() => remove(i)}
                aria-label={`${p.outlet || "Megjelenés"} törlése`}
              >
                Törlés
              </button>
            </div>

            <div className={styles.pressGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Lap neve</span>
                <span className={styles.fieldHelp}>Pl. We Love Budapest. Ez a kártya fejlécében jelenik meg.</span>
                <input
                  className={styles.input}
                  value={p.outlet}
                  onChange={(e) => update(i, { outlet: e.target.value })}
                  placeholder="We Love Budapest"
                  required
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Megjelenés dátuma</span>
                <span className={styles.fieldHelp}>A legfrissebb cikk kerül előre.</span>
                <input
                  type="date"
                  className={styles.input}
                  value={p.date}
                  onChange={(e) => update(i, { date: e.target.value })}
                  required
                />
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Cikk címe</span>
              <span className={styles.fieldHelp}>A cikk eredeti címe, ahogy a lapnál megjelent.</span>
              <input
                className={styles.input}
                value={p.title}
                onChange={(e) => update(i, { title: e.target.value })}
                placeholder="Igazi kincsesbánya nyílt Újlipótvárosban…"
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Kiemelt idézet</span>
              <span className={styles.fieldHelp}>
                Nem kötelező. Egy-két mondat a cikkből, ami a boltról szól — ez jelenik meg dőlt
                betűvel, idézőjelben. Rövidebb jobban mutat.
              </span>
              <textarea
                className={styles.textarea}
                value={p.quote ?? ""}
                onChange={(e) => update(i, { quote: e.target.value })}
                placeholder="A Nyári Lúd nem egy tipikus turkáló…"
              />
            </label>

            <div className={styles.pressGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Link a cikkre</span>
                <span className={styles.fieldHelp}>Teljes cím https://-sel. Új lapon nyílik meg.</span>
                <input
                  type="url"
                  className={styles.input}
                  value={p.url}
                  onChange={(e) => update(i, { url: e.target.value })}
                  placeholder="https://welovebudapest.com/cikk/…"
                  required
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Szerző</span>
                <span className={styles.fieldHelp}>Nem kötelező. A cikk írójának neve.</span>
                <input
                  className={styles.input}
                  value={p.author ?? ""}
                  onChange={(e) => update(i, { author: e.target.value })}
                  placeholder="Gedeon Lili"
                />
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Logó</span>
              <span className={styles.fieldHelp}>
                Csak a felsorolt lapok logói érhetők el. Logó nélkül a lap neve jelenik meg
                betűkkel — az is jól mutat. Új logóhoz fejlesztő kell.
              </span>
              <select
                className={styles.input}
                value={p.logo ?? ""}
                onChange={(e) => update(i, { logo: e.target.value })}
              >
                <option value="">Nincs logó</option>
                {PRESS_LOGO_OPTIONS.map((o) => (
                  <option key={o.file} value={o.file}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </div>

      <button type="button" className={styles.addBtn} onClick={add} disabled={value.length >= MAX_ITEMS}>
        + Új sajtómegjelenés
      </button>
      {value.length >= MAX_ITEMS && (
        <p className={styles.fieldHelp}>Legfeljebb {MAX_ITEMS} cikk jeleníthető meg.</p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.saveRow}>
        <button type="submit" className={styles.saveBtn} data-dirty={dirty} disabled={!dirty || pending}>
          {pending ? "Mentés..." : "Mentés"}
        </button>
      </div>
    </form>
  );
}
