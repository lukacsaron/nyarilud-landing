/**
 * Publication logos that ship with the site, keyed by their filename under
 * `public/press/`.
 *
 * A press entry's `logo` field must match one of these keys; anything else
 * falls back to the outlet name set as a wordmark, which is a deliberate
 * design, not a broken state. Press entries themselves are admin-editable and
 * need no deploy — only a *new outlet logo* does: drop the file in
 * `public/press/` and add one line here.
 */
export const PRESS_LOGOS = {
  "welovebudapest.png": { label: "We Love Budapest", width: 447, height: 447 },
} as const;

export type PressLogoFile = keyof typeof PRESS_LOGOS;

export function isKnownLogo(file: string | undefined): file is PressLogoFile {
  return file !== undefined && Object.prototype.hasOwnProperty.call(PRESS_LOGOS, file);
}

/** Options for the admin logo picker. */
export const PRESS_LOGO_OPTIONS: readonly { file: PressLogoFile; label: string }[] =
  (Object.keys(PRESS_LOGOS) as PressLogoFile[]).map((file) => ({
    file,
    label: PRESS_LOGOS[file].label,
  }));

/** `2026-09-16` → `2026. 09. 16.` — Hungarian numeric date, no ICU dependency. */
export function huDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}. ${m}. ${d}.`;
}
