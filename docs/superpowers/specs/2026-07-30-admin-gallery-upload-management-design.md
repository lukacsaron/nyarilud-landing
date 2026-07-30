# Admin gallery upload management — design

**Date:** 2026-07-30
**Status:** Approved (design forks resolved with owner)

## Problem

The admin gallery editor (`app/admin/sections/GallerySection.tsx`) exposes only a
single dropzone that auto-assigns uploads to a hidden priority order. There is no
way to **replace a specific photo**, **remove a photo**, or **choose which photo a
new upload replaces**. The gallery is also hard-locked to exactly 5 photos by the
schema and the homepage layout.

## Goal

Give the boutique owner direct, legible control over the homepage gallery:

- Replace a specific photo.
- Remove a photo (down to a minimum of 1).
- Add a photo when there's room; when full, be asked which one to replace.

## Resolved design decisions

1. **Variable count 1–5** (not fixed 5). Removing a photo shrinks the gallery; the
   homepage composes itself for whatever count exists.
2. **Minimum 1 photo.** The last photo cannot be removed (Törlés disabled at 1). The
   homepage always shows a gallery — no empty-state to design.
3. **Auto-composing wall.** The homepage wall centers and wraps whatever count
   exists; each polaroid renders at its **true orientation** (aspect ratio from the
   actual image), so uploads are never force-cropped to a slot shape.
4. **Dropzone: add when there's room.** Under 5 → dropped photos are appended as new
   tiles. At 5 (full) → the inline "which to replace" picker appears.
5. **Inline slot-highlight picker** for the replace-when-full flow (chosen over a
   modal): tiles arm with "Ide" targets, the pending photo waits as a preview, click
   a tile to place it; Esc/Mégse cancels; multiple files queue.

## UX research grounding

- Replace/remove are **first-class per-thumbnail controls**, not hover-only — better
  for touch and accessibility (uxpatterns.dev image-upload pattern).
- Keep the **click-to-browse dropzone fallback** and clear activation feedback
  (Carbon, saasui.design).
- **Preview before commit** — already present (objectURL preview → "Mentés" commits).
- **Modals don't mix with multi-file** — hence inline picker, not a dialog.

## Architecture

### Data model / schema (`lib/site/schema.ts`)

- `PhotoSchema` unchanged (per-photo shape).
- `SiteSchema.gallery`: `.length(5)` → `.min(1).max(5)`, keep the unique-slot refine.
- Slot literal union `1..5` unchanged (5 remains the max).
- `DEFAULT_SITE` seeds unchanged (still 5). Seed display dimensions come from the
  imported `StaticImageData` on the homepage, not the schema placeholder dims, so
  content-driven aspect ratio keeps the default 3-portrait / 2-landscape look.

### API route (`app/admin/api/gallery/route.ts`)

- `MetaArray`: `.length(5)` → `.min(1).max(5)`.
- Slot validation: current `slots === [1,2,3,4,5]` check → **contiguous `1..N`**
  (`expected = Array.from({length: N}, (_, i) => i + 1)`).
- Everything else is unchanged. Removal needs **no delete code**: `swapPhotosDir`
  rebuilds the photos directory from `outputs`; any photo not in `outputs` is simply
  absent from the new directory and garbage-collected on swap.

### Admin editor (`app/admin/sections/GallerySection.tsx`)

State: `tiles: Tile[]` (length 1–5) + `pendingQueue: { file, previewUrl }[]` for the
targeting flow.

Actions:

- **Csere (replace)** — per-tile hidden `<input type=file>`; on select, swap that
  tile's `source` to a `new` file (revoke the previous objectURL). Slot unchanged.
- **Törlés (remove)** — `removeTile(uid)`: filter out, renumber slots to `1..N`.
  Button disabled when `tiles.length === 1`.
- **Dropzone add** — `onDrop(accepted)`:
  - `room = 5 - tiles.length`. Append the first `room` files as new tiles
    (slot = next index, empty alt, default pin `tape-top`, `blueTape: false`).
  - Any overflow (`accepted.slice(room)`) → push to `pendingQueue` (targeting).
  - If already full, all files go to `pendingQueue`.
- **Targeting mode** (active while `pendingQueue.length > 0`):
  - Banner near the dropzone: thumbnail of `pendingQueue[0]` + "Hová kerüljön ez a
    kép?" + "Mégse" (clears the whole queue, revokes URLs).
  - Each tile shows an "Ide" overlay button; click → replace that tile's source with
    `pendingQueue[0]`, shift the queue; repeat until empty.
  - `Escape` cancels. Drag-reorder is suppressed while targeting.
- **Reorder** — unchanged dnd-kit; `onDragEnd` renumbers slots.
- **Save** (`onSubmit`) — `meta` maps `tiles` for `1..N` (already generic over
  length); new files appended to FormData. On success, rebuild tiles/baseline from
  `body.gallery`.
- **Dirty tracking** — existing JSON compare already handles length changes.

### Admin styles (`app/admin/admin.module.css`)

- `.tileRow`: keep 5-col grid (`repeat(5, minmax(0, 1fr))`); fewer tiles occupy the
  left cells. Responsive rule unchanged.
- New: `.tileActions` (Csere / Törlés buttons, legible, always visible),
  `.tileTargetBtn` ("Ide"), `.targetingBanner`, and a dim/disabled state for tiles
  outside targeting.

### Homepage wall (`components/Gallery.tsx` + `Gallery.module.css`)

Only **positioning** changes. Tape, pushpin, hover, and the develop-flash animation
(all on `.figure` / `.ph`) are untouched.

- `.wall`: 12-col grid → `display: flex; flex-wrap: wrap; justify-content: center;
  align-items: flex-start;` with the existing gaps and `max-width`.
- Per figure: `--ar` set **inline** from the real image dims
  (seed → `StaticImageData` w/h; upload → `p.width/p.height`), clamped to a sane
  range (≈0.6–1.6). Orientation attribute `data-orient` (`portrait` / `square` /
  `landscape`) drives flex-basis so landscapes are wider than portraits.
- `.w1..w5` positional grid rules (`grid-column/row`, `--ar`, `margin-top`) are
  removed; the decorative per-index values (`--rot`, `--hover-tilt`, `--hover-x`,
  `--delay`) are **kept** (keyed by slot 1..5) plus a small per-index `margin-top`
  stagger for the pinned-up feel.
- Responsive: ≤620px → single stacked column (figures basis ~88vw); ≤980px → allow
  2–3 per row; desktop → natural wrap. The flex-wrap handles counts 1–5 for free.

## Edge cases

- **Remove at 1** — disabled; the sole photo can't be deleted.
- **Multi-file drop exceeding room** — fills to 5, remainder enters the replace
  queue (asked one at a time).
- **Cancel targeting** — discards the queue and revokes objectURLs; no photo changes.
- **objectURL leaks** — revoke on replace, remove, and cancel.
- **Seed still present after partial edits** — kept seeds copy nothing new (existing
  branch in the route already handles `isSeed`).

## Testing

- `lib/site/schema.test.ts`: accept lengths 1–5, reject 0 and 6, keep the
  unique-slot test. (TDD: add failing cases first.)
- Manual end-to-end via the running app (verify skill): add, replace, remove, drop-
  when-full picker, save, and confirm the homepage renders correctly at counts 1–5.

## Out of scope

- Empty (0-photo) gallery and its public empty-state.
- Editing per-photo rotation/position from the admin (stays index-derived).
- Changing the polaroid aesthetic, tape styles, or develop animation.
