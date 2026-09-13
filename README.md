# nyári lúd

Landing site for [nyarilud.hu](https://nyarilud.hu), a premium preloved boutique on Pozsonyi út in Budapest's Újlipótváros.

## What it is

One page: hero, gallery, opening hours with a live open/closed state, and a hand-drawn map to the door. Hungarian, with a goose.

The shop sells second-hand clothes described as pieces that "have already lived one life and now wait for a new story", so the design leans illustrated and warm rather than the usual e-commerce grid. Ribbons, stripes, a wordmark that draws itself, a hand-drawn map component instead of an embedded Google frame.

There is no cart. The site exists to get you through the door during opening hours.

## The admin panel

Dóra runs the shop and needed to change hours, holiday closures and gallery photos without me. `/admin` does that:

- **Oldal**: copy and metadata
- **Nyitvatartás**: weekly hours
- **Ünnepek**: holiday exceptions that override the weekly pattern
- **Galéria**: drag-and-drop upload, drag-to-reorder, one to five photos with an inline slot picker

Auth is a single username and password from the environment, checked in constant time, behind a rate limiter. No user table, because there is one user.

Uploaded photos go through sharp, which emits WebP plus a blur placeholder, then swap into place atomically via a staging directory and an archive. A failed upload leaves the live gallery untouched.

Content lives in `/data/site.json` and `/data/photos/`, written through the admin and validated with zod on the way in. Never edit the JSON by hand.

## Dev

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

For admin access locally:

```bash
cp .env.example .env.local
# set ADMIN_USER and ADMIN_PASSWORD, then:
SESSION_SECRET=$(openssl rand -hex 32)
# add SESSION_SECRET to .env.local
pnpm dev
```

Then visit http://localhost:3000/admin/login.

## Test

```bash
pnpm test
```

Vitest. Coverage sits on the parts where a bug costs something: session handling, the constant-time comparison, the rate limiter, the atomic file swap, hours arithmetic, photo processing and schema validation.

## Build and deploy

`pnpm build` produces a standalone Next.js bundle. The Dockerfile declares a `/data` volume. **Mount it** in Coolify or docker-compose or every admin edit disappears on redeploy.

### Required env vars in production

| var | purpose |
|-----|---------|
| `ADMIN_USER` | admin login username |
| `ADMIN_PASSWORD` | admin login password |
| `SESSION_SECRET` | 64-char hex, 32 random bytes: `openssl rand -hex 32` |
| `SITE_DATA_DIR` | optional, overrides the default `/data` |

## Stack

Next.js 15 (App Router), TypeScript, sharp, zod, dnd-kit, Vitest. CSS Modules, self-hosted fonts in `fonts/`.

## Not built yet

[`docs/specification/2026-05-20_plan.md`](docs/specification/2026-05-20_plan.md) sketches pulling opening hours straight from the Google Business Profile via the Places API, so Dóra updates hours in one place instead of two. Drafted, never implemented. The admin panel does the job.

## License

Code is MIT. Photography, copy and the nyári lúd name belong to the boutique.
