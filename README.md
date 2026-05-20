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
# fill in ADMIN_USER, ADMIN_PASSWORD, then:
SESSION_SECRET=$(openssl rand -hex 32)
# add SESSION_SECRET to .env.local
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
| `SESSION_SECRET`  | 64-char hex (32 random bytes) — generate with `openssl rand -hex 32` |
| `SITE_DATA_DIR`   | (optional) overrides the default `/data` path    |

## Editing content

All editable content lives in `/data/site.json` plus `/data/photos/`. Edit via `/admin` — never edit the JSON directly.
