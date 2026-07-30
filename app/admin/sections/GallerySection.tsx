"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { useDirtyRegistration } from "../DirtyTracker";
import { useToast } from "../Toast";
import styles from "../admin.module.css";

import seed1 from "@/photos/nyari_lud_final_38.JPG_1.38.1.jpg";
import seed2 from "@/photos/nyari_lud_final_48.JPG_1.48.1.jpg";
import seed3 from "@/photos/nyari_lud_final_66.JPG_1.66.1.jpg";
import seed4 from "@/photos/nyari_lud_final_7.JPG_1.7.1.jpg";
import seed5 from "@/photos/nyari_lud_final_5.JPG_1.5.1.jpg";

const SEED_THUMBS: Record<string, string> = {
  "seed-1": seed1.src,
  "seed-2": seed2.src,
  "seed-3": seed3.src,
  "seed-4": seed4.src,
  "seed-5": seed5.src,
};

const MAX_TILES = 5;
const ACCEPT = { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"] };

const PIN_OPTIONS: { value: SitePhoto["pin"]; label: string }[] = [
  { value: "tape-top", label: "felül szalag" },
  { value: "tape-tl",  label: "bal sarok szalag" },
  { value: "tape-tr",  label: "jobb sarok szalag" },
  { value: "pin",      label: "rajzszög" },
];

type Slot = 1 | 2 | 3 | 4 | 5;

type Tile = {
  uid: string;
  slot: Slot;
  alt: string;
  pin: SitePhoto["pin"];
  blueTape: boolean;
  tapeRot?: string;
  source:
    | { kind: "existing"; id: string; previewSrc: string }
    | { kind: "new"; file: File; fileKey: string; previewUrl: string };
};

type Pending = { file: File; fileKey: string; previewUrl: string };

function newFileKey(): string {
  return `f-${Math.random().toString(36).slice(2)}`;
}

function tileFromSitePhoto(p: SitePhoto): Tile {
  const previewSrc = SEED_THUMBS[p.id] ?? `/photos/${p.id}.webp`;
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

/** New tile from an uploaded file, appended at the given slot. */
function tileFromFile(file: File, slot: Slot): Tile {
  const fileKey = newFileKey();
  return {
    uid: `tile-${fileKey}`,
    slot,
    alt: "",
    pin: "tape-top",
    blueTape: false,
    source: { kind: "new", file, fileKey, previewUrl: URL.createObjectURL(file) },
  };
}

function renumber(tiles: Tile[]): Tile[] {
  return tiles.map((t, i) => ({ ...t, slot: (i + 1) as Slot }));
}

/** Revoke the objectURL a tile owns, if it holds an unsaved upload. */
function revokeTile(t: Tile) {
  if (t.source.kind === "new") URL.revokeObjectURL(t.source.previewUrl);
}

function SortableTile({
  tile, canRemove, targeting,
  onChange, onReplace, onRemove, onPlace,
}: {
  tile: Tile;
  canRemove: boolean;
  targeting: boolean;
  onChange: (patch: Partial<Tile>) => void;
  onReplace: (file: File) => void;
  onRemove: () => void;
  onPlace: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tile.uid, disabled: targeting });
  const fileRef = useRef<HTMLInputElement>(null);
  const src = tile.source.kind === "existing" ? tile.source.previewSrc : tile.source.previewUrl;

  return (
    <div
      ref={setNodeRef}
      className={styles.tile}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
    >
      <div className={styles.tileSlotLabel}>{tile.slot}. hely</div>
      <div
        className={styles.tileDrag}
        {...(targeting ? {} : attributes)}
        {...(targeting ? {} : listeners)}
        aria-label="Áthelyezés"
      >⋮⋮</div>

      <div className={styles.tileImgWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className={styles.tileImg} />
        {targeting && (
          <button type="button" className={styles.tileTargetBtn} onClick={onPlace}>
            Ide
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onReplace(f);
          e.target.value = "";
        }}
      />
      <div className={styles.tileActions}>
        <button
          type="button"
          className={styles.tileBtn}
          onClick={() => fileRef.current?.click()}
          disabled={targeting}
        >
          Csere
        </button>
        <button
          type="button"
          className={`${styles.tileBtn} ${styles.tileBtnDanger}`}
          onClick={onRemove}
          disabled={targeting || !canRemove}
          title={canRemove ? "Kép eltávolítása" : "Legalább egy képnek maradnia kell"}
        >
          Törlés
        </button>
      </div>

      <span className={styles.tileFieldLabel}>Leírás (alt szöveg)</span>
      <input
        className={styles.input}
        placeholder="Mit ábrázol a kép?"
        value={tile.alt}
        onChange={(e) => onChange({ alt: e.target.value })}
      />
      <span className={styles.tileFieldLabel}>Stílus</span>
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
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(site.gallery));
  const [pendingQueue, setPendingQueue] = useState<Pending[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const targeting = pendingQueue.length > 0;
  const canRemove = tiles.length > 1;

  const baselineItems = (JSON.parse(baseline) as SitePhoto[]).map((p, i) => ({
    slot: i + 1, alt: p.alt, pin: p.pin, blueTape: p.blueTape,
    tapeRot: p.tapeRot, sourceKind: "existing", id: p.id,
  }));
  const dirty = JSON.stringify(tiles.map((t, i) => ({
    slot: i + 1, alt: t.alt, pin: t.pin, blueTape: t.blueTape,
    tapeRot: t.tapeRot, sourceKind: t.source.kind,
    id: t.source.kind === "existing" ? t.source.id : null,
  }))) !== JSON.stringify(baselineItems);
  useDirtyRegistration("gallery", dirty);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Cancel targeting on Escape.
  useEffect(() => {
    if (!targeting) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") cancelTargeting(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targeting]);

  const updateTile = (uid: string, patch: Partial<Tile>) =>
    setTiles((prev) => prev.map((t) => (t.uid === uid ? { ...t, ...patch } : t)));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setTiles((prev) => {
      const oldI = prev.findIndex((t) => t.uid === active.id);
      const newI = prev.findIndex((t) => t.uid === over.id);
      return renumber(arrayMove(prev, oldI, newI));
    });
  };

  const removeTile = (uid: string) =>
    setTiles((prev) => {
      if (prev.length <= 1) return prev;
      const target = prev.find((t) => t.uid === uid);
      if (target) revokeTile(target);
      return renumber(prev.filter((t) => t.uid !== uid));
    });

  const replaceTileFile = (uid: string, file: File) =>
    setTiles((prev) => prev.map((t) => {
      if (t.uid !== uid) return t;
      revokeTile(t);
      const fileKey = newFileKey();
      return { ...t, source: { kind: "new", file, fileKey, previewUrl: URL.createObjectURL(file) } };
    }));

  const onDrop = (accepted: File[]) => {
    if (accepted.length === 0) return;
    const room = Math.max(0, MAX_TILES - tiles.length);
    const toAdd = accepted.slice(0, room);
    const toQueue = accepted.slice(room);
    if (toAdd.length > 0) {
      setTiles((prev) => renumber([
        ...prev,
        ...toAdd.map((f, i) => tileFromFile(f, (prev.length + i + 1) as Slot)),
      ]));
    }
    if (toQueue.length > 0) {
      setPendingQueue((prev) => [
        ...prev,
        ...toQueue.map((f) => {
          const fileKey = newFileKey();
          return { file: f, fileKey, previewUrl: URL.createObjectURL(f) };
        }),
      ]);
    }
  };

  const placePending = (uid: string) => {
    const head = pendingQueue[0];
    if (!head) return;
    setTiles((prev) => prev.map((t) => {
      if (t.uid !== uid) return t;
      revokeTile(t);
      return { ...t, source: { kind: "new", file: head.file, fileKey: head.fileKey, previewUrl: head.previewUrl } };
    }));
    setPendingQueue((prev) => prev.slice(1));
  };

  const cancelTargeting = () =>
    setPendingQueue((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPT,
    maxSize: 25 * 1024 * 1024,
    onDrop,
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    const meta = tiles.map((t, i) => {
      const slot = (i + 1) as Slot;
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
      const newTiles = (body.gallery as SitePhoto[]).map(tileFromSitePhoto);
      setTiles(newTiles);
      setBaseline(JSON.stringify(body.gallery));
      setSavedAt(new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" }));
      toast.push({ text: "Galéria mentve", href: "/" });
      router.refresh();
    });
  };

  return (
    <form id="galeria" className={styles.section} onSubmit={onSubmit}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Galéria</h2>
        {savedAt && <span className={styles.sectionSavedAt}>Mentve {savedAt}</span>}
      </div>
      <p className={styles.sectionIntro}>
        Egy–öt polaroid stílusú fotó a nyitóoldalon. A sorrend balról jobbra felel meg a lent látható helyeknek. Húzd át a csempéket az átrendezéshez, cseréld vagy töröld őket egyenként. A kép legalább 1200 px széles legyen, max 25 MB.
      </p>

      <div {...getRootProps()} className={`${styles.dropzone}${isDragActive ? ` ${styles.dropzoneActive}` : ""}`}>
        <input {...getInputProps()} />
        {isDragActive
          ? <span>Engedd el a képet…</span>
          : tiles.length >= MAX_TILES
            ? <span>Öt kép van fent (maximum). Húzz ide egy újat, és megkérdezem, <strong>melyiket cseréljem le</strong>.</span>
            : <span>Húzd ide a képeket, vagy <strong>kattints a kiválasztáshoz</strong>. JPG / PNG / HEIC, max 25 MB.</span>}
      </div>

      {targeting && (
        <div className={styles.targetingBanner}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingQueue[0].previewUrl} alt="" className={styles.targetingThumb} />
          <span className={styles.targetingText}>
            Hová kerüljön ez a kép? Kattints egy hely <strong>„Ide”</strong> gombjára.
            {pendingQueue.length > 1 && ` (még ${pendingQueue.length - 1} vár)`}
          </span>
          <button type="button" className={styles.targetingCancel} onClick={cancelTargeting}>
            Mégse
          </button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={tiles.map((t) => t.uid)} strategy={horizontalListSortingStrategy}>
          <div className={styles.tileRow}>
            {tiles.map((t) => (
              <SortableTile
                key={t.uid}
                tile={t}
                canRemove={canRemove}
                targeting={targeting}
                onChange={(patch) => updateTile(t.uid, patch)}
                onReplace={(file) => replaceTileFile(t.uid, file)}
                onRemove={() => removeTile(t.uid)}
                onPlace={() => placePending(t.uid)}
              />
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
