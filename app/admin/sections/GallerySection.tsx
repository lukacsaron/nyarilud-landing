"use client";

import { useState, useTransition } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDropzone } from "react-dropzone";
import type { Site, SitePhoto } from "@/lib/site/schema";
import { useToast } from "../Toast";
import styles from "../admin.module.css";

const PIN_OPTIONS: { value: SitePhoto["pin"]; label: string }[] = [
  { value: "tape-top", label: "felül szalag" },
  { value: "tape-tl",  label: "bal sarok szalag" },
  { value: "tape-tr",  label: "jobb sarok szalag" },
  { value: "pin",      label: "rajzszög" },
];

type Tile = {
  uid: string;
  slot: 1 | 2 | 3 | 4 | 5;
  alt: string;
  pin: SitePhoto["pin"];
  blueTape: boolean;
  tapeRot?: string;
  source:
    | { kind: "existing"; id: string; previewSrc: string }
    | { kind: "new"; file: File; fileKey: string; previewUrl: string };
};

function tileFromSitePhoto(p: SitePhoto): Tile {
  const previewSrc = p.id.startsWith("seed-") ? "/seed-thumb.jpg" : `/photos/${p.id}.webp`;
  return {
    uid: p.id,
    slot: p.slot,
    alt: p.alt,
    pin: p.pin,
    blueTape: p.blueTape,
    tapeRot: p.tapeRot,
    source: { kind: "existing", id: p.id, previewSrc },
  };
}

function SortableTile({ tile, onChange }: { tile: Tile; onChange: (patch: Partial<Tile>) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tile.uid });
  const src = tile.source.kind === "existing" ? tile.source.previewSrc : tile.source.previewUrl;
  return (
    <div
      ref={setNodeRef}
      className={styles.tile}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
    >
      <div className={styles.tileDrag} {...attributes} {...listeners} aria-label="Áthelyezés">⋮⋮</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className={styles.tileImg} />
      <input
        className={styles.input}
        placeholder="Leírás (alt szöveg)"
        value={tile.alt}
        onChange={(e) => onChange({ alt: e.target.value })}
      />
      <select
        className={styles.input}
        value={tile.pin}
        onChange={(e) => onChange({ pin: e.target.value as SitePhoto["pin"] })}
      >
        {PIN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <label className={styles.tileToggle}>
        <input
          type="checkbox"
          checked={tile.blueTape}
          onChange={(e) => onChange({ blueTape: e.target.checked })}
        />
        kék szalag
      </label>
    </div>
  );
}

export function GallerySection({ site }: { site: Site }) {
  const [tiles, setTiles] = useState<Tile[]>(() => site.gallery.map(tileFromSitePhoto));
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const dirty = JSON.stringify(tiles.map((t, i) => ({
    slot: i + 1, alt: t.alt, pin: t.pin, blueTape: t.blueTape,
    tapeRot: t.tapeRot, sourceKind: t.source.kind,
    id: t.source.kind === "existing" ? t.source.id : null,
  }))) !== JSON.stringify(site.gallery.map((p, i) => ({
    slot: i + 1, alt: p.alt, pin: p.pin, blueTape: p.blueTape,
    tapeRot: p.tapeRot, sourceKind: "existing", id: p.id,
  })));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateTile = (uid: string, patch: Partial<Tile>) =>
    setTiles((prev) => prev.map((t) => (t.uid === uid ? { ...t, ...patch } : t)));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setTiles((prev) => {
      const oldI = prev.findIndex((t) => t.uid === active.id);
      const newI = prev.findIndex((t) => t.uid === over.id);
      return arrayMove(prev, oldI, newI).map((t, i) => ({ ...t, slot: (i + 1) as Tile["slot"] }));
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"] },
    maxSize: 25 * 1024 * 1024,
    onDrop: (accepted) => {
      if (accepted.length === 0) return;
      setTiles((prev) => {
        const next = [...prev];
        for (const file of accepted) {
          const seedIdx = next.findIndex((t) => t.source.kind === "existing" && t.source.id.startsWith("seed-"));
          const newIdx = next.findIndex((t) => t.source.kind === "new");
          const idx = seedIdx >= 0 ? seedIdx : (newIdx >= 0 ? newIdx : next.length - 1);
          const fileKey = `f-${Math.random().toString(36).slice(2)}`;
          const previewUrl = URL.createObjectURL(file);
          const old = next[idx];
          next[idx] = {
            ...old,
            uid: `tile-${fileKey}`,
            source: { kind: "new", file, fileKey, previewUrl },
          };
        }
        return next;
      });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    const meta = tiles.map((t, i) => {
      const slot = (i + 1) as Tile["slot"];
      if (t.source.kind === "existing") {
        return { kind: "keep", id: t.source.id, slot, alt: t.alt, pin: t.pin, blueTape: t.blueTape, tapeRot: t.tapeRot };
      }
      formData.append(`photo[${t.source.fileKey}]`, t.source.file);
      return { kind: "new", fileKey: t.source.fileKey, slot, alt: t.alt, pin: t.pin, blueTape: t.blueTape, tapeRot: t.tapeRot };
    });
    formData.append("meta", JSON.stringify(meta));

    startTransition(async () => {
      const res = await fetch("/admin/api/gallery", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error ?? "Mentés sikertelen");
        return;
      }
      setSavedAt(new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" }));
      toast.push({ text: "Galéria mentve", href: "/" });
      window.location.reload();
    });
  };

  return (
    <form id="galeria" className={styles.section} onSubmit={onSubmit}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Galéria</h2>
        {savedAt && <span className={styles.sectionSavedAt}>Mentve {savedAt}</span>}
      </div>

      <div {...getRootProps()} className={`${styles.dropzone}${isDragActive ? ` ${styles.dropzoneActive}` : ""}`}>
        <input {...getInputProps()} />
        {isDragActive
          ? <span>Engedd el a képet…</span>
          : <span>Húzd ide a képeket, vagy <strong>kattints a kiválasztáshoz</strong>. JPG / PNG / HEIC, max 25 MB.</span>}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={tiles.map((t) => t.uid)} strategy={horizontalListSortingStrategy}>
          <div className={styles.tileRow}>
            {tiles.map((t) => (
              <SortableTile key={t.uid} tile={t} onChange={(patch) => updateTile(t.uid, patch)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.saveRow}>
        <button type="submit" className={styles.saveBtn} data-dirty={dirty} disabled={!dirty || pending}>
          {pending ? "Feltöltés..." : "Mentés"}
        </button>
      </div>
    </form>
  );
}
