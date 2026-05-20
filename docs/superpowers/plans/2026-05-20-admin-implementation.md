# /admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an env-credentialed `/admin` route that lets the boutique owner edit page text, gallery photos, weekly opening hours, and dated holiday exceptions — with edits persisted in a Docker volume and live within one revalidation.

**Architecture:** A single zod-validated `site.json` in `/data/` is the source of truth for every consumer (`generateMetadata`, JSON-LD, Hero slogan, FindUs schedule, useOpenStatus). Gallery photos live in `/data/photos/` as content-addressed WebP files. Admin authenticates with a Web Crypto HMAC signed cookie; admin pages are guarded by a per-request `requireAdmin()` call (middleware is not a security boundary post CVE-2025-29927). Saves use atomic temp+rename writes followed by `revalidateTag('site')` + `revalidatePath('/', 'layout')`.

**Tech Stack:** Next.js 15.2.3 (App Router, React 19), zod, sharp, @dnd-kit/sortable, react-dropzone, vitest (new), CSS modules. No NextAuth, no UI library.

**Spec:** `docs/superpowers/specs/2026-05-20-admin-design.md`

---

## Conventions used throughout this plan

- Package manager is **pnpm** (`packageManager: pnpm@10.4.1` in package.json).
- Path alias `@/*` resolves to the repo root (`tsconfig.json`).
- Hungarian copy is in the actual code; comments and identifiers are English.
- TDD applies to pure functions in `lib/site/` and `lib/auth/`. React components are verified by `pnpm dev` + manual smoke at the end of each phase.
- After every task, run `pnpm typecheck` before committing. Commits use the existing repo style (lowercase, descriptive imperative).
- `git status` should be clean before starting each task.

---

# Phase A — Foundation (no admin UI yet)

This phase moves all editable content out of hardcoded TS into `lib/site/` and a JSON-loaded model, without exposing `/admin` yet. After Phase A the site looks identical to today but is data-driven.

---

### Task A1: Add dev dependencies and configure vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Bump Next and add deps**

Run:
```bash
pnpm add next@15.2.3 react@19.0.0 react-dom@19.0.0
pnpm add zod
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
pnpm add react-dropzone
pnpm add -D vitest @vitest/coverage-v8 tsx
```

Expected: `package.json` shows `"next": "^15.2.3"`, `"zod"`, dnd-kit, react-dropzone in dependencies; vitest + tsx in devDependencies.

- [ ] **Step 2: Add test scripts**

Modify `package.json` scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 4: Update `.gitignore`**

Append:
```
.data/
coverage/
```

- [ ] **Step 5: Verify install + empty test run**

Run:
```bash
pnpm install
pnpm test
```

Expected: install succeeds; vitest reports "No test files found, exiting" (this is success — no tests yet).

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts .gitignore
git commit -m "build: bump Next to 15.2.3 and add zod + dnd-kit + react-dropzone + vitest"
```

---

### Task A2: Site schema with zod + DEFAULT_SITE

**Files:**
- Create: `lib/site/schema.ts`
- Create: `lib/site/schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/site/schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { SiteSchema, DEFAULT_SITE } from "./schema";

describe("SiteSchema", () => {
  it("DEFAULT_SITE passes its own schema", () => {
    const result = SiteSchema.safeParse(DEFAULT_SITE);
    expect(result.success).toBe(true);
  });

  it("rejects an exception in custom mode without opens/closes", () => {
    const bad = {
      ...DEFAULT_SITE,
      exceptions: [{ date: "2026-12-24", mode: "custom" }],
    };
    expect(SiteSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a gallery with fewer than 5 photos", () => {
    const bad = { ...DEFAULT_SITE, gallery: DEFAULT_SITE.gallery.slice(0, 4) };
    expect(SiteSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts an exception in closed mode without opens/closes", () => {
    const ok = {
      ...DEFAULT_SITE,
      exceptions: [{ date: "2026-12-24", label: "Karácsony", mode: "closed" }],
    };
    expect(SiteSchema.safeParse(ok).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL with "Cannot find module './schema'".

- [ ] **Step 3: Create `lib/site/schema.ts`**

```ts
import { z } from "zod";

const TimeHHMM = z.string().regex(/^\d{2}:\d{2}$/, "expected HH:MM");

const DaySchema = z.object({
  closed: z.boolean(),
  opens: TimeHHMM,
  closes: TimeHHMM,
});

const ExceptionSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    label: z.string().optional(),
    mode: z.enum(["closed", "custom"]),
    opens: TimeHHMM.optional(),
    closes: TimeHHMM.optional(),
  })
  .refine(
    (e) => e.mode === "closed" || (e.opens !== undefined && e.closes !== undefined),
    { message: "custom mode requires opens and closes" }
  );

const PinStyle = z.enum(["tape-top", "tape-tl", "tape-tr", "pin"]);

const PhotoSchema = z.object({
  id: z.string(),
  slot: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  alt: z.string(),
  pin: PinStyle,
  blueTape: z.boolean().default(false),
  tapeRot: z.string().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  blurDataURL: z.string(),
});

export const SiteSchema = z.object({
  meta: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    slogan: z.string().min(1),
  }),
  contact: z.object({
    email: z.string().email(),
    address: z.object({
      streetAddress: z.string(),
      addressLocality: z.string(),
      postalCode: z.string(),
      neighborhood: z.string(),
    }),
  }),
  hours: z.object({
    mon: DaySchema,
    tue: DaySchema,
    wed: DaySchema,
    thu: DaySchema,
    fri: DaySchema,
    sat: DaySchema,
    sun: DaySchema,
  }),
  exceptions: z.array(ExceptionSchema),
  gallery: z.array(PhotoSchema).length(5),
});

export type Site = z.infer<typeof SiteSchema>;
export type SiteHours = Site["hours"];
export type SiteException = Site["exceptions"][number];
export type SitePhoto = Site["gallery"][number];
export type DayKey = keyof SiteHours;

export const DAY_KEYS: readonly DayKey[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

const closedDay = { closed: true, opens: "10:00", closes: "15:00" } as const;
const open10to15 = { closed: false, opens: "10:00", closes: "15:00" } as const;
const open10to18 = { closed: false, opens: "10:00", closes: "18:00" } as const;

export const DEFAULT_SITE: Site = {
  meta: {
    title: "nyári lúd · premium preloved boutique · Budapest",
    description:
      "Premium preloved boutique a Pozsonyi úton (Újlipótváros, Budapest). Gondosan válogatott Ganni, Baum und Pferdgarten, Stine Goya, Samsøe Samsøe, Sézane, Isabel Marant, A.P.C., Acne Studios és további skandináv és francia márkák.",
    slogan:
      "kicsi bolt a Pozsonyi úton, tele ruhákkal,\namik már megéltek egy életet\n— és most új sztorira várnak.",
  },
  contact: {
    email: "dora@nyarilud.hu",
    address: {
      streetAddress: "Pozsonyi út 30",
      addressLocality: "Budapest",
      postalCode: "1137",
      neighborhood: "Újlipótváros",
    },
  },
  hours: {
    mon: closedDay,
    tue: open10to15,
    wed: open10to15,
    thu: open10to15,
    fri: open10to18,
    sat: open10to15,
    sun: closedDay,
  },
  exceptions: [],
  gallery: [
    { id: "seed-1", slot: 1, alt: "Nyári lúd — sárga csíkos kabát", pin: "tape-top", blueTape: false, width: 1440, height: 1920, blurDataURL: "data:image/webp;base64,UklGRgAA" },
    { id: "seed-2", slot: 2, alt: "Nyári lúd — hímzett mellény", pin: "tape-tl", blueTape: true, width: 1440, height: 1920, blurDataURL: "data:image/webp;base64,UklGRgAA" },
    { id: "seed-3", slot: 3, alt: "Nyári lúd — sárga öv hangtag-gel", pin: "pin", blueTape: false, width: 1440, height: 1920, blurDataURL: "data:image/webp;base64,UklGRgAA" },
    { id: "seed-4", slot: 4, alt: "Nyári lúd — boltbelső", pin: "tape-tr", blueTape: false, width: 1440, height: 1920, blurDataURL: "data:image/webp;base64,UklGRgAA" },
    { id: "seed-5", slot: 5, alt: "Nyári lúd — a kirakat", pin: "tape-top", blueTape: true, tapeRot: "2deg", width: 1440, height: 1920, blurDataURL: "data:image/webp;base64,UklGRgAA" },
  ],
};
```

The `seed-*` photo IDs are a sentinel meaning "use the static seed images from `/photos/*.jpg` instead of `/data/photos/`". Gallery component (Task A14) handles this branch.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/site/schema.ts lib/site/schema.test.ts
git commit -m "feat(site): add zod schema and DEFAULT_SITE seeded from current values"
```

---

### Task A3: Atomic write helper

**Files:**
- Create: `lib/site/atomic.ts`
- Create: `lib/site/atomic.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { atomicWriteJson, atomicWriteFile } from "./atomic";

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "atomic-"));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("atomicWriteJson", () => {
  it("writes the file and round-trips", async () => {
    const target = path.join(dir, "site.json");
    await atomicWriteJson(target, { hello: "vilag" });
    const raw = await fs.readFile(target, "utf8");
    expect(JSON.parse(raw)).toEqual({ hello: "vilag" });
  });

  it("does not leave temp files behind on success", async () => {
    const target = path.join(dir, "site.json");
    await atomicWriteJson(target, { x: 1 });
    const entries = await fs.readdir(dir);
    expect(entries).toEqual(["site.json"]);
  });
});

describe("atomicWriteFile", () => {
  it("writes binary buffer atomically", async () => {
    const target = path.join(dir, "blob.bin");
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    await atomicWriteFile(target, buf);
    const read = await fs.readFile(target);
    expect(Buffer.compare(read, buf)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL with "Cannot find module './atomic'".

- [ ] **Step 3: Implement `lib/site/atomic.ts`**

```ts
import { promises as fs } from "fs";
import crypto from "crypto";
import path from "path";

async function writeThenRename(target: string, data: string | Buffer): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.tmp-${crypto.randomUUID()}`;
  try {
    await fs.writeFile(tmp, data);
    await fs.rename(tmp, target);
  } catch (err) {
    await fs.rm(tmp, { force: true });
    throw err;
  }
}

export async function atomicWriteJson(target: string, value: unknown): Promise<void> {
  await writeThenRename(target, JSON.stringify(value, null, 2));
}

export async function atomicWriteFile(target: string, data: Buffer | string): Promise<void> {
  await writeThenRename(target, data);
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test`
Expected: all atomic tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/site/atomic.ts lib/site/atomic.test.ts
git commit -m "feat(site): add atomic temp+rename write helpers"
```

---

### Task A4: Paths module

**Files:**
- Create: `lib/site/paths.ts`

- [ ] **Step 1: Implement `lib/site/paths.ts`**

```ts
import path from "path";

function resolveDataDir(): string {
  if (process.env.SITE_DATA_DIR) return process.env.SITE_DATA_DIR;
  if (process.env.NODE_ENV === "production") return "/data";
  return path.join(process.cwd(), ".data");
}

export const DATA_DIR = resolveDataDir();
export const SITE_JSON_PATH = path.join(DATA_DIR, "site.json");
export const PHOTOS_DIR = path.join(DATA_DIR, "photos");
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/site/paths.ts
git commit -m "feat(site): add env-aware data paths module"
```

---

### Task A5: Hours — `toOpeningHoursSpecification`

**Files:**
- Create: `lib/site/hours.ts`
- Create: `lib/site/hours.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { DEFAULT_SITE } from "./schema";
import { toOpeningHoursSpecification } from "./hours";

describe("toOpeningHoursSpecification", () => {
  it("emits one entry per open day with matching times", () => {
    const spec = toOpeningHoursSpecification(DEFAULT_SITE);
    expect(spec).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Tuesday",   opens: "10:00", closes: "15:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Wednesday", opens: "10:00", closes: "15:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Thursday",  opens: "10:00", closes: "15:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Friday",    opens: "10:00", closes: "18:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday",  opens: "10:00", closes: "15:00" },
    ]);
  });

  it("emits no entries when all days are closed", () => {
    const allClosed = {
      ...DEFAULT_SITE,
      hours: Object.fromEntries(
        Object.keys(DEFAULT_SITE.hours).map((k) => [k, { closed: true, opens: "10:00", closes: "15:00" }])
      ) as typeof DEFAULT_SITE.hours,
    };
    expect(toOpeningHoursSpecification(allClosed)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test hours`
Expected: FAIL "Cannot find module './hours'".

- [ ] **Step 3: Implement starting `lib/site/hours.ts`**

```ts
import type { Site, DayKey } from "./schema";
import { DAY_KEYS } from "./schema";

const DAY_OF_WEEK: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export type JsonLdHours = {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string;
  opens: string;
  closes: string;
};

export function toOpeningHoursSpecification(site: Site): JsonLdHours[] {
  return DAY_KEYS
    .filter((k) => !site.hours[k].closed)
    .map((k) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_OF_WEEK[k],
      opens: site.hours[k].opens,
      closes: site.hours[k].closes,
    }));
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test hours`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/site/hours.ts lib/site/hours.test.ts
git commit -m "feat(site): derive JSON-LD openingHoursSpecification from site schema"
```

---

### Task A6: Hours — `toHumanGroups`

**Files:**
- Modify: `lib/site/hours.ts`
- Modify: `lib/site/hours.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `lib/site/hours.test.ts`:
```ts
import { toHumanGroups } from "./hours";

describe("toHumanGroups", () => {
  it("groups DEFAULT_SITE into Hungarian day ranges", () => {
    expect(toHumanGroups(DEFAULT_SITE)).toEqual([
      { label: "Kedd–Csüt, Szo", time: "10 — 15", muted: false },
      { label: "Péntek",         time: "10 — 18", muted: false },
      { label: "Vasárnap, Hétfő", time: "ZÁRVA",  muted: true  },
    ]);
  });

  it("regroups when a previously open day becomes closed", () => {
    const wedClosed = {
      ...DEFAULT_SITE,
      hours: { ...DEFAULT_SITE.hours, wed: { closed: true, opens: "10:00", closes: "15:00" } },
    };
    const groups = toHumanGroups(wedClosed);
    expect(groups[0]).toEqual({ label: "Kedd, Csüt, Szo", time: "10 — 15", muted: false });
  });

  it("collapses an all-closed week into a single 'ZÁRVA' row", () => {
    const allClosed = {
      ...DEFAULT_SITE,
      hours: Object.fromEntries(
        Object.keys(DEFAULT_SITE.hours).map((k) => [k, { closed: true, opens: "10:00", closes: "15:00" }])
      ) as typeof DEFAULT_SITE.hours,
    };
    expect(toHumanGroups(allClosed)).toEqual([
      { label: "Hét–Vas", time: "ZÁRVA", muted: true },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test hours`
Expected: `toHumanGroups is not defined`.

- [ ] **Step 3: Implement in `lib/site/hours.ts`**

Append:
```ts
const DAY_LABEL_HU: Record<DayKey, string> = {
  mon: "Hét",
  tue: "Kedd",
  wed: "Szer",
  thu: "Csüt",
  fri: "Péntek",
  sat: "Szo",
  sun: "Vas",
};
const DAY_LABEL_HU_LONG: Record<DayKey, string> = {
  mon: "Hétfő",
  tue: "Kedd",
  wed: "Szerda",
  thu: "Csütörtök",
  fri: "Péntek",
  sat: "Szombat",
  sun: "Vasárnap",
};

export type HoursGroup = { label: string; time: string; muted: boolean };

type SignatureRun = { keys: DayKey[]; sig: string; closed: boolean; opens: string; closes: string };

function sigOf(day: { closed: boolean; opens: string; closes: string }): string {
  return day.closed ? "CLOSED" : `${day.opens}-${day.closes}`;
}

function groupRuns(site: Site): SignatureRun[] {
  const runs: SignatureRun[] = [];
  for (const k of DAY_KEYS) {
    const d = site.hours[k];
    const sig = sigOf(d);
    const last = runs[runs.length - 1];
    if (last && last.sig === sig && consecutive(last.keys[last.keys.length - 1], k)) {
      last.keys.push(k);
    } else {
      runs.push({ keys: [k], sig, closed: d.closed, opens: d.opens, closes: d.closes });
    }
  }
  // Merge wrap-around (sun + mon) when sig matches and they're isolated
  return mergeWrap(runs);
}

function consecutive(a: DayKey, b: DayKey): boolean {
  const i = DAY_KEYS.indexOf(a);
  const j = DAY_KEYS.indexOf(b);
  return j === i + 1;
}

function mergeWrap(runs: SignatureRun[]): SignatureRun[] {
  if (runs.length < 2) return runs;
  const first = runs[0];
  const last = runs[runs.length - 1];
  if (first.sig === last.sig && first !== last) {
    last.keys.push(...first.keys);
    return runs.slice(1);
  }
  return runs;
}

function labelRun(run: SignatureRun): string {
  if (run.keys.length === 1) return DAY_LABEL_HU_LONG[run.keys[0]];
  if (run.keys.length === 2) {
    return `${DAY_LABEL_HU_LONG[run.keys[0]]}, ${DAY_LABEL_HU_LONG[run.keys[1]]}`;
  }
  // Check if the run is one consecutive block in DAY_KEYS order
  const idxs = run.keys.map((k) => DAY_KEYS.indexOf(k)).sort((a, b) => a - b);
  const isConsecutive = idxs.every((v, i) => i === 0 || v === idxs[i - 1] + 1);
  if (isConsecutive && run.keys.length >= 3) {
    const sortedKeys = idxs.map((i) => DAY_KEYS[i]);
    return `${DAY_LABEL_HU[sortedKeys[0]]}–${DAY_LABEL_HU[sortedKeys[sortedKeys.length - 1]]}`;
  }
  // Non-consecutive (e.g. Tue,Thu,Sat) — comma-list with abbreviated names
  return run.keys.map((k) => DAY_LABEL_HU[k]).join(", ");
}

function compositeLabel(runs: SignatureRun[]): HoursGroup[] {
  // Final pass: group same-sig runs into a single label even if days aren't consecutive
  const bySig = new Map<string, SignatureRun[]>();
  for (const r of runs) {
    const arr = bySig.get(r.sig) ?? [];
    arr.push(r);
    bySig.set(r.sig, arr);
  }
  // Preserve the order of first occurrence
  const seen = new Set<string>();
  const ordered: HoursGroup[] = [];
  for (const r of runs) {
    if (seen.has(r.sig)) continue;
    seen.add(r.sig);
    const all = bySig.get(r.sig)!;
    const merged: SignatureRun = {
      keys: all.flatMap((x) => x.keys),
      sig: r.sig,
      closed: r.closed,
      opens: r.opens,
      closes: r.closes,
    };
    ordered.push({
      label: labelRun(merged),
      time: merged.closed ? "ZÁRVA" : `${parseInt(merged.opens, 10)} — ${parseInt(merged.closes, 10)}`,
      muted: merged.closed,
    });
  }
  return ordered;
}

export function toHumanGroups(site: Site): HoursGroup[] {
  return compositeLabel(groupRuns(site));
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test hours`
Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/site/hours.ts lib/site/hours.test.ts
git commit -m "feat(site): derive Hungarian day-range groups from hours schema"
```

---

### Task A7: Hours — `statusAt` and `todaysExceptionBanner`

**Files:**
- Modify: `lib/site/hours.ts`
- Modify: `lib/site/hours.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `lib/site/hours.test.ts`:
```ts
import { statusAt, todaysExceptionBanner } from "./hours";

const BUDAPEST = "Europe/Budapest";
function at(iso: string): Date { return new Date(iso); }

describe("statusAt", () => {
  it("reports open during a weekday's regular hours", () => {
    // Friday 2026-05-22 at 11:00 Budapest = 09:00 UTC
    expect(statusAt(DEFAULT_SITE, at("2026-05-22T09:00:00Z"))).toEqual({ open: true });
  });

  it("reports closed before opening with nextDayLabel 'ma'", () => {
    // Tuesday 2026-05-19 at 08:00 Budapest = 06:00 UTC
    expect(statusAt(DEFAULT_SITE, at("2026-05-19T06:00:00Z"))).toEqual({
      open: false, nextDayLabel: "ma", nextHour: 10,
    });
  });

  it("reports closed after hours, points to next open day", () => {
    // Saturday 2026-05-23 at 16:00 Budapest (closes 15:00) → next open is Tuesday "kedden"
    expect(statusAt(DEFAULT_SITE, at("2026-05-23T14:00:00Z"))).toEqual({
      open: false, nextDayLabel: "kedden", nextHour: 10,
    });
  });

  it("respects a 'closed' exception for today", () => {
    const site = {
      ...DEFAULT_SITE,
      exceptions: [{ date: "2026-05-22", mode: "closed" as const, label: "Karácsony" }],
    };
    // Friday 11:00 — would be open, but exception closes it
    expect(statusAt(site, at("2026-05-22T09:00:00Z")).open).toBe(false);
  });

  it("respects a 'custom' exception for today", () => {
    const site = {
      ...DEFAULT_SITE,
      exceptions: [{ date: "2026-05-22", mode: "custom" as const, opens: "12:00", closes: "14:00" }],
    };
    // 11:00 → still closed
    expect(statusAt(site, at("2026-05-22T09:00:00Z")).open).toBe(false);
    // 13:00 → open
    expect(statusAt(site, at("2026-05-22T11:00:00Z")).open).toBe(true);
  });
});

describe("todaysExceptionBanner", () => {
  it("returns null when no exception today", () => {
    expect(todaysExceptionBanner(DEFAULT_SITE, at("2026-05-22T09:00:00Z"))).toBeNull();
  });

  it("returns the label + 'ma zárva' for a labeled closed exception today", () => {
    const site = {
      ...DEFAULT_SITE,
      exceptions: [{ date: "2026-05-22", mode: "closed" as const, label: "Karácsony" }],
    };
    expect(todaysExceptionBanner(site, at("2026-05-22T09:00:00Z"))).toBe("Karácsony — ma ZÁRVA");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test hours`
Expected: `statusAt is not defined`.

- [ ] **Step 3: Implement in `lib/site/hours.ts`**

Append:
```ts
export type OpenStatus =
  | { open: true }
  | { open: false; nextDayLabel: string | null; nextHour: number };

const NEXT_DAY_HU: Record<DayKey, string> = {
  mon: "hétfőn",
  tue: "kedden",
  wed: "szerdán",
  thu: "csütörtökön",
  fri: "pénteken",
  sat: "szombaton",
  sun: "vasárnap",
};

function budapestParts(now: Date): { dayKey: DayKey; isoDate: string; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Budapest",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const weekdayShortToKey: Record<string, DayKey> = {
    Sun: "sun", Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat",
  };
  return {
    dayKey: weekdayShortToKey[parts.weekday],
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    hour: parseInt(parts.hour, 10) % 24,
    minute: parseInt(parts.minute, 10),
  };
}

function parseHHMM(s: string): { h: number; m: number } {
  return { h: parseInt(s.slice(0, 2), 10), m: parseInt(s.slice(3, 5), 10) };
}

function effectiveHoursToday(site: Site, isoDate: string, dayKey: DayKey):
  | { closed: true }
  | { closed: false; opens: string; closes: string } {
  const ex = site.exceptions.find((e) => e.date === isoDate);
  if (ex) {
    if (ex.mode === "closed") return { closed: true };
    return { closed: false, opens: ex.opens!, closes: ex.closes! };
  }
  const d = site.hours[dayKey];
  return d.closed ? { closed: true } : { closed: false, opens: d.opens, closes: d.closes };
}

function findNextOpening(site: Site, fromKey: DayKey): { nextDayLabel: string | null; nextHour: number } {
  for (let i = 1; i <= 7; i++) {
    const k = DAY_KEYS[(DAY_KEYS.indexOf(fromKey) + i) % 7];
    const d = site.hours[k];
    if (!d.closed) {
      return { nextDayLabel: NEXT_DAY_HU[k], nextHour: parseHHMM(d.opens).h };
    }
  }
  return { nextDayLabel: null, nextHour: 10 };
}

export function statusAt(site: Site, now: Date): OpenStatus {
  const { dayKey, isoDate, hour, minute } = budapestParts(now);
  const today = effectiveHoursToday(site, isoDate, dayKey);
  if (!today.closed) {
    const o = parseHHMM(today.opens);
    const c = parseHHMM(today.closes);
    const nowMin = hour * 60 + minute;
    const openMin = o.h * 60 + o.m;
    const closeMin = c.h * 60 + c.m;
    if (nowMin >= openMin && nowMin < closeMin) return { open: true };
    if (nowMin < openMin) return { open: false, nextDayLabel: "ma", nextHour: o.h };
  }
  return { open: false, ...findNextOpening(site, dayKey) };
}

export function todaysExceptionBanner(site: Site, now: Date): string | null {
  const { isoDate } = budapestParts(now);
  const ex = site.exceptions.find((e) => e.date === isoDate);
  if (!ex) return null;
  const labelPrefix = ex.label ? `${ex.label} — ` : "";
  if (ex.mode === "closed") return `${labelPrefix}ma ZÁRVA`;
  return `${labelPrefix}ma ${parseInt(ex.opens!, 10)} — ${parseInt(ex.closes!, 10)}`;
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test hours`
Expected: all hours tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/site/hours.ts lib/site/hours.test.ts
git commit -m "feat(site): add statusAt and exception banner derivations"
```

---

### Task A8: JSON-LD builders

**Files:**
- Create: `lib/brands.ts`
- Create: `lib/site/jsonld.ts`
- Create: `lib/site/jsonld.test.ts`

- [ ] **Step 1: Move brands constant**

Create `lib/brands.ts` by copy/pasting the `BRANDS_CARRIED` array from `app/layout.tsx`:
```ts
export const BRANDS_CARRIED = [
  "Ganni",
  "Baum und Pferdgarten",
  // ... full list from app/layout.tsx ...
  "H&M Edition",
] as const;
```

(Engineer: copy the full array verbatim from `app/layout.tsx` lines 9-127.)

- [ ] **Step 2: Write the failing test**

Create `lib/site/jsonld.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { DEFAULT_SITE } from "./schema";
import { buildStoreJsonLd, buildBrandsJsonLd, buildWebsiteJsonLd } from "./jsonld";
import { BRANDS_CARRIED } from "@/lib/brands";

const SITE_URL = "https://nyarilud.hu";

describe("buildStoreJsonLd", () => {
  it("emits the expected @type and key fields from DEFAULT_SITE", () => {
    const ld = buildStoreJsonLd(DEFAULT_SITE, BRANDS_CARRIED, SITE_URL, "/nyarilud-og.jpg");
    expect(ld["@type"]).toEqual(["ClothingStore", "SecondHandStore"]);
    expect(ld.name).toBe("nyári lúd");
    expect(ld.slogan).toBe(DEFAULT_SITE.meta.slogan.replace(/\n/g, " "));
    expect(ld.email).toBe("dora@nyarilud.hu");
    expect(ld.address.streetAddress).toBe("Pozsonyi út 30");
    expect(ld.openingHoursSpecification).toHaveLength(5);
    expect(ld.makesOffer.length).toBe(BRANDS_CARRIED.length);
  });
});

describe("buildBrandsJsonLd", () => {
  it("emits an ItemList of the brand constant", () => {
    const ld = buildBrandsJsonLd(BRANDS_CARRIED, SITE_URL);
    expect(ld["@type"]).toBe("ItemList");
    expect(ld.numberOfItems).toBe(BRANDS_CARRIED.length);
  });
});

describe("buildWebsiteJsonLd", () => {
  it("emits a WebSite node referencing the store id", () => {
    const ld = buildWebsiteJsonLd(SITE_URL);
    expect(ld["@type"]).toBe("WebSite");
    expect(ld.publisher["@id"]).toBe(`${SITE_URL}/#store`);
  });
});
```

- [ ] **Step 3: Run test to verify failure**

Run: `pnpm test jsonld`
Expected: FAIL "Cannot find module".

- [ ] **Step 4: Implement `lib/site/jsonld.ts`**

```ts
import type { Site } from "./schema";
import { toOpeningHoursSpecification } from "./hours";

export function buildStoreJsonLd(
  site: Site,
  brands: readonly string[],
  siteUrl: string,
  ogImage: string
) {
  return {
    "@context": "https://schema.org",
    "@type": ["ClothingStore", "SecondHandStore"],
    "@id": `${siteUrl}/#store`,
    name: "nyári lúd",
    alternateName: ["nyari lud", "Nyári Lúd", "nyári lúd boutique"],
    description: site.meta.description,
    slogan: site.meta.slogan.replace(/\n/g, " "),
    url: siteUrl,
    image: `${siteUrl}${ogImage}`,
    logo: `${siteUrl}/nyarilud-logo.svg`,
    email: site.contact.email,
    priceRange: "$$",
    paymentAccepted: ["Cash", "Credit Card", "Debit Card"],
    address: {
      "@type": "PostalAddress",
      streetAddress: site.contact.address.streetAddress,
      addressLocality: site.contact.address.addressLocality,
      addressRegion: site.contact.address.addressLocality,
      postalCode: site.contact.address.postalCode,
      addressCountry: "HU",
    },
    geo: { "@type": "GeoCoordinates", latitude: 47.5167, longitude: 19.0494 },
    hasMap: "https://maps.app.goo.gl/BJohLrrUkpDCzEyU9",
    areaServed: [
      { "@type": "City", name: "Budapest" },
      { "@type": "Country", name: "Hungary" },
    ],
    currenciesAccepted: "HUF",
    openingHoursSpecification: toOpeningHoursSpecification(site),
    knowsAbout: [
      "premium preloved fashion",
      "second-hand designer clothing",
      "vintage fashion",
      "Scandinavian fashion",
      "French fashion",
      "sustainable fashion",
      "circular fashion",
      "curated second-hand",
    ],
    makesOffer: brands.map((brand) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Product",
        category: "Preloved women's clothing",
        brand: { "@type": "Brand", name: brand },
      },
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/UsedCondition",
    })),
    sameAs: ["https://www.instagram.com/nyarilud/"],
  };
}

export function buildBrandsJsonLd(brands: readonly string[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${siteUrl}/#brands`,
    name: "Márkák a nyári lúd boutiqueban",
    description:
      "Designer márkák, amelyek rendszeresen elérhetők a nyári lúd preloved boutiqueban (Pozsonyi út 30, Budapest).",
    numberOfItems: brands.length,
    itemListElement: brands.map((brand, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: { "@type": "Brand", name: brand },
    })),
  };
}

export function buildWebsiteJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: "nyári lúd",
    inLanguage: "hu-HU",
    publisher: { "@id": `${siteUrl}/#store` },
  };
}
```

- [ ] **Step 5: Run test + typecheck**

Run: `pnpm test jsonld && pnpm typecheck`
Expected: 3 tests pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add lib/brands.ts lib/site/jsonld.ts lib/site/jsonld.test.ts
git commit -m "feat(site): extract brands list and add pure JSON-LD builders"
```

---

### Task A9: `getSite` (cached read with fallback)

**Files:**
- Create: `lib/site/getSite.ts`
- Create: `lib/site/getSite.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { readSiteFromDisk } from "./getSite";
import { DEFAULT_SITE } from "./schema";

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "getsite-"));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("readSiteFromDisk", () => {
  it("returns DEFAULT_SITE when the file does not exist", async () => {
    const site = await readSiteFromDisk(path.join(dir, "site.json"));
    expect(site).toEqual(DEFAULT_SITE);
  });

  it("returns parsed contents when valid", async () => {
    const custom = { ...DEFAULT_SITE, meta: { ...DEFAULT_SITE.meta, title: "Új cím" } };
    await fs.writeFile(path.join(dir, "site.json"), JSON.stringify(custom));
    const site = await readSiteFromDisk(path.join(dir, "site.json"));
    expect(site.meta.title).toBe("Új cím");
  });

  it("returns DEFAULT_SITE when JSON is malformed", async () => {
    await fs.writeFile(path.join(dir, "site.json"), "{ not json");
    const site = await readSiteFromDisk(path.join(dir, "site.json"));
    expect(site).toEqual(DEFAULT_SITE);
  });

  it("returns DEFAULT_SITE when schema validation fails", async () => {
    await fs.writeFile(path.join(dir, "site.json"), JSON.stringify({ meta: { title: "" } }));
    const site = await readSiteFromDisk(path.join(dir, "site.json"));
    expect(site).toEqual(DEFAULT_SITE);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test getSite`
Expected: FAIL "Cannot find module".

- [ ] **Step 3: Implement `lib/site/getSite.ts`**

```ts
import { promises as fs } from "fs";
import { unstable_cache } from "next/cache";
import { SiteSchema, DEFAULT_SITE, type Site } from "./schema";
import { SITE_JSON_PATH } from "./paths";

export async function readSiteFromDisk(filePath: string): Promise<Site> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return DEFAULT_SITE;
    console.error("[site.json] read error, falling back to defaults", err);
    return DEFAULT_SITE;
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (err) {
    console.error("[site.json] JSON parse error, falling back to defaults", err);
    return DEFAULT_SITE;
  }
  const result = SiteSchema.safeParse(parsedJson);
  if (!result.success) {
    console.error("[site.json] schema invalid, falling back to defaults", result.error.flatten());
    return DEFAULT_SITE;
  }
  return result.data;
}

export const getSite = unstable_cache(
  () => readSiteFromDisk(SITE_JSON_PATH),
  ["site"],
  { tags: ["site"] }
);
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test getSite`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/site/getSite.ts lib/site/getSite.test.ts
git commit -m "feat(site): add cached site reader with DEFAULT_SITE fallback"
```

---

### Task A10: `saveSite` (validated atomic write + revalidate)

**Files:**
- Create: `lib/site/saveSite.ts`
- Create: `lib/site/saveSite.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { writeSiteToDisk } from "./saveSite";
import { DEFAULT_SITE } from "./schema";

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "savesite-"));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("writeSiteToDisk", () => {
  it("validates with zod then writes atomically", async () => {
    const target = path.join(dir, "site.json");
    const next = { ...DEFAULT_SITE, meta: { ...DEFAULT_SITE.meta, title: "Mentve" } };
    await writeSiteToDisk(target, next);
    const raw = await fs.readFile(target, "utf8");
    expect(JSON.parse(raw).meta.title).toBe("Mentve");
  });

  it("throws on invalid input and leaves disk untouched", async () => {
    const target = path.join(dir, "site.json");
    await fs.writeFile(target, JSON.stringify(DEFAULT_SITE));
    const bad = { ...DEFAULT_SITE, meta: { title: "", description: "", slogan: "" } };
    await expect(writeSiteToDisk(target, bad as never)).rejects.toThrow();
    const after = JSON.parse(await fs.readFile(target, "utf8"));
    expect(after.meta.title).toBe(DEFAULT_SITE.meta.title);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test saveSite`
Expected: FAIL "Cannot find module".

- [ ] **Step 3: Implement `lib/site/saveSite.ts`**

```ts
import { revalidatePath, revalidateTag } from "next/cache";
import { SiteSchema, type Site } from "./schema";
import { atomicWriteJson } from "./atomic";
import { SITE_JSON_PATH } from "./paths";

export async function writeSiteToDisk(filePath: string, next: Site): Promise<void> {
  const validated = SiteSchema.parse(next);
  await atomicWriteJson(filePath, validated);
}

export async function saveSite(next: Site): Promise<void> {
  await writeSiteToDisk(SITE_JSON_PATH, next);
  revalidateTag("site");
  revalidatePath("/", "layout");
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `pnpm test saveSite && pnpm typecheck`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/site/saveSite.ts lib/site/saveSite.test.ts
git commit -m "feat(site): add validated saveSite with revalidateTag + revalidatePath"
```

---

### Task A11: Migrate `app/layout.tsx` to read getSite

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace the file**

Replace `app/layout.tsx` with:
```tsx
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { seasons, drugs } from "./fonts";
import "./globals.css";
import { getSite } from "@/lib/site/getSite";
import { buildStoreJsonLd, buildBrandsJsonLd, buildWebsiteJsonLd } from "@/lib/site/jsonld";
import { BRANDS_CARRIED } from "@/lib/brands";

const SITE_URL = "https://nyarilud.hu";
const OG_IMAGE = "/nyarilud-og.jpg";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: site.meta.title, template: "%s · nyári lúd" },
    description: site.meta.description,
    applicationName: "nyári lúd",
    keywords: [
      "nyári lúd",
      "preloved Budapest",
      "vintage Budapest",
      "second hand Budapest",
      "Pozsonyi út",
      "Újlipótváros boutique",
      "vintage divat",
      "premium preloved",
    ],
    authors: [{ name: "nyári lúd" }],
    creator: "nyári lúd",
    publisher: "nyári lúd",
    formatDetection: { telephone: true, address: true, email: true },
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "hu_HU",
      url: `${SITE_URL}/`,
      siteName: "nyári lúd",
      title: site.meta.title,
      description: site.meta.description,
      images: [{
        url: OG_IMAGE, width: 1200, height: 630,
        alt: "nyári lúd — premium preloved boutique · Pozsonyi út 30, Budapest",
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: site.meta.title,
      description: site.meta.description,
      images: [OG_IMAGE],
    },
    robots: {
      index: true, follow: true,
      googleBot: {
        index: true, follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    icons: {
      icon: [{ url: "/favicon.png", type: "image/png", sizes: "512x512" }],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
      shortcut: [{ url: "/favicon.png" }],
    },
    manifest: "/manifest.webmanifest",
    category: "shopping",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F4ECDC",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getSite();
  const storeJsonLd = buildStoreJsonLd(site, BRANDS_CARRIED, SITE_URL, OG_IMAGE);
  const brandsJsonLd = buildBrandsJsonLd(BRANDS_CARRIED, SITE_URL);
  const websiteJsonLd = buildWebsiteJsonLd(SITE_URL);

  return (
    <html lang="hu" className={`${seasons.variable} ${drugs.variable}`}>
      <head>
        <meta name="geo.region" content="HU-BU" />
        <meta name="geo.placename" content="Budapest, Újlipótváros" />
        <meta name="geo.position" content="47.5167;19.0494" />
        <meta name="ICBM" content="47.5167, 19.0494" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(brandsJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WJ27QR9F');`}
        </Script>
        <Script id="gtag-src" src="https://www.googletagmanager.com/gtag/js?id=G-CR5EJ9HH4Y" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-CR5EJ9HH4Y');`}
        </Script>
      </head>
      <body>
        <noscript>
          <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WJ27QR9F" height="0" width="0" style={{ display: "none", visibility: "hidden" }} />
        </noscript>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Run typecheck + dev sanity**

```bash
pnpm typecheck
pnpm dev
```

Open `http://localhost:3000` — verify page renders identically (view source: title, meta description, and all three JSON-LD blocks are present and equivalent to current production).

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "refactor(layout): read metadata + JSON-LD from getSite()"
```

---

### Task A12: Pass site to page + components

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/Hero.tsx`
- Modify: `components/FindUs.tsx`
- Modify: `lib/useOpenStatus.ts`

- [ ] **Step 1: Modify `app/page.tsx`**

```tsx
import { Backdrop } from "@/components/Backdrop";
import { Hero } from "@/components/Hero";
import { Gallery } from "@/components/Gallery";
import { FindUs } from "@/components/FindUs";
import { Footer } from "@/components/Footer";
import { getSite } from "@/lib/site/getSite";

export default async function HomePage() {
  const site = await getSite();
  return (
    <main>
      <Backdrop />
      <Hero slogan={site.meta.slogan} />
      <Gallery photos={site.gallery} />
      <FindUs site={site} />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 2: Modify `components/Hero.tsx` to accept slogan prop**

```tsx
import { Stripes } from "./Stripes";
import { Ribbons } from "./Ribbons";
import { Goose } from "./Goose";
import { Wordmark } from "./Wordmark";
import { ScrollCue } from "./ScrollCue";
import styles from "./Hero.module.css";

export function Hero({ slogan }: { slogan: string }) {
  const lines = slogan.split("\n");
  return (
    <section className={styles.hero} data-hero>
      <Stripes />
      <Ribbons />
      <div className={styles.stage}>
        <Goose />
        <Wordmark />
        <p className={styles.poem}>
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
      </div>
      <ScrollCue />
    </section>
  );
}
```

- [ ] **Step 3: Modify `lib/useOpenStatus.ts` to take site as input**

Replace the whole file:
```ts
"use client";

import { useEffect, useState } from "react";
import type { Site } from "@/lib/site/schema";
import { statusAt, type OpenStatus } from "@/lib/site/hours";

export type { OpenStatus };

export function useOpenStatus(site: Site): OpenStatus | null {
  const [status, setStatus] = useState<OpenStatus | null>(null);

  useEffect(() => {
    setStatus(statusAt(site, new Date()));
    const id = setInterval(() => setStatus(statusAt(site, new Date())), 60_000);
    return () => clearInterval(id);
  }, [site]);

  return status;
}
```

- [ ] **Step 4: Modify `components/FindUs.tsx`**

Replace the existing `FindUs` component with one that takes a `site` prop and derives the schedule + banner from it. (Full replacement; verbose but necessary.)

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { HandDrawnMap } from "./HandDrawnMap";
import { useOpenStatus } from "@/lib/useOpenStatus";
import { toHumanGroups, todaysExceptionBanner } from "@/lib/site/hours";
import type { Site } from "@/lib/site/schema";
import styles from "./FindUs.module.css";

const MAPS_URL = "https://maps.app.goo.gl/BJohLrrUkpDCzEyU9";
const VERBS = ["nézelődj", "bóklássz", "időzz", "próbálj"];

function CyclingVerb() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  useEffect(() => {
    if (reduced || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % VERBS.length), 2500);
    return () => clearInterval(id);
  }, [reduced, paused]);
  return (
    <em className={styles.cyclingVerb}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-live="polite" aria-atomic="true">
      <span key={index} className={styles.cyclingWord}>{VERBS[index]}</span>
    </em>
  );
}

function EmailLink({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { return () => { if (timer.current) clearTimeout(timer.current); }; }, []);
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!navigator.clipboard?.writeText) return;
    e.preventDefault();
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    }).catch(() => { window.location.href = `mailto:${email}`; });
  };
  return (
    <span className={styles.emailWrap}>
      <a href={`mailto:${email}`} onClick={handleClick}>{email}</a>
      {copied && <span className={styles.copiedBadge}>másolva</span>}
    </span>
  );
}

function OpenStatusPill({ site }: { site: Site }) {
  const status = useOpenStatus(site);
  if (!status) return null;
  if (status.open) {
    return (
      <span className={styles.statusPill} data-open="true">
        <span className={styles.statusDot} aria-hidden />Most nyitva
      </span>
    );
  }
  const label = status.nextDayLabel
    ? `Most ZÁRVA · nyitás ${status.nextDayLabel} ${status.nextHour}-kor`
    : `Most ZÁRVA · nyitás ${status.nextHour}-kor`;
  return (
    <span className={styles.statusPill} data-open="false">
      <span className={styles.statusDot} aria-hidden />{label}
    </span>
  );
}

export function FindUs({ site }: { site: Site }) {
  const groups = toHumanGroups(site);
  const [banner, setBanner] = useState<string | null>(null);
  useEffect(() => {
    setBanner(todaysExceptionBanner(site, new Date()));
    const id = setInterval(() => setBanner(todaysExceptionBanner(site, new Date())), 60_000);
    return () => clearInterval(id);
  }, [site]);
  const addr = site.contact.address;

  return (
    <section id="find-us" className={styles.section} aria-label="Merre vagyunk">
      <div className={styles.grid}>
        <a href={MAPS_URL} target="_blank" rel="noopener noreferrer"
           aria-label="Megnyitás Google Térképen" className={styles.mapFrame}>
          <HandDrawnMap />
        </a>
        <div className={styles.card}>
          <div className={styles.eyebrow}>merre vagyunk</div>
          <h2 className={styles.title}>
            gyere be, <CyclingVerb />,<br />találd meg a kedvenced.
          </h2>
          <p className={styles.address}>
            <strong>{addr.streetAddress}</strong><br />
            {addr.addressLocality}, {addr.postalCode}<br />
            {addr.neighborhood}
          </p>
          <div className={styles.hoursBlock}>
            <div className={styles.hoursHead}>
              <span className={styles.hoursLabel}>nyitvatartás</span>
              <OpenStatusPill site={site} />
            </div>
            {banner && (
              <div className={styles.banner} role="note">{banner}</div>
            )}
            <div className={styles.schedule}>
              {groups.map((g) => (
                <div key={g.label}
                     className={`${styles.scheduleRow}${g.muted ? ` ${styles.scheduleRowMuted}` : ""}`}>
                  <span className={styles.day}>{g.label}</span>
                  <span className={styles.leader} aria-hidden />
                  <span className={styles.time}>{g.time}</span>
                </div>
              ))}
            </div>
          </div>
          <dl className={styles.meta}>
            <dt>írj</dt>
            <dd><EmailLink email={site.contact.email} /></dd>
          </dl>
          <div className={styles.links}>
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className={styles.linkPrimary}>
              mutasd a térképen <span className={styles.arrow}>→</span>
            </a>
            <a href="https://www.instagram.com/nyarilud/" target="_blank" rel="noopener noreferrer" className={styles.link}>
              instagram <span className={styles.arrow}>↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Add banner style to `components/FindUs.module.css`**

Append:
```css
.banner {
  margin: 0.5rem 0 0.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px dashed currentColor;
  border-radius: 6px;
  font-size: 0.9rem;
  opacity: 0.85;
}
```

- [ ] **Step 6: Verify locally**

```bash
pnpm typecheck
pnpm dev
```

Open `/`, confirm: schedule rows render dynamically, "Most nyitva"/"Most ZÁRVA" pill behavior unchanged, address/email come through.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx components/Hero.tsx components/FindUs.tsx components/FindUs.module.css lib/useOpenStatus.ts
git commit -m "refactor(site): drive Hero slogan, FindUs schedule, and useOpenStatus from site schema"
```

---

### Task A13: Photo serving route + dev/prod path bridge

**Files:**
- Create: `app/photos/[name]/route.ts`

- [ ] **Step 1: Implement route handler**

```ts
import { promises as fs } from "fs";
import path from "path";
import { PHOTOS_DIR } from "@/lib/site/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_NAME = /^[a-zA-Z0-9_-]+\.webp$/;

export async function GET(_: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!SAFE_NAME.test(name)) return new Response(null, { status: 400 });
  try {
    const fh = await fs.open(path.join(PHOTOS_DIR, name), "r");
    const stream = fh.readableWebStream() as unknown as ReadableStream;
    return new Response(stream, {
      headers: {
        "content-type": "image/webp",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
```

- [ ] **Step 2: Verify**

```bash
pnpm typecheck
pnpm dev
```

Hit `http://localhost:3000/photos/nonexistent.webp` → expect 404. Hit `http://localhost:3000/photos/../site.json` → expect 400 (regex blocks it).

- [ ] **Step 3: Commit**

```bash
git add app/photos/[name]/route.ts
git commit -m "feat(photos): serve /data/photos/*.webp via route handler with immutable cache"
```

---

### Task A14: Gallery component — dynamic src with seed fallback

**Files:**
- Modify: `components/Gallery.tsx`

- [ ] **Step 1: Replace `components/Gallery.tsx`**

```tsx
"use client";

import { useState, type KeyboardEvent } from "react";
import Image from "next/image";
import styles from "./Gallery.module.css";

import seed1 from "../photos/nyari_lud_final_38.JPG_1.38.1.jpg";
import seed2 from "../photos/nyari_lud_final_48.JPG_1.48.1.jpg";
import seed3 from "../photos/nyari_lud_final_66.JPG_1.66.1.jpg";
import seed4 from "../photos/nyari_lud_final_7.JPG_1.7.1.jpg";
import seed5 from "../photos/nyari_lud_final_5.JPG_1.5.1.jpg";

import type { SitePhoto } from "@/lib/site/schema";

const SEED_SOURCES: Record<string, { src: typeof seed1 }> = {
  "seed-1": { src: seed1 },
  "seed-2": { src: seed2 },
  "seed-3": { src: seed3 },
  "seed-4": { src: seed4 },
  "seed-5": { src: seed5 },
};

function PinElement({ kind, tapeRot }: { kind: SitePhoto["pin"]; tapeRot?: string }) {
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

export function Gallery({ photos }: { photos: SitePhoto[] }) {
  const [shutters, setShutters] = useState<Record<number, number>>({});

  const fire = (slot: number) =>
    setShutters((prev) => ({ ...prev, [slot]: (prev[slot] ?? 0) + 1 }));

  const onKey = (e: KeyboardEvent<HTMLElement>, slot: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fire(slot);
    }
  };

  const ordered = [...photos].sort((a, b) => a.slot - b.slot);

  return (
    <section id="gallery" className={styles.section} aria-label="Galéria">
      <div className={styles.wall}>
        {ordered.map((p) => {
          const slotClass = styles[`w${p.slot}` as `w${1|2|3|4|5}`];
          const shutter = shutters[p.slot] ?? 0;
          const variant = shutter === 0 ? undefined : shutter % 2 === 0 ? "a" : "b";
          const seed = SEED_SOURCES[p.id];
          return (
            <figure key={p.slot}
                    className={`${styles.figure} ${slotClass} ${p.blueTape ? styles.blueTape : ""}`}
                    data-shutter={variant}
                    role="button" tabIndex={0} aria-label={p.alt}
                    onClick={() => fire(p.slot)}
                    onKeyDown={(e) => onKey(e, p.slot)}>
              <PinElement kind={p.pin} tapeRot={p.tapeRot} />
              <div className={styles.ph} data-shutter={variant}>
                {seed ? (
                  <Image src={seed.src} alt={p.alt} fill
                         sizes="(max-width: 620px) 88vw, (max-width: 980px) 48vw, (max-width: 1480px) 46vw, 720px"
                         placeholder="blur" />
                ) : (
                  <Image src={`/photos/${p.id}.webp`} alt={p.alt}
                         width={p.width} height={p.height}
                         sizes="(max-width: 620px) 88vw, (max-width: 980px) 48vw, (max-width: 1480px) 46vw, 720px"
                         placeholder="blur" blurDataURL={p.blurDataURL}
                         style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
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
```

- [ ] **Step 2: Verify**

```bash
pnpm typecheck
pnpm dev
```

Open `/` → gallery should look identical (seed images via static import, since no `/data/photos/` exists yet).

- [ ] **Step 3: Commit**

```bash
git add components/Gallery.tsx
git commit -m "refactor(gallery): take photos prop with seed-fallback for static images"
```

---

### Task A15: Phase A smoke + cleanup

- [ ] **Step 1: Full project verification**

Run:
```bash
pnpm typecheck
pnpm test
pnpm build
```

Expected: typecheck passes, all vitest tests green, `next build` completes (look for "successfully" output).

- [ ] **Step 2: Manual smoke**

Run `pnpm dev` and verify on `/`:
- Title in tab matches `DEFAULT_SITE.meta.title`.
- View source: 3 `application/ld+json` blocks present and well-formed.
- Hero slogan reads the 3-line version.
- FindUs schedule shows `Kedd–Csüt, Szo: 10 — 15`, `Péntek: 10 — 18`, `Vasárnap, Hétfő: ZÁRVA`.
- Status pill cycles "Most nyitva" / "Most ZÁRVA · nyitás …" based on current Budapest time.
- Gallery: 5 polaroids load using the seed images.

- [ ] **Step 3: No-op commit if needed**

If anything had to be adjusted, commit with: `git commit -m "fix(site): phase A smoke fixes"`.

Phase A complete. The site now reads everything from `getSite()` while looking identical to today.

---

# Phase B — Authentication

Build the env-credentialed cookie-session auth in isolation. After Phase B, `/admin/login` works and `/admin` is reachable when authenticated — but renders only a stub.

---

### Task B1: `safeEq` timing-safe comparison

**Files:**
- Create: `lib/auth/safeEq.ts`
- Create: `lib/auth/safeEq.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { safeEq } from "./safeEq";

describe("safeEq", () => {
  it("returns true for identical strings", async () => {
    expect(await safeEq("dora", "dora")).toBe(true);
  });

  it("returns false for different strings of equal length", async () => {
    expect(await safeEq("dora", "doraX".slice(0, 4))).toBe(true); // same content
    expect(await safeEq("dora", "DORA")).toBe(false);
  });

  it("returns false for different lengths without throwing", async () => {
    expect(await safeEq("dora", "dorabella")).toBe(false);
  });

  it("returns false for empty vs non-empty", async () => {
    expect(await safeEq("", "x")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test safeEq`
Expected: FAIL "Cannot find module".

- [ ] **Step 3: Implement `lib/auth/safeEq.ts`**

```ts
const enc = new TextEncoder();

export async function safeEq(a: string, b: string): Promise<boolean> {
  const ha = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(a)));
  const hb = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(b)));
  let diff = 0;
  for (let i = 0; i < 32; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test safeEq`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/safeEq.ts lib/auth/safeEq.test.ts
git commit -m "feat(auth): add SHA-256 digest-then-bytewise constant-time compare"
```

---

### Task B2: Rate limiter

**Files:**
- Create: `lib/auth/rateLimit.ts`
- Create: `lib/auth/rateLimit.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createLimiter } from "./rateLimit";

let now = 1_000_000;
beforeEach(() => { now = 1_000_000; });

describe("createLimiter", () => {
  it("allows up to N attempts in the window then blocks", () => {
    const limiter = createLimiter({ limit: 3, windowMs: 60_000, now: () => now });
    expect(limiter.check("1.2.3.4")).toBe(true);
    expect(limiter.check("1.2.3.4")).toBe(true);
    expect(limiter.check("1.2.3.4")).toBe(true);
    expect(limiter.check("1.2.3.4")).toBe(false);
  });

  it("isolates by key", () => {
    const limiter = createLimiter({ limit: 1, windowMs: 60_000, now: () => now });
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("b")).toBe(true);
    expect(limiter.check("a")).toBe(false);
  });

  it("resets after the window expires", () => {
    const limiter = createLimiter({ limit: 1, windowMs: 1_000, now: () => now });
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(false);
    now += 1_001;
    expect(limiter.check("a")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test rateLimit`
Expected: FAIL "Cannot find module".

- [ ] **Step 3: Implement `lib/auth/rateLimit.ts`**

```ts
type Entry = { count: number; resetAt: number };

export type Limiter = { check(key: string): boolean };

export function createLimiter(opts: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): Limiter {
  const store = new Map<string, Entry>();
  const now = opts.now ?? Date.now;
  return {
    check(key) {
      const t = now();
      const e = store.get(key);
      if (!e || t > e.resetAt) {
        store.set(key, { count: 1, resetAt: t + opts.windowMs });
        return true;
      }
      if (e.count >= opts.limit) return false;
      e.count += 1;
      return true;
    },
  };
}

export const loginLimiter = createLimiter({ limit: 5, windowMs: 60_000 });
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test rateLimit`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/rateLimit.ts lib/auth/rateLimit.test.ts
git commit -m "feat(auth): add in-memory per-key rate limiter"
```

---

### Task B3: Session (Web Crypto HMAC)

**Files:**
- Create: `lib/auth/session.ts`
- Create: `lib/auth/session.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { signToken, verifyToken } from "./session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-please-rotate-in-prod-0123456789";
});

describe("signToken / verifyToken", () => {
  it("round-trips a valid token", async () => {
    const token = await signToken("dora", Date.now() + 60_000);
    const result = await verifyToken(token);
    expect(result).not.toBeNull();
    expect(result!.sub).toBe("dora");
  });

  it("rejects a tampered token", async () => {
    const token = await signToken("dora", Date.now() + 60_000);
    const tampered = token.slice(0, -2) + "AA";
    expect(await verifyToken(tampered)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signToken("dora", Date.now() - 1_000);
    expect(await verifyToken(token)).toBeNull();
  });

  it("rejects a malformed token", async () => {
    expect(await verifyToken("notatoken")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test session`
Expected: FAIL "Cannot find module".

- [ ] **Step 3: Implement `lib/auth/session.ts`**

```ts
import { cookies } from "next/headers";

const enc = new TextEncoder();
const COOKIE_NAME = "sid";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

let keyPromise: Promise<CryptoKey> | null = null;
function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 16) {
      throw new Error("SESSION_SECRET missing or shorter than 16 chars");
    }
    keyPromise = crypto.subtle.importKey(
      "raw", enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
    );
  }
  return keyPromise;
}

function toB64Url(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString("base64url");
}
function fromB64Url(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, "base64url"));
}

export async function signToken(sub: string, expiresAtMs: number): Promise<string> {
  const payload = `${sub}.${expiresAtMs}`;
  const sig = await crypto.subtle.sign("HMAC", await getKey(), enc.encode(payload));
  return `${payload}.${toB64Url(sig)}`;
}

export async function verifyToken(token: string): Promise<{ sub: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [sub, expStr, sigB64] = parts;
  if (!sub || !expStr || !sigB64) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return null;
  const ok = await crypto.subtle.verify(
    "HMAC",
    await getKey(),
    fromB64Url(sigB64),
    enc.encode(`${sub}.${expStr}`)
  );
  if (!ok) return null;
  if (Date.now() > exp) return null;
  return { sub };
}

export async function setSession(sub: string): Promise<void> {
  const token = await signToken(sub, Date.now() + TTL_MS);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function readSession(): Promise<{ sub: string } | null> {
  const jar = await cookies();
  const value = jar.get(COOKIE_NAME)?.value;
  if (!value) return null;
  return verifyToken(value);
}

export const SESSION_COOKIE = COOKIE_NAME;
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test session`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/session.ts lib/auth/session.test.ts
git commit -m "feat(auth): add Web Crypto HMAC signed-cookie session"
```

---

### Task B4: Env check + requireAdmin

**Files:**
- Create: `lib/auth/env.ts`
- Create: `lib/auth/requireAdmin.ts`

- [ ] **Step 1: Implement `lib/auth/env.ts`**

```ts
const REQUIRED = ["ADMIN_USER", "ADMIN_PASSWORD", "SESSION_SECRET"] as const;

export class AdminConfigError extends Error {
  constructor(public missing: readonly string[]) {
    super(`admin disabled: missing env vars: ${missing.join(", ")}`);
  }
}

export function readAdminEnv(): { user: string; password: string } {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) throw new AdminConfigError(missing);
  return {
    user: process.env.ADMIN_USER!,
    password: process.env.ADMIN_PASSWORD!,
  };
}

export function isAdminConfigured(): boolean {
  return REQUIRED.every((k) => Boolean(process.env[k]));
}
```

- [ ] **Step 2: Implement `lib/auth/requireAdmin.ts`**

```ts
import { redirect } from "next/navigation";
import { readSession } from "./session";
import { isAdminConfigured } from "./env";

export async function requireAdmin(): Promise<{ sub: string }> {
  if (!isAdminConfigured()) {
    throw new Error("admin not configured (set ADMIN_USER, ADMIN_PASSWORD, SESSION_SECRET)");
  }
  const session = await readSession();
  if (!session) redirect("/admin/login");
  return session;
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `pnpm typecheck`

```bash
git add lib/auth/env.ts lib/auth/requireAdmin.ts
git commit -m "feat(auth): add admin env validator and requireAdmin redirect helper"
```

---

### Task B5: Middleware (cookie-presence redirect)

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Implement `middleware.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return;
  if (!req.cookies.get("sid")) {
    const url = new URL("/admin/login", req.url);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

- [ ] **Step 2: Verify**

```bash
pnpm typecheck
pnpm dev
```

Visit `http://localhost:3000/admin` (without cookie) → expect redirect to `/admin/login`. `/admin/login` will 404 until next task.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): redirect unauthenticated /admin/* to /admin/login"
```

---

### Task B6: Login page + actions

**Files:**
- Create: `app/admin/login/actions.ts`
- Create: `app/admin/login/page.tsx`
- Create: `app/admin/login/login.module.css`

- [ ] **Step 1: Create `app/admin/login/actions.ts`**

```ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { readAdminEnv, AdminConfigError } from "@/lib/auth/env";
import { safeEq } from "@/lib/auth/safeEq";
import { loginLimiter } from "@/lib/auth/rateLimit";
import { setSession, clearSession } from "@/lib/auth/session";

export type LoginState = { error?: string };

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    h.get("x-real-ip") ??
    "anon";

  if (!loginLimiter.check(ip)) {
    await sleep(1_000);
    return { error: "Túl sok próbálkozás. Próbáld újra egy perc múlva." };
  }

  const user = String(formData.get("user") ?? "");
  const password = String(formData.get("password") ?? "");

  let env;
  try {
    env = readAdminEnv();
  } catch (err) {
    if (err instanceof AdminConfigError) {
      return { error: "Admin nincs konfigurálva. Lépj kapcsolatba a fejlesztővel." };
    }
    throw err;
  }

  const [userOk, passOk] = await Promise.all([
    safeEq(user, env.user),
    safeEq(password, env.password),
  ]);

  if (!userOk || !passOk) {
    await sleep(1_000);
    return { error: "Hibás belépés." };
  }

  await setSession(env.user);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/admin/login");
}
```

- [ ] **Step 2: Create `app/admin/login/page.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import styles from "./login.module.css";

const initial: LoginState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <main className={styles.wrap}>
      <form action={action} className={styles.card}>
        <h1 className={styles.title}>nyári lúd · admin</h1>
        <label className={styles.label}>
          Felhasználó
          <input name="user" autoComplete="username" required className={styles.input} />
        </label>
        <label className={styles.label}>
          Jelszó
          <input name="password" type="password" autoComplete="current-password" required className={styles.input} />
        </label>
        {state.error && <p className={styles.error} role="alert">{state.error}</p>}
        <button type="submit" disabled={pending} className={styles.button}>
          {pending ? "Belépés..." : "Belépés"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Create `app/admin/login/login.module.css`**

```css
.wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #F4ECDC;
  padding: 1.5rem;
  font-family: var(--font-seasons), system-ui, sans-serif;
}

.card {
  width: 100%;
  max-width: 360px;
  background: #fff;
  border-radius: 14px;
  padding: 1.75rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  display: grid;
  gap: 1rem;
}

.title {
  margin: 0 0 0.5rem;
  font-size: 1.4rem;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: #444;
}

.input {
  font: inherit;
  padding: 0.6rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fafafa;
  color: #111;
}

.input:focus {
  outline: 2px solid #c44a73;
  outline-offset: 1px;
  border-color: transparent;
  background: #fff;
}

.error {
  margin: 0;
  font-size: 0.85rem;
  color: #b3263a;
  background: #fceaee;
  padding: 0.5rem 0.65rem;
  border-radius: 6px;
}

.button {
  font: inherit;
  font-weight: 500;
  padding: 0.7rem;
  border: 0;
  border-radius: 8px;
  background: #c44a73;
  color: #fff;
  cursor: pointer;
  transition: opacity 0.15s;
}

.button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
```

- [ ] **Step 4: Verify**

Start a dev server with all env vars set:
```bash
ADMIN_USER=test ADMIN_PASSWORD=test SESSION_SECRET=test-secret-please-rotate-in-prod-0123456789 pnpm dev
```

Visit `/admin/login`. Submit wrong creds → "Hibás belépés." Submit correct creds → redirects to `/admin` (will 404 until next task).

Check DevTools → Application → Cookies → `sid` is set, httpOnly, sameSite=lax.

- [ ] **Step 5: Commit**

```bash
git add app/admin/login
git commit -m "feat(admin): add login form with rate limit and timing-safe credential check"
```

---

### Task B7: Admin layout + shell stub

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/AdminShell.tsx`
- Create: `app/admin/admin.module.css`
- Create: `app/admin/page.tsx` (stub for now)

- [ ] **Step 1: Create `app/admin/layout.tsx`**

```tsx
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { AdminShell } from "./AdminShell";

export const metadata = { title: "admin" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return <AdminShell user={session.sub}>{children}</AdminShell>;
}
```

- [ ] **Step 2: Create `app/admin/AdminShell.tsx`**

```tsx
import Link from "next/link";
import { logoutAction } from "./login/actions";
import styles from "./admin.module.css";

export function AdminShell({ user, children }: { user: string; children: React.ReactNode }) {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>nyári lúd · admin</div>
        <div className={styles.headerActions}>
          <Link href="/" target="_blank" rel="noopener noreferrer" className={styles.viewLive}>
            View live ↗
          </Link>
          <span className={styles.user}>{user}</span>
          <form action={logoutAction}>
            <button type="submit" className={styles.logout}>Kijelentkezés</button>
          </form>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/admin/admin.module.css`**

```css
.app {
  min-height: 100vh;
  background: #F4ECDC;
  font-family: var(--font-seasons), system-ui, sans-serif;
  color: #1a1a1a;
}

.header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1.25rem;
  background: #fff;
  border-bottom: 1px solid #e7dcc4;
}

.brand {
  font-weight: 500;
  letter-spacing: -0.01em;
}

.headerActions {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.85rem;
}

.viewLive {
  color: #1a1a1a;
  text-decoration: none;
}

.viewLive:hover {
  text-decoration: underline;
}

.user {
  color: #888;
}

.logout {
  font: inherit;
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
}

.logout:hover {
  background: #fafafa;
}

.main {
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 6rem;
  display: grid;
  gap: 1.5rem;
}

.section {
  background: #fff;
  border-radius: 14px;
  padding: 1.25rem 1.25rem 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}

.sectionHead {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.85rem;
  gap: 0.5rem;
}

.sectionTitle {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 500;
}

.sectionSavedAt {
  font-size: 0.78rem;
  color: #888;
}

.field {
  display: grid;
  gap: 0.3rem;
  margin-bottom: 0.85rem;
  font-size: 0.85rem;
  color: #444;
}

.input,
.textarea {
  font: inherit;
  padding: 0.55rem 0.7rem;
  border: 1px solid #ddd;
  border-radius: 7px;
  background: #fafafa;
  color: #111;
}

.textarea {
  min-height: 72px;
  resize: vertical;
}

.input:focus,
.textarea:focus {
  outline: 2px solid #c44a73;
  outline-offset: 1px;
  background: #fff;
}

.saveRow {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.85rem;
}

.saveBtn {
  font: inherit;
  border: 1px solid #c44a73;
  background: transparent;
  color: #c44a73;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
}

.saveBtn[data-dirty="true"] {
  background: #c44a73;
  color: #fff;
}

.saveBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  margin: 0.5rem 0 0;
  color: #b3263a;
  font-size: 0.85rem;
}

.stickyFooter {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.75rem 1.25rem;
  background: #1a1a1a;
  color: #F4ECDC;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  z-index: 20;
}

.stickyFooter button {
  font: inherit;
  background: #c44a73;
  color: #fff;
  border: 0;
  border-radius: 6px;
  padding: 0.45rem 0.85rem;
  cursor: pointer;
}
```

- [ ] **Step 4: Create `app/admin/page.tsx` stub**

```tsx
import { getSite } from "@/lib/site/getSite";

export default async function AdminPage() {
  const site = await getSite();
  return (
    <p>Admin pull-through OK. Title: <strong>{site.meta.title}</strong></p>
  );
}
```

- [ ] **Step 5: Verify**

Start with env vars set, log in via `/admin/login`, land on `/admin` → expect to see the shell header (logo + View live + user + logout) and the stub text showing the current title. Click "Kijelentkezés" → expect to be redirected to login.

- [ ] **Step 6: Commit**

```bash
git add app/admin/layout.tsx app/admin/AdminShell.tsx app/admin/admin.module.css app/admin/page.tsx
git commit -m "feat(admin): scaffold admin layout, shell, and stub page behind requireAdmin"
```

---

### Task B8: Phase B smoke

- [ ] **Step 1: Full test + build**

```bash
pnpm typecheck
pnpm test
pnpm build
```

Expected: passes.

- [ ] **Step 2: Manual smoke**

With env vars set:
1. `/admin` → redirected to `/admin/login`.
2. Wrong creds 5 times → 6th attempt is blocked with "Túl sok próbálkozás." Wait 60s and verify it resets.
3. Correct creds → `/admin` shows the stub.
4. Tamper with `sid` cookie (change last 2 chars in DevTools) → reload `/admin` → either redirect to login (cookie present, verify fails → next request to `/admin/layout` calls requireAdmin which has no valid session → redirects). Note: middleware only checks presence, so the layout-level `requireAdmin` is the actual gate; verify it works.
5. Logout → cookie cleared → back to login.

Phase B complete.

---

# Phase C — Admin sections (text content)

This phase wires up the 3 text-editing sections (Oldal alapok, Nyitvatartás, Ünnepek) with per-section save buttons, dirty tracking, and toast feedback.

---

### Task C1: Admin server actions for text saves

**Files:**
- Create: `app/admin/actions.ts`

- [ ] **Step 1: Create `app/admin/actions.ts`**

```ts
"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getSite } from "@/lib/site/getSite";
import { saveSite } from "@/lib/site/saveSite";
import { SiteSchema, type Site } from "@/lib/site/schema";

export type SaveResult = { ok: true } | { ok: false; error: string };

async function saveMutation(mutate: (current: Site) => Site): Promise<SaveResult> {
  await requireAdmin();
  const current = await getSite();
  const next = mutate(current);
  const parsed = SiteSchema.safeParse(next);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  await saveSite(parsed.data);
  return { ok: true };
}

export async function saveMetaAction(input: {
  title: string;
  description: string;
  slogan: string;
  email: string;
  streetAddress: string;
  addressLocality: string;
  postalCode: string;
  neighborhood: string;
}): Promise<SaveResult> {
  return saveMutation((current) => ({
    ...current,
    meta: {
      title: input.title,
      description: input.description,
      slogan: input.slogan,
    },
    contact: {
      email: input.email,
      address: {
        streetAddress: input.streetAddress,
        addressLocality: input.addressLocality,
        postalCode: input.postalCode,
        neighborhood: input.neighborhood,
      },
    },
  }));
}

export async function saveHoursAction(input: Site["hours"]): Promise<SaveResult> {
  return saveMutation((current) => ({ ...current, hours: input }));
}

export async function saveExceptionsAction(input: Site["exceptions"]): Promise<SaveResult> {
  return saveMutation((current) => ({ ...current, exceptions: input }));
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add app/admin/actions.ts
git commit -m "feat(admin): add server actions for meta, hours, and exceptions saves"
```

---

### Task C2: `useDirtyForm` hook

**Files:**
- Create: `app/admin/hooks/useDirtyForm.ts`

- [ ] **Step 1: Create `app/admin/hooks/useDirtyForm.ts`**

```ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export function useDirtyForm<T>(initial: T): {
  value: T;
  setValue: (v: T | ((prev: T) => T)) => void;
  dirty: boolean;
  reset: (next: T) => void;
} {
  const [value, setValue] = useState<T>(initial);
  const baselineRef = useRef<string>(JSON.stringify(initial));
  const currentJson = useMemo(() => JSON.stringify(value), [value]);
  const dirty = currentJson !== baselineRef.current;

  useEffect(() => {
    baselineRef.current = JSON.stringify(initial);
    setValue(initial);
  }, [JSON.stringify(initial)]);

  return {
    value,
    setValue,
    dirty,
    reset: (next: T) => {
      baselineRef.current = JSON.stringify(next);
      setValue(next);
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/hooks/useDirtyForm.ts
git commit -m "feat(admin): add useDirtyForm hook for per-section dirty tracking"
```

---

### Task C3: `useBeforeUnload` hook

**Files:**
- Create: `app/admin/hooks/useBeforeUnload.ts`

- [ ] **Step 1: Create `app/admin/hooks/useBeforeUnload.ts`**

```ts
"use client";

import { useEffect } from "react";

export function useBeforeUnload(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled]);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/hooks/useBeforeUnload.ts
git commit -m "feat(admin): add useBeforeUnload nav guard hook"
```

---

### Task C4: Toast component

**Files:**
- Create: `app/admin/Toast.tsx`
- Create: `app/admin/Toast.module.css`

- [ ] **Step 1: Create `app/admin/Toast.tsx`**

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import styles from "./Toast.module.css";

type Toast = { id: number; text: string; href?: string };
type Ctx = { push: (t: Omit<Toast, "id">) => void };

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className={styles.region} aria-live="polite" aria-atomic="true">
        {items.map((t) => (
          <div key={t.id} className={styles.toast}>
            <span>{t.text}</span>
            {t.href && (
              <a href={t.href} target="_blank" rel="noopener noreferrer" className={styles.link}>
                Megnyitás ↗
              </a>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Ctx {
  const v = useContext(ToastContext);
  if (!v) throw new Error("useToast outside ToastProvider");
  return v;
}
```

- [ ] **Step 2: Create `app/admin/Toast.module.css`**

```css
.region {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  display: grid;
  gap: 0.5rem;
  z-index: 30;
  pointer-events: none;
}

.toast {
  background: #1a1a1a;
  color: #F4ECDC;
  padding: 0.6rem 0.9rem;
  border-radius: 8px;
  font-size: 0.85rem;
  display: flex;
  gap: 0.85rem;
  align-items: center;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
  animation: slideIn 0.2s ease-out;
}

.link {
  color: #F4ECDC;
  text-decoration: underline;
}

@keyframes slideIn {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
```

- [ ] **Step 3: Mount provider in admin layout**

Modify `app/admin/layout.tsx` — wrap children in `ToastProvider`:
```tsx
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { AdminShell } from "./AdminShell";
import { ToastProvider } from "./Toast";

export const metadata = { title: "admin" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <AdminShell user={session.sub}>
      <ToastProvider>{children}</ToastProvider>
    </AdminShell>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/Toast.tsx app/admin/Toast.module.css app/admin/layout.tsx
git commit -m "feat(admin): add toast provider with auto-dismiss + 'Megnyitás' link"
```

---

### Task C5: `MetaSection` (Oldal alapok)

**Files:**
- Create: `app/admin/sections/MetaSection.tsx`

- [ ] **Step 1: Create `app/admin/sections/MetaSection.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import type { Site } from "@/lib/site/schema";
import { saveMetaAction } from "../actions";
import { useDirtyForm } from "../hooks/useDirtyForm";
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
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/sections/MetaSection.tsx
git commit -m "feat(admin): add Oldal alapok section editing title, description, slogan, contact"
```

---

### Task C6: `HoursSection` (Nyitvatartás)

**Files:**
- Create: `app/admin/sections/HoursSection.tsx`

- [ ] **Step 1: Create `app/admin/sections/HoursSection.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { DAY_KEYS, type DayKey, type Site } from "@/lib/site/schema";
import { saveHoursAction } from "../actions";
import { useDirtyForm } from "../hooks/useDirtyForm";
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
```

- [ ] **Step 2: Append hours styles to `app/admin/admin.module.css`**

```css
.hoursRow {
  display: grid;
  grid-template-columns: 90px 1fr auto 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0;
}

.hoursDay {
  font-size: 0.9rem;
}

.hoursClosed {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: #555;
}

@media (max-width: 540px) {
  .hoursRow {
    grid-template-columns: 80px 1fr auto 1fr;
  }
  .hoursClosed {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/sections/HoursSection.tsx app/admin/admin.module.css
git commit -m "feat(admin): add Nyitvatartás section with native time inputs + closed toggle"
```

---

### Task C7: `ExceptionsSection` (Ünnepek)

**Files:**
- Create: `app/admin/sections/ExceptionsSection.tsx`

- [ ] **Step 1: Create `app/admin/sections/ExceptionsSection.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import type { Site, SiteException } from "@/lib/site/schema";
import { saveExceptionsAction } from "../actions";
import { useDirtyForm } from "../hooks/useDirtyForm";
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
    const clean = value.map((ex) =>
      ex.mode === "closed"
        ? { date: ex.date, label: ex.label || undefined, mode: "closed" as const }
        : { date: ex.date, label: ex.label || undefined, mode: "custom" as const, opens: ex.opens, closes: ex.closes }
    );
    startTransition(async () => {
      const result = await saveExceptionsAction(clean);
      if (result.ok) {
        reset(clean as SiteException[]);
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
```

- [ ] **Step 2: Append exception styles to `app/admin/admin.module.css`**

```css
.exceptionList {
  display: grid;
  gap: 0.75rem;
}

.exceptionCard {
  display: grid;
  grid-template-columns: auto 1fr auto auto auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #fafafa;
  border-radius: 8px;
}

.exceptionRadio {
  display: flex;
  gap: 0.75rem;
  font-size: 0.85rem;
}

.exceptionTimes {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  grid-column: 1 / -1;
}

.addBtn {
  font: inherit;
  background: transparent;
  border: 1px dashed #c44a73;
  color: #c44a73;
  border-radius: 8px;
  padding: 0.55rem 0.85rem;
  margin-top: 0.75rem;
  cursor: pointer;
}

.trashBtn {
  font: inherit;
  background: transparent;
  border: 1px solid #b3263a;
  color: #b3263a;
  border-radius: 6px;
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  cursor: pointer;
}

@media (max-width: 600px) {
  .exceptionCard {
    grid-template-columns: 1fr 1fr;
  }
  .exceptionRadio,
  .exceptionTimes,
  .trashBtn {
    grid-column: 1 / -1;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/sections/ExceptionsSection.tsx app/admin/admin.module.css
git commit -m "feat(admin): add Ünnepek section with date+mode+optional custom hours"
```

---

### Task C8: Wire sections into admin page

**Files:**
- Modify: `app/admin/page.tsx`

- [ ] **Step 1: Replace `app/admin/page.tsx`**

```tsx
import { getSite } from "@/lib/site/getSite";
import { MetaSection } from "./sections/MetaSection";
import { HoursSection } from "./sections/HoursSection";
import { ExceptionsSection } from "./sections/ExceptionsSection";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const site = await getSite();
  return (
    <>
      <MetaSection site={site} />
      <HoursSection site={site} />
      <ExceptionsSection site={site} />
    </>
  );
}
```

- [ ] **Step 2: Verify end-to-end**

```bash
pnpm typecheck
pnpm dev
```

Log in. For each section:
1. Edit a field. Confirm "Mentés" button becomes solid pink.
2. Click Mentés. Confirm: toast appears, "Mentve HH:MM" timestamp appears, button greys out.
3. Open `http://localhost:3000/` in a new tab. Confirm: change reflects (title in tab, schedule on FindUs, exception banner if dated today).
4. Inspect `.data/site.json` exists and contains the change.
5. Edit a field but DON'T save → close tab → expect browser confirm prompt.

- [ ] **Step 3: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat(admin): compose admin page with Meta, Hours, and Exceptions sections"
```

---

### Task C9: Phase C smoke

- [ ] **Step 1: Tests + build**

```bash
pnpm typecheck
pnpm test
pnpm build
```

Expected: passes.

- [ ] **Step 2: Manual round-trip checklist**

- Change title → save → reload `/` (in new tab) → tab title updates.
- Make Wed closed → save → schedule on `/` shows "Kedd, Csüt, Szo" automatically.
- Add an exception for today (`closed` mode) → save → reload `/` → exception banner shows; status pill says "Most ZÁRVA".
- Status pill should still update every 60s.
- View source on `/` → JSON-LD `openingHoursSpecification` matches the edited schedule.

Phase C complete (text content fully editable).

---

# Phase D — Gallery upload pipeline

This phase adds the sharp-backed photo upload, atomic photo-dir swap, and the gallery admin section UI.

---

### Task D1: Sharp processing helper

**Files:**
- Create: `lib/site/processPhoto.ts`
- Create: `lib/site/processPhoto.test.ts`
- Create: `lib/site/__fixtures__/sample.jpg` (engineer: copy any existing photo from `./photos/`)

- [ ] **Step 1: Create the fixture**

```bash
mkdir -p lib/site/__fixtures__
cp photos/nyari_lud_final_5.JPG_1.5.1.jpg lib/site/__fixtures__/sample.jpg
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { processPhotoBuffer } from "./processPhoto";

describe("processPhotoBuffer", () => {
  it("produces a WebP buffer + blur placeholder + dimensions", async () => {
    const buf = await fs.readFile(path.join(__dirname, "__fixtures__", "sample.jpg"));
    const result = await processPhotoBuffer(buf);
    expect(result.webp.length).toBeGreaterThan(1000);
    expect(result.width).toBeGreaterThanOrEqual(1200);
    expect(result.width).toBeLessThanOrEqual(1440);
    expect(result.height).toBeGreaterThan(0);
    expect(result.blurDataURL.startsWith("data:image/webp;base64,")).toBe(true);
  });

  it("rejects buffers that are too small (< 1200px wide)", async () => {
    const tiny = await (await import("sharp")).default({
      create: { width: 800, height: 600, channels: 3, background: { r: 200, g: 200, b: 200 } },
    }).jpeg().toBuffer();
    await expect(processPhotoBuffer(tiny)).rejects.toThrow(/legalább 1200/);
  });
});
```

- [ ] **Step 3: Run test to verify failure**

Run: `pnpm test processPhoto`
Expected: FAIL "Cannot find module".

- [ ] **Step 4: Implement `lib/site/processPhoto.ts`**

```ts
import sharp from "sharp";

export type ProcessedPhoto = {
  webp: Buffer;
  width: number;
  height: number;
  blurDataURL: string;
};

export async function processPhotoBuffer(input: Buffer): Promise<ProcessedPhoto> {
  const meta = await sharp(input, { failOn: "error" }).rotate().metadata();
  if (!meta.width || meta.width < 1200) {
    throw new Error("túl kicsi a kép — legalább 1200 px széles legyen");
  }

  const pipeline = sharp(input, { failOn: "error" })
    .rotate()
    .resize({ width: 1440, withoutEnlargement: true, fit: "inside" });

  const { data: webp, info } = await pipeline
    .clone()
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  const blurBuf = await sharp(webp)
    .resize(16, null, { fit: "inside" })
    .webp({ quality: 30 })
    .toBuffer();

  return {
    webp,
    width: info.width,
    height: info.height,
    blurDataURL: `data:image/webp;base64,${blurBuf.toString("base64")}`,
  };
}
```

- [ ] **Step 5: Run test to verify pass**

Run: `pnpm test processPhoto`
Expected: 2 tests pass (may take 2–4 seconds — sharp is heavy).

- [ ] **Step 6: Commit**

```bash
git add lib/site/processPhoto.ts lib/site/processPhoto.test.ts lib/site/__fixtures__/sample.jpg
git commit -m "feat(site): add sharp pipeline producing WebP + blur placeholder"
```

---

### Task D2: Atomic photos directory swap helper

**Files:**
- Create: `lib/site/photosDir.ts`
- Create: `lib/site/photosDir.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { swapPhotosDir } from "./photosDir";

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "photosdir-"));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

async function fileExists(p: string) {
  try { await fs.access(p); return true; } catch { return false; }
}

describe("swapPhotosDir", () => {
  it("replaces an existing photos dir atomically", async () => {
    const live = path.join(root, "photos");
    await fs.mkdir(live, { recursive: true });
    await fs.writeFile(path.join(live, "old.webp"), Buffer.from([0x01]));

    await swapPhotosDir({
      live,
      build: async (staging) => {
        await fs.writeFile(path.join(staging, "new.webp"), Buffer.from([0x02]));
      },
    });

    expect(await fileExists(path.join(live, "new.webp"))).toBe(true);
    expect(await fileExists(path.join(live, "old.webp"))).toBe(false);
  });

  it("creates the photos dir if it does not exist", async () => {
    const live = path.join(root, "photos");
    await swapPhotosDir({
      live,
      build: async (staging) => {
        await fs.writeFile(path.join(staging, "new.webp"), Buffer.from([0x02]));
      },
    });
    expect(await fileExists(path.join(live, "new.webp"))).toBe(true);
  });

  it("leaves live dir untouched if build throws", async () => {
    const live = path.join(root, "photos");
    await fs.mkdir(live, { recursive: true });
    await fs.writeFile(path.join(live, "old.webp"), Buffer.from([0x01]));

    await expect(
      swapPhotosDir({
        live,
        build: async () => { throw new Error("boom"); },
      })
    ).rejects.toThrow("boom");

    expect(await fileExists(path.join(live, "old.webp"))).toBe(true);
    const siblings = await fs.readdir(root);
    expect(siblings.filter((s) => s.startsWith("photos.staging-")).length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test photosDir`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/site/photosDir.ts`**

```ts
import { promises as fs } from "fs";
import crypto from "crypto";
import path from "path";

export async function swapPhotosDir(opts: {
  live: string;
  build: (stagingDir: string) => Promise<void>;
}): Promise<void> {
  const id = crypto.randomUUID();
  const parent = path.dirname(opts.live);
  const staging = path.join(parent, `photos.staging-${id}`);
  const archive = path.join(parent, `photos.old-${id}`);

  await fs.mkdir(staging, { recursive: true });
  try {
    await opts.build(staging);
  } catch (err) {
    await fs.rm(staging, { recursive: true, force: true });
    throw err;
  }

  try {
    await fs.rename(opts.live, archive);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      await fs.rm(staging, { recursive: true, force: true });
      throw err;
    }
  }
  await fs.rename(staging, opts.live);
  await fs.rm(archive, { recursive: true, force: true });
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test photosDir`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/site/photosDir.ts lib/site/photosDir.test.ts
git commit -m "feat(site): add atomic photos-directory swap with staging + archive"
```

---

### Task D3: Gallery upload route handler

**Files:**
- Create: `app/admin/api/gallery/route.ts`

- [ ] **Step 1: Implement route**

```ts
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getSite } from "@/lib/site/getSite";
import { saveSite } from "@/lib/site/saveSite";
import { PHOTOS_DIR } from "@/lib/site/paths";
import { swapPhotosDir } from "@/lib/site/photosDir";
import { processPhotoBuffer } from "@/lib/site/processPhoto";
import { atomicWriteJson } from "@/lib/site/atomic";
import type { SitePhoto } from "@/lib/site/schema";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
]);

const PinStyle = z.enum(["tape-top", "tape-tl", "tape-tr", "pin"]);
const Slot = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

const MetaItem = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("keep"),
    id: z.string(),
    slot: Slot,
    alt: z.string(),
    pin: PinStyle,
    blueTape: z.boolean(),
    tapeRot: z.string().optional(),
  }),
  z.object({
    kind: z.literal("new"),
    fileKey: z.string(),
    slot: Slot,
    alt: z.string(),
    pin: PinStyle,
    blueTape: z.boolean(),
    tapeRot: z.string().optional(),
  }),
]);
const MetaArray = z.array(MetaItem).length(5);

function originOk(host: string | null, origin: string | null): boolean {
  if (!origin) return false;
  try {
    const o = new URL(origin);
    return o.host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  await requireAdmin();

  const h = await headers();
  if (!originOk(h.get("host"), req.headers.get("origin"))) {
    return Response.json({ ok: false, error: "Bad Origin" }, { status: 400 });
  }

  const form = await req.formData();
  const metaRaw = String(form.get("meta") ?? "");
  let metaParsed;
  try {
    metaParsed = JSON.parse(metaRaw);
  } catch {
    return Response.json({ ok: false, error: "meta nem érvényes JSON" }, { status: 400 });
  }

  const meta = MetaArray.safeParse(metaParsed);
  if (!meta.success) {
    return Response.json({ ok: false, error: meta.error.issues.map(i => i.message).join("; ") }, { status: 400 });
  }

  const slots = meta.data.map(m => m.slot).sort();
  if (JSON.stringify(slots) !== JSON.stringify([1, 2, 3, 4, 5])) {
    return Response.json({ ok: false, error: "minden slot kötelező (1..5)" }, { status: 400 });
  }

  const newKeys = meta.data
    .filter((m): m is Extract<typeof m, { kind: "new" }> => m.kind === "new")
    .map(m => m.fileKey);
  if (new Set(newKeys).size !== newKeys.length) {
    return Response.json({ ok: false, error: "duplikált fájlkulcs" }, { status: 400 });
  }

  const files: Record<string, File> = {};
  for (const key of newKeys) {
    const f = form.get(`photo[${key}]`);
    if (!(f instanceof File)) {
      return Response.json({ ok: false, error: `hiányzó fájl: ${key}` }, { status: 400 });
    }
    if (f.size > MAX_BYTES) {
      return Response.json({ ok: false, error: `túl nagy fájl (${key})` }, { status: 413 });
    }
    if (!ACCEPT_MIME.has(f.type)) {
      return Response.json({ ok: false, error: `nem támogatott formátum: ${f.type}` }, { status: 415 });
    }
    files[key] = f;
  }

  const current = await getSite();
  const liveById: Record<string, SitePhoto> = Object.fromEntries(current.gallery.map(p => [p.id, p]));

  type Out = { sidecar: SitePhoto; webp?: Buffer };
  let outputs: Out[];
  try {
    outputs = await Promise.all(
      meta.data.map<Promise<Out>>(async (m) => {
        if (m.kind === "keep") {
          const existing = liveById[m.id];
          if (!existing) throw new Error(`ismeretlen id: ${m.id}`);
          return {
            sidecar: {
              ...existing,
              slot: m.slot,
              alt: m.alt,
              pin: m.pin,
              blueTape: m.blueTape,
              tapeRot: m.tapeRot,
            },
          };
        }
        const buf = Buffer.from(await files[m.fileKey].arrayBuffer());
        const processed = await processPhotoBuffer(buf);
        const id = `p-${crypto.randomUUID()}`;
        return {
          sidecar: {
            id,
            slot: m.slot,
            alt: m.alt,
            pin: m.pin,
            blueTape: m.blueTape,
            tapeRot: m.tapeRot,
            width: processed.width,
            height: processed.height,
            blurDataURL: processed.blurDataURL,
          },
          webp: processed.webp,
        };
      })
    );
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }

  await swapPhotosDir({
    live: PHOTOS_DIR,
    build: async (staging) => {
      for (const o of outputs) {
        const isSeed = o.sidecar.id.startsWith("seed-");
        if (o.webp) {
          await fs.writeFile(path.join(staging, `${o.sidecar.id}.webp`), o.webp);
          await atomicWriteJson(path.join(staging, `${o.sidecar.id}.json`), o.sidecar);
        } else if (!isSeed) {
          const src = path.join(PHOTOS_DIR, `${o.sidecar.id}.webp`);
          const srcSidecar = path.join(PHOTOS_DIR, `${o.sidecar.id}.json`);
          await fs.copyFile(src, path.join(staging, `${o.sidecar.id}.webp`));
          await fs.copyFile(srcSidecar, path.join(staging, `${o.sidecar.id}.json`));
        }
      }
    },
  });

  const gallery = outputs.map(o => o.sidecar) as [SitePhoto, SitePhoto, SitePhoto, SitePhoto, SitePhoto];
  await saveSite({ ...current, gallery });

  return Response.json({ ok: true, gallery });
}
```

A "keep" of a `seed-*` photo skips file copy (no `/data/photos/seed-*.webp` exists). The gallery component already handles that case via `SEED_SOURCES`.

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/api/gallery/route.ts
git commit -m "feat(admin): add /admin/api/gallery upload route with sharp + atomic swap"
```

---

### Task D4: `GallerySection` admin UI

**Files:**
- Create: `app/admin/sections/GallerySection.tsx`

- [ ] **Step 1: Implement section**

```tsx
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
  const [baseline] = useState<string>(() => JSON.stringify(site.gallery));
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
          const idx = next.findIndex((t) => t.source.kind === "existing" && t.source.id.startsWith("seed-"))
                   ?? next.findIndex((t) => t.source.kind === "new");
          const target = idx >= 0 ? idx : next.length - 1;
          const fileKey = `f-${Math.random().toString(36).slice(2)}`;
          const previewUrl = URL.createObjectURL(file);
          const old = next[target];
          next[target] = {
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
      // Re-baseline by reloading the section's data: simplest is a soft refresh
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
```

- [ ] **Step 2: Append gallery styles**

Append to `app/admin/admin.module.css`:
```css
.dropzone {
  border: 2px dashed #c44a73;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  text-align: center;
  font-size: 0.9rem;
  cursor: pointer;
  margin-bottom: 1rem;
  background: #fff;
  color: #555;
}

.dropzoneActive {
  background: #fceaee;
  color: #c44a73;
}

.tileRow {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
}

.tile {
  background: #fafafa;
  border-radius: 8px;
  padding: 0.5rem;
  display: grid;
  gap: 0.4rem;
}

.tileDrag {
  cursor: grab;
  font-size: 0.9rem;
  color: #888;
  text-align: center;
  user-select: none;
}

.tileImg {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 6px;
  background: #eee;
}

.tileToggle {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: #555;
}

@media (max-width: 720px) {
  .tileRow {
    grid-template-columns: 1fr 1fr;
  }
}
```

- [ ] **Step 3: Add a seed thumbnail asset**

The admin uses `/seed-thumb.jpg` as a generic preview for seed photos (we can't easily reuse the static-imported StaticImageData without re-implementing the loader). Generate it:

```bash
cp photos/nyari_lud_final_5.JPG_1.5.1.jpg public/seed-thumb.jpg
```

(Tradeoff: every seed photo shows the same thumbnail in the admin grid until the first save. Acceptable — after the first save all photos have content-addressed URLs.)

- [ ] **Step 4: Wire into admin page**

Modify `app/admin/page.tsx`:
```tsx
import { getSite } from "@/lib/site/getSite";
import { MetaSection } from "./sections/MetaSection";
import { GallerySection } from "./sections/GallerySection";
import { HoursSection } from "./sections/HoursSection";
import { ExceptionsSection } from "./sections/ExceptionsSection";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const site = await getSite();
  return (
    <>
      <MetaSection site={site} />
      <GallerySection site={site} />
      <HoursSection site={site} />
      <ExceptionsSection site={site} />
    </>
  );
}
```

- [ ] **Step 5: Verify**

```bash
pnpm typecheck
pnpm dev
```

In the admin:
1. Galéria section shows 5 tiles (seed previews initially).
2. Drag a tile → order updates visually.
3. Drop a real photo from your filesystem onto the dropzone → it appears in a slot with a local-blob preview.
4. Save → loading state → page reloads → `/data/photos/p-*.webp` now exists with a sidecar JSON.
5. Open `/` in another tab → the gallery shows the new photo via `/photos/p-*.webp`.
6. Tap-and-hold on mobile → reorder works.

- [ ] **Step 6: Commit**

```bash
git add app/admin/sections/GallerySection.tsx app/admin/admin.module.css app/admin/page.tsx public/seed-thumb.jpg
git commit -m "feat(admin): add Galéria section with dropzone, dnd-kit sortable, and upload flow"
```

---

### Task D5: Phase D smoke

- [ ] **Step 1: Tests + build**

```bash
pnpm typecheck
pnpm test
pnpm build
```

Expected: all green.

- [ ] **Step 2: End-to-end gallery scenario**

- Upload a new photo into slot 1 → save → `/` reflects.
- Drag slot 1 → slot 5, drag slot 3 → slot 1 → save → `/` reflects new order.
- Edit alt text of an existing photo → save → page source on `/` shows updated `alt`.
- Toggle blue tape on a tile → save → polaroid tape style changes visibly on `/`.
- Drop a > 25 MB file → admin shows error, no save.
- Drop a corrupt / non-image file → admin shows error, no save.

Phase D complete (gallery fully editable).

---

# Phase E — Deploy & polish

---

### Task E1: Dockerfile volume + data dir

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Modify `Dockerfile`**

Replace with:
```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV SITE_DATA_DIR=/data

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /data/photos \
  && chown -R nextjs:nodejs /data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

VOLUME ["/data"]

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
```

- [ ] **Step 2: Build the Docker image locally to verify sharp + libheif work on Alpine**

```bash
docker build -t nyarilud:test .
docker run --rm -p 3000:3000 \
  -e ADMIN_USER=test \
  -e ADMIN_PASSWORD=test \
  -e SESSION_SECRET=test-secret-please-rotate-in-prod-0123456789 \
  -v $(pwd)/.docker-data:/data \
  nyarilud:test
```

Visit `http://localhost:3000/admin/login` → log in → upload a JPEG → verify it processes. If HEIC fails on Alpine (`Input file contains unsupported image format`), switch the runner stage's base to `node:22-slim`:
```dockerfile
FROM node:22-slim AS runner
```
…and rebuild.

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "build: declare /data volume and create photos dir for admin uploads"
```

---

### Task E2: `.env.example` and README notes

**Files:**
- Create: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Create `.env.example`**

```
# Required for /admin to be reachable
ADMIN_USER=changeme
ADMIN_PASSWORD=changeme
SESSION_SECRET=generate-with-openssl-rand-hex-32

# Optional — overrides the default data dir
# SITE_DATA_DIR=/data
```

- [ ] **Step 2: Replace `README.md`**

```markdown
# nyári lúd

Premium preloved boutique landing site. Next.js 15 (App Router) + sharp + zod.

## Dev

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

For admin access locally:

```bash
cp .env.example .env.local
# fill in ADMIN_USER, ADMIN_PASSWORD, SESSION_SECRET
SESSION_SECRET=$(openssl rand -hex 32)
pnpm dev
```

Then visit http://localhost:3000/admin/login.

## Test

```bash
pnpm test
```

## Build & deploy

`pnpm build` produces a standalone Next.js bundle. The Docker image (`Dockerfile`) declares a `/data` volume — mount it in Coolify / docker-compose to persist admin edits across redeploys.

### Required env vars in production

| var               | purpose                                          |
|-------------------|--------------------------------------------------|
| `ADMIN_USER`      | admin login username                             |
| `ADMIN_PASSWORD`  | admin login password                             |
| `SESSION_SECRET`  | 32+ random bytes for HMAC signing the session    |
| `SITE_DATA_DIR`   | (optional) overrides the default `/data` path    |

## Editing content

All editable content lives in `/data/site.json` plus `/data/photos/`. Edit via `/admin` — never edit the JSON directly.
```

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs: add env example and admin operations guide"
```

---

### Task E3: Final verification

- [ ] **Step 1: Full repo health**

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm lint
```

Expected: all green.

- [ ] **Step 2: Production-mode smoke**

```bash
ADMIN_USER=dora ADMIN_PASSWORD=test SESSION_SECRET=$(openssl rand -hex 32) NODE_ENV=production pnpm start
```

(`SITE_DATA_DIR` defaults to `/data` in production. For local prod smoke, override to a writable path: `SITE_DATA_DIR=$(pwd)/.data pnpm start`.)

Verify:
- `/` loads, all metadata + JSON-LD present.
- `/admin/login` → log in → all 4 sections render.
- Edit meta + save → `/` reflects after one second.
- Upload a new photo → `/` reflects after one second.
- View source on `/` → all 3 JSON-LD blocks valid; opening hours match what's in the admin.

- [ ] **Step 3: Final commit**

```bash
git status   # should be clean
git log --oneline -20   # confirm commit graph reads cleanly
```

Done. Hand off to deployment (Coolify volume mount + env var configuration).

---

## Self-Review

**1. Spec coverage:** Walking the spec section by section against this plan:

- §3.1 Storage (volume layout) → Tasks A4 paths, E1 Dockerfile volume. ✓
- §3.2 Read path (`unstable_cache` + fallback) → Task A9. ✓
- §3.3 Write path (validate + atomic + revalidate) → Tasks A3 atomic, A10 saveSite. ✓
- §3.4 Schema → Task A2. ✓
- §3.5 Hours module → Tasks A5/A6/A7. ✓
- §3.6 JSON-LD generation → Task A8. ✓
- §3.7 Route layout → Tasks A11/A12 (site), A13 (photos), B5 (middleware), B6/B7 (admin login/layout). ✓
- §4 Auth (env, session, cookie, login, requireAdmin, middleware, CSRF, safeEq) → Tasks B1–B7. ✓
- §5 Gallery (client UX, server upload, sharp, atomic swap, dynamic serve, seed fallback) → Tasks A13, A14, D1–D4. ✓
- §6 Dependencies → Task A1. ✓
- §7 Admin UX (single-page, per-section save, sticky dirty bar, toast, native time/date, dnd-kit) → Tasks C2–C8 + D4. **Note**: sticky bottom "Mentés mindet" bar described in spec §7.2 is not implemented — only the per-section saves. Mark as deferred or add task.
- §8 Type-safety summary → covered (zod safeParse + parse at boundaries).
- §9 Testing strategy → Tasks A2, A3, A5, A6, A7, A8, A9, A10, B1, B2, B3, D1, D2 all have tests.
- §10 Migration → Task A11–A15 phase A smoke (DEFAULT_SITE seeded; empty `/data` works).
- §11 Open questions → noted in spec.
- §13 Success criteria → covered by smoke tests in phases A–E.

**Identified gap:** Spec §7.2 calls for a sticky bottom "Mentés szükséges: Galéria, Nyitvatartás · Mentés mindet" bar that appears when any section is dirty. Plan implements per-section saves but not the global cross-section dirty footer. Decision: defer to a polish PR — the per-section saves already cover the core need; the global footer is a nice-to-have that requires cross-component dirty state coordination (likely via a small Zustand-like context). Add a follow-up task note here so it's not lost:

> **Follow-up (not blocking):** Add a `DirtyContext` provider mounted in `AdminShell`. Each section registers a (`sectionId`, `dirty`, `submit`) tuple. Footer reads context, renders the sticky bar listing dirty sections, and "Mentés mindet" calls each `submit()` in sequence. ~80 lines.

**2. Placeholder scan:** No "TBD", "TODO", "implement later", or empty stubs. Every code step has actual code. The only "engineer: copy verbatim" instruction is for the BRANDS_CARRIED constant (Task A8) where the source is explicitly identified (`app/layout.tsx` lines 9-127).

**3. Type consistency:**

- `Site`, `SitePhoto`, `SiteException`, `DayKey`, `DAY_KEYS` are defined in A2 and used identically in A5–A10, A12, A14, C1, C5–C7, D3, D4. ✓
- `OpenStatus` is exported from `lib/site/hours.ts` (A7) and re-exported from `lib/useOpenStatus.ts` (A12). ✓
- `JsonLdHours` defined in A5, consumed by A8. ✓
- `HoursGroup` defined in A6, consumed by A12 (FindUs). ✓
- `SaveResult` defined in C1, consumed by C5–C7. ✓
- Server actions: `saveMetaAction` takes a flat input object (C1) and is called with the same shape from C5. ✓
- `processPhotoBuffer` returns `{ webp, width, height, blurDataURL }` (D1) and is consumed in D3 with those exact field names. ✓
- `swapPhotosDir({ live, build })` (D2) called with same shape in D3. ✓

No signature drift detected.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-20-admin-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Good fit here because most tasks are small and self-contained, and the cross-cutting state (the schema, the auth helpers) is locked in early so later agents can rely on it without rediscovery.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Better if you want to be in the loop on every step and don't mind a longer continuous session.

Which approach?
