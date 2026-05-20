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
