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

  return (
    <form id="oldal" className={styles.section} onSubmit={onSubmit}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Oldal alapok</h2>
        {savedAt && <span className={styles.sectionSavedAt}>Mentve {savedAt}</span>}
      </div>

      <label className={styles.field}>
        Cím
        <input className={styles.input} value={value.title} onChange={onChange("title")} required />
      </label>
      <label className={styles.field}>
        Leírás
        <textarea className={styles.textarea} value={value.description} onChange={onChange("description")} required />
      </label>
      <label className={styles.field}>
        Szlogen <small>(Enter új sort jelent a Hero szövegében)</small>
        <textarea className={styles.textarea} value={value.slogan} onChange={onChange("slogan")} required />
      </label>
      <label className={styles.field}>
        E-mail
        <input className={styles.input} type="email" value={value.email} onChange={onChange("email")} required />
      </label>
      <label className={styles.field}>
        Cím (utca, házszám)
        <input className={styles.input} value={value.streetAddress} onChange={onChange("streetAddress")} required />
      </label>
      <label className={styles.field}>
        Város
        <input className={styles.input} value={value.addressLocality} onChange={onChange("addressLocality")} required />
      </label>
      <label className={styles.field}>
        Irányítószám
        <input className={styles.input} value={value.postalCode} onChange={onChange("postalCode")} required />
      </label>
      <label className={styles.field}>
        Városrész
        <input className={styles.input} value={value.neighborhood} onChange={onChange("neighborhood")} required />
      </label>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.saveRow}>
        <button type="submit" className={styles.saveBtn} data-dirty={dirty} disabled={!dirty || pending}>
          {pending ? "Mentés..." : "Mentés"}
        </button>
      </div>
    </form>
  );
}
