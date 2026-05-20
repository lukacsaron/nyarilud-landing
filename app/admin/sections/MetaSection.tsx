"use client";

import { useState, useTransition } from "react";
import type { Site } from "@/lib/site/schema";
import { saveMetaAction } from "../actions";
import { useDirtyForm } from "../hooks/useDirtyForm";
import { useDirtyRegistration } from "../DirtyTracker";
import { useToast } from "../Toast";
import styles from "../admin.module.css";

type Initial = {
  title: string;
  description: string;
  slogan: string;
  email: string;
  streetAddress: string;
  addressLocality: string;
  postalCode: string;
  neighborhood: string;
};

function fromSite(s: Site): Initial {
  return {
    title: s.meta.title,
    description: s.meta.description,
    slogan: s.meta.slogan,
    email: s.contact.email,
    streetAddress: s.contact.address.streetAddress,
    addressLocality: s.contact.address.addressLocality,
    postalCode: s.contact.address.postalCode,
    neighborhood: s.contact.address.neighborhood,
  };
}

function charState(len: number, recommended: number, max: number): "ok" | "warn" | "over" {
  if (len > max) return "over";
  if (len > recommended) return "warn";
  return "ok";
}

export function MetaSection({ site }: { site: Site }) {
  const initial = fromSite(site);
  const { value, setValue, dirty, reset } = useDirtyForm<Initial>(initial);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  useDirtyRegistration("meta", dirty);

  const onChange = (k: keyof Initial) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValue((v) => ({ ...v, [k]: e.target.value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveMetaAction(value);
      if (result.ok) {
        reset(value);
        setSavedAt(new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" }));
        toast.push({ text: "Mentve", href: "/" });
      } else {
        setError(result.error);
      }
    });
  };

  const titleState = charState(value.title.length, 60, 70);
  const descState = charState(value.description.length, 160, 200);

  return (
    <form id="oldal" className={styles.section} onSubmit={onSubmit}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Oldal alapok</h2>
        {savedAt && <span className={styles.sectionSavedAt}>Mentve {savedAt}</span>}
      </div>
      <p className={styles.sectionIntro}>
        A bolt nyitóoldalának fő szövegei és a Google találatokban megjelenő információk.
      </p>

      <div className={styles.fieldGroup}>
        <div className={styles.fieldGroupLabel}>Keresőmotorok és közösségi média</div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Cím</span>
          <span className={styles.fieldHelp}>
            Ez jelenik meg a böngésző fülön és a Google találatok címeként. 50–60 karakter optimális.
          </span>
          <input className={styles.input} value={value.title} onChange={onChange("title")} required maxLength={70} />
          <span className={styles.charCount} data-state={titleState}>{value.title.length} / 60</span>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Leírás</span>
          <span className={styles.fieldHelp}>
            A Google találatok és a megosztott linkek (Facebook, Instagram) alatt jelenik meg. 150–160 karakter a legjobb.
          </span>
          <textarea className={styles.textarea} value={value.description} onChange={onChange("description")} required maxLength={200} />
          <span className={styles.charCount} data-state={descState}>{value.description.length} / 160</span>
        </label>
      </div>

      <div className={styles.fieldGroup}>
        <div className={styles.fieldGroupLabel}>A nyitóoldalon</div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Szlogen</span>
          <span className={styles.fieldHelp}>
            A nyitóoldal nagy szövegblokkja, közvetlenül a logó alatt. Új sort Enterrel kezdesz.
          </span>
          <textarea className={styles.textarea} value={value.slogan} onChange={onChange("slogan")} required />
        </label>
      </div>

      <div className={styles.fieldGroup}>
        <div className={styles.fieldGroupLabel}>Kapcsolat</div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>E-mail</span>
          <span className={styles.fieldHelp}>
            A „Merre vagyunk” részben jelenik meg, kattintható linkként. Ide érkeznek a vásárlói levelek.
          </span>
          <input className={styles.input} type="email" value={value.email} onChange={onChange("email")} required />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Utca, házszám</span>
          <span className={styles.fieldHelp}>Megjelenik a „Merre vagyunk” részben és a Google strukturált adatokban.</span>
          <input className={styles.input} value={value.streetAddress} onChange={onChange("streetAddress")} required />
        </label>

        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Város</span>
            <input className={styles.input} value={value.addressLocality} onChange={onChange("addressLocality")} required />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Irányítószám</span>
            <input className={styles.input} value={value.postalCode} onChange={onChange("postalCode")} required />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Városrész</span>
          <span className={styles.fieldHelp}>Pl. „Újlipótváros”. Csak a bolt címkártyáján jelenik meg.</span>
          <input className={styles.input} value={value.neighborhood} onChange={onChange("neighborhood")} required />
        </label>
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
