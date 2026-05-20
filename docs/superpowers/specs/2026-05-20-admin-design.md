# /admin Panel — Design Spec

**Date:** 2026-05-20
**Status:** Approved by owner; ready for implementation plan
**Supersedes:** `docs/specification/2026-05-20_plan.md` (Google Places approach — abandoned in favor of self-hosted admin)

## 1. Goal

Give the boutique owner a single-user, env-credentialed `/admin` route to edit the live site without touching code:

- Page title & meta description
- Slogan (visible + structured data)
- Address + email
- Gallery (5 polaroid photos: upload, drag-reorder, alt text, tape/pin style)
- Weekly opening hours (per-day open/close + closed toggle)
- Holiday exceptions (date + closed/custom hours + label)

The opening-hours schema becomes the single source of truth that every consumer (`layout.tsx` JSON-LD, `FindUs.tsx` display, `useOpenStatus`) reads from.

## 2. Non-goals

- Multi-user / role-based access (single owner, single env-coded credential)
- Brand list editing (~120 entries; stays in `lib/brands.ts`, edited via code PR)
- Preview / publish workflow (save = live)
- Hero photo / Backdrop / Footer text editing (no demand)
- i18n (admin UI is Hungarian-only; matches owner)
- Image format negotiation (single WebP output; JPG fallback intentionally omitted)

## 3. Architecture

### 3.1 Storage

Edits persist to a Docker volume mounted at `/data/`:

```
/data/
  site.json              ← all text content, atomic temp+rename writes
  photos/
    <photo-id>.webp      ← processed gallery photo (1440px max, q82)
    <photo-id>.json      ← per-photo sidecar: width, height, alt, blur, pin style
```

The volume is mounted in Coolify / docker-compose. Dev path falls back to `./.data/` (gitignored) so local edits persist without a real volume.

### 3.2 Read path

`lib/site/getSite.ts` exports an `unstable_cache`-wrapped reader keyed by tag `'site'`:

```ts
export const getSite = unstable_cache(
  async (): Promise<Site> => {
    try {
      const raw = await fs.readFile(SITE_JSON_PATH, "utf8");
      const parsed = SiteSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        console.error("[site.json] invalid, falling back to defaults", parsed.error.flatten());
        return DEFAULT_SITE;
      }
      return parsed.data;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return DEFAULT_SITE;
      console.error("[site.json] read error, falling back to defaults", err);
      return DEFAULT_SITE;
    }
  },
  ["site"],
  { tags: ["site"] }
);
```

Properties:

- Cached across requests; no fs hit per render.
- Bad/missing JSON falls back to `DEFAULT_SITE` (seeded with the current hardcoded values). The public site can never 500 because of an admin save.
- First boot: file missing → `DEFAULT_SITE` is returned. First admin save creates the file.

### 3.3 Write path

`lib/site/saveSite.ts`:

```ts
export async function saveSite(next: Site): Promise<void> {
  const validated = SiteSchema.parse(next); // throws on invalid
  await atomicWriteJson(SITE_JSON_PATH, validated);
  revalidateTag("site");
  revalidatePath("/", "layout");
}
```

- Validates via zod `.parse` (throws → caller returns a 400 with field errors).
- Atomic write: `fs.writeFile(tmpPath)` then `fs.rename(tmpPath, SITE_JSON_PATH)`.
- Cache invalidation: tag clears `unstable_cache`, path-with-`'layout'` re-renders the root layout's `generateMetadata` + JSON-LD.

### 3.4 Schema

`lib/site/schema.ts` — single zod schema, one persisted file:

```ts
const TimeHHMM = z.string().regex(/^\d{2}:\d{2}$/);

const DaySchema = z.object({
  closed: z.boolean(),
  opens: TimeHHMM,   // ignored when closed
  closes: TimeHHMM,
});

const ExceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().optional(),
  mode: z.enum(["closed", "custom"]),
  opens: TimeHHMM.optional(),
  closes: TimeHHMM.optional(),
}).refine(
  (e) => e.mode === "closed" || (e.opens !== undefined && e.closes !== undefined),
  { message: "custom mode requires opens+closes" }
);

const PhotoSchema = z.object({
  id: z.string(),                    // crypto.randomUUID()
  slot: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  alt: z.string(),
  pin: z.enum(["tape-top", "tape-tl", "tape-tr", "pin"]),
  blueTape: z.boolean().default(false),
  tapeRot: z.string().optional(),    // e.g. "2deg"
  width: z.number(),
  height: z.number(),
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
    mon: DaySchema, tue: DaySchema, wed: DaySchema, thu: DaySchema,
    fri: DaySchema, sat: DaySchema, sun: DaySchema,
  }),
  exceptions: z.array(ExceptionSchema),
  gallery: z.array(PhotoSchema).length(5),
});

export type Site = z.infer<typeof SiteSchema>;
export const DEFAULT_SITE: Site = { /* seed from current hardcoded values */ };
```

### 3.5 Opening-hours module (single source of truth)

`lib/site/hours.ts` — pure functions, no state:

```ts
export function toOpeningHoursSpecification(site: Site): JsonLdOpeningHours[];
export function toHumanGroups(site: Site, locale?: "hu"): HoursGroup[];
export function statusAt(site: Site, now: Date): OpenStatus;
export function todaysExceptionBanner(site: Site, now: Date): string | null;
```

Consumers:

| Consumer                | Calls                                                | Renders                                           |
|-------------------------|------------------------------------------------------|---------------------------------------------------|
| `app/layout.tsx`        | `toOpeningHoursSpecification(site)`                  | JSON-LD `openingHoursSpecification`               |
| `components/FindUs.tsx` | `toHumanGroups(site)` + `todaysExceptionBanner`      | "Kedd–Csüt, Szo: 10 — 15" rows + banner          |
| `lib/useOpenStatus.ts`  | `statusAt(site, new Date())` on the client          | Live "Most nyitva" / "Most ZÁRVA" pill            |

`toHumanGroups` walks the 7 days, groups runs of identical hours, and emits Hungarian day-range labels. If the owner changes Wed to closed, the display becomes `"Kedd, Csüt, Szo: 10 — 15"` automatically.

`statusAt` checks `exceptions` first (today's date match), falls back to weekly schedule. Returns the same `OpenStatus` shape currently in `lib/useOpenStatus.ts`.

### 3.6 JSON-LD generation

`lib/site/jsonld.ts` — pure builders:

```ts
export function buildStoreJsonLd(site: Site, brands: readonly string[]): object;
export function buildBrandsJsonLd(brands: readonly string[]): object;
export function buildWebsiteJsonLd(): object;
```

Called from the `RootLayout` server component (the layout becomes async). `BRANDS_CARRIED` stays as a constant in `lib/brands.ts`.

`generateMetadata` is converted from a static export to an async function that reads `getSite()` and emits dynamic `title`, `description`, `openGraph`, `twitter`.

### 3.7 Route layout

```
app/
  (site)/
    layout.tsx              ← root layout; reads getSite() for metadata + JSON-LD
    page.tsx                ← reads getSite(); passes site to Hero/Gallery/FindUs
  admin/
    layout.tsx              ← calls requireAdmin(); renders <AdminShell>
    page.tsx                ← the single-page admin
    login/
      page.tsx
      actions.ts            ← loginAction, logoutAction (server actions)
    actions.ts              ← saveMetaAction, saveContactAction, saveHoursAction, saveExceptionsAction
    api/
      gallery/route.ts      ← multipart upload (Node runtime), atomic photo swap
  photos/[name]/route.ts    ← public read-only photo streamer

lib/
  site/
    schema.ts
    getSite.ts
    saveSite.ts
    hours.ts
    jsonld.ts
    paths.ts                ← SITE_JSON_PATH, PHOTOS_DIR (resolves env override)
  auth/
    session.ts              ← Web Crypto HMAC: sign, verify, setSession, clearSession
    requireAdmin.ts         ← throws redirect("/admin/login") on fail
    rateLimit.ts            ← in-memory Map limiter
    safeEq.ts               ← timing-safe digest-then-bytewise comparison
  brands.ts                 ← BRANDS_CARRIED constant (moved out of app/layout.tsx)

middleware.ts               ← cheap cookie-presence redirect ONLY (not a security boundary)
```

## 4. Authentication

### 4.1 Env vars

```
ADMIN_USER=<owner username>
ADMIN_PASSWORD=<plaintext, compared via safeEq>
SESSION_SECRET=<32+ random bytes hex; rotate to invalidate all sessions>
SITE_DATA_DIR=/data                             # defaults to "./.data" in dev
```

Startup helper checks the first three (`ADMIN_USER`, `ADMIN_PASSWORD`, `SESSION_SECRET`) when `/admin/*` is requested. Missing → admin returns 503 with a clear log line; the public site continues unaffected. `SITE_DATA_DIR` is optional with a default of `./.data` in dev and `/data` in production.

### 4.2 Session cookie

`sid` cookie, `httpOnly` + `secure` + `sameSite=lax`, value `<sub>.<expiresAtMs>.<HMAC-SHA256>` signed with `SESSION_SECRET` via Web Crypto (`subtle.sign` / `subtle.verify`, edge-compatible). 7-day expiry. Rotation: change `SESSION_SECRET` → all sessions invalidate (optional `SESSION_SECRET_PREVIOUS` for graceful overlap).

### 4.3 Login flow

1. `GET /admin/login` — server-rendered form (user, password). No client JS required.
2. `loginAction(formData)` server action:
   - `rateLimit.check(ip, 5, 60_000)` → returns generic "too many attempts" if exceeded.
   - `await safeEq(user, env.ADMIN_USER)` AND `await safeEq(password, env.ADMIN_PASSWORD)`.
   - On fail: `await sleep(1000)`; return `{ error: "Hibás belépés" }`.
   - On success: `setSession(env.ADMIN_USER)`, `redirect("/admin")`.
3. `requireAdmin()` is called in `/admin/layout.tsx` AND at the top of every admin server action / route handler — defense in depth per Next 15 security guidance (CVE-2025-29927 means middleware is not a security boundary).

### 4.4 Middleware

Minimal — redirects unauthenticated `/admin/*` requests to `/admin/login` based on cookie presence only (no signature check). The real auth is per-route.

```ts
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin")
      && req.nextUrl.pathname !== "/admin/login"
      && !req.cookies.get("sid")) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
}
export const config = { matcher: ["/admin/:path*"] };
```

### 4.5 CSRF

- Server Actions: covered by Next 15's built-in same-origin check (`Origin === Host` or `X-Forwarded-Host`). No token needed.
- `/admin/api/gallery` route handler: explicit `Origin` header check at the top, in addition to `requireAdmin()`.

### 4.6 `safeEq` helper

Digest both inputs to fixed-length 32-byte SHA-256, then byte-wise compare with a constant-time loop. Avoids `timingSafeEqual` length-throw and length-leak issues. Hashing first means even if `===` were used after, no length information leaks.

## 5. Gallery upload pipeline

### 5.1 Client side

Admin "Galéria" section stages all changes locally:

- 5 sortable thumbnail tiles (`@dnd-kit/sortable`), each with alt input + 4-option tape segmented control + blue-tape toggle.
- File dropzone (`react-dropzone`) accepts JPEG/PNG/WebP/HEIC/HEIF up to 25 MB.
- New file dropped → fills the next empty slot or replaces the focused tile.
- "Mentés" submits `multipart/form-data` to `POST /admin/api/gallery`.

Submission body:

- `meta` (string): JSON-encoded array of 5 `PhotoUpload` records:
  ```ts
  type PhotoUpload =
    | { kind: "keep"; id: string; slot: 1|2|3|4|5; alt: string; pin: PinStyle; blueTape: boolean; tapeRot?: string }
    | { kind: "new";  fileKey: string; slot: 1|2|3|4|5; alt: string; pin: PinStyle; blueTape: boolean; tapeRot?: string };
  ```
- `photo[<fileKey>]` (Blob): each new file, keyed by the `fileKey` in `meta`.

### 5.2 Server side (`app/admin/api/gallery/route.ts`)

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
```

1. `await requireAdmin()`; assert `Origin === Host`.
2. Parse `req.formData()`; validate meta with zod (length 5, slots cover 1..5, no duplicate fileKeys).
3. Reject any file > 25 MB or with disallowed mime (415).
4. For each `meta[i]`:
   - `kind: "keep"` → copy existing `<id>.webp` + `<id>.json` from live photos dir into staging dir.
   - `kind: "new"` → run sharp pipeline (see 5.3), write `<newId>.webp` + `<newId>.json` to staging.
5. Atomic swap (see 5.4).
6. Build new `gallery: PhotoSchema[]` from the resulting set; call `saveSite({ ...existing, gallery })` which validates + writes site.json + revalidates.
7. Respond `{ ok: true, gallery }`.

### 5.3 sharp pipeline

```ts
const pipeline = sharp(buffer, { failOn: "error" })
  .rotate()                                              // apply EXIF orientation
  .resize({ width: 1440, withoutEnlargement: true, fit: "inside" });
// Default behavior strips metadata; we DO NOT call .withMetadata() (calling it preserves metadata)

const { data: webp, info } = await pipeline.clone()
  .webp({ quality: 82, effort: 4 })
  .toBuffer({ resolveWithObject: true });

const { data: blurBuf } = await sharp(webp)
  .resize(16, null, { fit: "inside" })
  .webp({ quality: 30 })
  .toBuffer({ resolveWithObject: true });
const blurDataURL = `data:image/webp;base64,${blurBuf.toString("base64")}`;

// info.width, info.height go into the sidecar JSON
```

Rejects post-decode if `info.width < 1200` (a friendly "túl kicsi a kép — legalább 1200 px széles legyen" error).

### 5.4 Atomic swap

```ts
const id = crypto.randomUUID();
const staging = path.join(DATA_DIR, `photos.staging-${id}`);
await fs.mkdir(staging, { recursive: true });

// ... write all 5 .webp + .json files into staging ...

const live = path.join(DATA_DIR, "photos");
const archive = path.join(DATA_DIR, `photos.old-${id}`);
try {
  await fs.rename(live, archive);
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
await fs.rename(staging, live);
await fs.rm(archive, { recursive: true, force: true });
```

On any failure pre-final-rename: `rm -rf staging`, live untouched.

### 5.5 Serving photos (`app/photos/[name]/route.ts`)

```ts
const SAFE_NAME = /^[a-zA-Z0-9_-]+\.webp$/;

export async function GET(_: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!SAFE_NAME.test(name)) return new Response(null, { status: 400 });
  try {
    const fh = await fs.open(path.join(PHOTOS_DIR, name), "r");
    return new Response(fh.readableWebStream() as unknown as ReadableStream, {
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

Photo URLs are content-addressed (`/photos/<uuid>.webp`) so `immutable` is safe.

### 5.6 Gallery component consumption

`<Gallery photos={site.gallery} />`:

- Drops the static `import photo38 from "../photos/..."` imports.
- Renders `<Image src={`/photos/${p.id}.webp`} width={p.width} height={p.height} placeholder="blur" blurDataURL={p.blurDataURL} alt={p.alt} ... />`.
- The polaroid CSS / pin / tape / shutter effects stay unchanged.

### 5.7 First-boot fallback

If `/data/photos/` is empty or missing, `DEFAULT_SITE.gallery` references the existing static-imported originals at `/photos/*.jpg`. The repo's `/photos/` directory stays as the seed source. First admin save writes to `/data/photos/` and the volume takes over.

## 6. Dependencies

| Package                | Purpose                          | Already installed |
|------------------------|----------------------------------|-------------------|
| `next` ≥ `15.2.3`      | Middleware-bypass fix (CVE)      | needs bump from 15.1.6 |
| `zod`                  | Schema validation                | new (~8 KB gz)    |
| `sharp`                | Image processing + blur          | yes               |
| `@dnd-kit/core`        | Drag-reorder                     | new               |
| `@dnd-kit/sortable`    | Sortable wrapper                 | new               |
| `react-dropzone`       | File picker UX                   | new               |
| `motion`               | (Existing; unused by admin)      | yes               |

Explicitly NOT used: NextAuth / Lucia / Iron Session (custom 50-line session is sufficient and avoids vendor coupling), no UI library (CSS modules match existing convention), no Tailwind, no rate-limit lib (Map-based limiter).

## 7. Admin UX

### 7.1 Layout

Single scrolling page with sticky top header (logo, "View live ↗", "Logout") and sticky left rail on desktop (collapses to a top dropdown jumper on mobile). Five sections:

1. **Oldal alapok** — title, description (textarea), slogan, email, address fields. Action: `saveMetaAction`.
2. **Galéria** — dropzone + 5 sortable tiles. Action: `POST /admin/api/gallery`.
3. **Nyitvatartás** — 7 day rows with `<input type="time">` × 2 + "Zárva" checkbox. Action: `saveHoursAction`.
4. **Ünnepek** — list of exception cards + "+ Új kivétel". Action: `saveExceptionsAction`.
5. (No separate Kapcsolat section in v1 — email/address are part of Oldal alapok.)

### 7.2 Save model

- **Per-section save buttons** — disabled when clean, primary-pink when dirty.
- **Sticky bottom bar** — appears only when any section is dirty. Lists which sections need saving + a single "Mentés mindet" button that submits each in sequence.
- **Inline timestamp** — "Mentve 12:34" next to each section title; updates on save.
- **Toast** — bottom-right "Mentve — [Megnyitás ↗]" linking to `/`.
- **Navigation guard** — `useBeforeUnload(anyDirty)` blocks tab close/nav while dirty.
- **Error display** — red inline banner in the section + per-field highlight on validation failures.

### 7.3 Field-by-field

**Time inputs**: native `<input type="time">` — gives the iOS/Android wheel picker for free, 24h Hungarian default.

**Date inputs** (exceptions): native `<input type="date">`.

**Gallery thumbnails**: rendered at the real polaroid look (tape/pin shown) so the admin shows the final visual outcome inline. Reorder via dnd-kit (long-press on touch).

**Exceptions**: cards with inline edit (no modal). "+ Új kivétel" appends a new card in edit mode. Trash icon = inline confirm ("Biztos törlöd?" with [Igen] [Mégse]).

### 7.4 Styling

- CSS modules to match the existing site (`admin.module.css` per section).
- Inherits site palette (cream `#F4ECDC`, pink/red accents, Seasons + Drugs fonts).
- Mobile-first; desktop layout is the same single page widened to 2 columns of cards.
- All copy in Hungarian; tone matches the site (warm, light).
- `aria-live="polite"` on toast region; real `<label for>` on every input.

## 8. Type-safety + validation summary

- **At write boundary**: `SiteSchema.parse(next)` in `saveSite` and `SiteSchema.parse(metaUpdate)` in each server action. Throws → returned as 400 with field errors.
- **At read boundary**: `SiteSchema.safeParse(JSON.parse(raw))` in `getSite`. Failure → fallback to `DEFAULT_SITE` + logged error.
- **Inside the app**: everything is `Site` (the inferred TS type). No `any`, no `unknown` past the boundary.

## 9. Testing strategy

Pure functions are unit tests; everything else is integration:

- **Unit (vitest or node:test)**:
  - `hours.ts`: snapshot `toOpeningHoursSpecification`, `toHumanGroups`, `statusAt` against fixture schemas covering: standard week, all-closed week, every-day-open, exception today (closed), exception today (custom), exception tomorrow.
  - `jsonld.ts`: snapshot `buildStoreJsonLd` output against the current hardcoded JSON-LD shape (regression guard).
  - `session.ts`: round-trip sign → verify; tampered token rejected; expired token rejected.
  - `safeEq.ts`: equal returns true, unequal returns false, different-length returns false without throwing.

- **Integration**:
  - `getSite()` / `saveSite()` round-trip via a temp dir.
  - Atomic write: kill the process between staging and rename → live file untouched.
  - Photo upload route end-to-end with a fixture image.
  - Login → access `/admin` → logout → blocked from `/admin`.

## 10. Migration / rollout

Single rollout, no migration window:

1. Implement all of the above on a branch.
2. Seed `DEFAULT_SITE` from the current hardcoded values (title, description, slogan, address, current 5 photos as static-imported originals, current opening hours).
3. Deploy with the volume mounted but empty → `DEFAULT_SITE` serves traffic identically to today.
4. Owner logs into `/admin`, optionally saves once to materialize `/data/site.json`.
5. Subsequent edits are live within a single revalidation.

Rollback path: revert the branch, `/data` is ignored, site goes back to hardcoded values.

## 11. Open questions deferred to implementation

These are not blockers; the implementation plan can resolve them with small experiments:

- Exact Hungarian copy for error messages and labels (owner can suggest tweaks).
- Whether sharp's HEIC decode works on the Alpine-musl base image — if not, switch base to `node:22-slim` or add a libheif install layer. Confirm in the build phase.
- Bottom sticky bar UX on mobile when the keyboard is open — measure during implementation.
- Whether to show the brands list (read-only) somewhere in the admin so the owner can see what JSON-LD claims to carry. Pure addition if asked for.

## 12. Out-of-scope explicitly noted

- Multi-tenant / multi-store
- Analytics on admin usage
- Audit log of who changed what (single user, no need)
- Backup automation (Coolify volume snapshots cover this externally)
- A/B testing of metadata
- Search engine reindex pings (Google picks up the changes within hours via the unchanged sitemap.xml)

## 13. Success criteria

- Owner can change opening hours and see them reflect on the live site within one revalidation cycle, with `useOpenStatus`, `FindUs.tsx` schedule, and JSON-LD `openingHoursSpecification` all in sync.
- Owner can upload a new gallery photo from her phone, see it appear on the live site within one revalidation cycle.
- A malformed `site.json` cannot 500 the public site.
- `/admin/*` is inaccessible without a valid session, including via middleware-bypass attempts.
- All edits survive a redeploy (volume persistence).
- Page-Speed, LCP, and CLS on `/` are unchanged or better vs. current build (gallery uses content-addressed cached WebP).
