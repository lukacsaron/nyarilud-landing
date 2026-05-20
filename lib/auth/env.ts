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
