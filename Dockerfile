# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /app
# `corepack enable` only installs shims — the package manager itself is fetched
# lazily on first use, and corepack's bootstrap fetch has no retry (10s connect
# timeout). Every stage branching off base has its own cache layer, so pnpm was
# downloaded once per stage and a single network blip in the second one failed
# the whole build. Materialising it here means deps and builder inherit it.
# `corepack install` takes the version from package.json's packageManager field.
COPY package.json ./
RUN corepack enable && corepack install

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
