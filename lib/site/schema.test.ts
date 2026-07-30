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

  it("accepts a gallery with 1 photo", () => {
    const ok = { ...DEFAULT_SITE, gallery: DEFAULT_SITE.gallery.slice(0, 1) };
    expect(SiteSchema.safeParse(ok).success).toBe(true);
  });

  it("accepts a gallery with 4 photos", () => {
    const ok = { ...DEFAULT_SITE, gallery: DEFAULT_SITE.gallery.slice(0, 4) };
    expect(SiteSchema.safeParse(ok).success).toBe(true);
  });

  it("rejects an empty gallery", () => {
    const bad = { ...DEFAULT_SITE, gallery: [] };
    expect(SiteSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a gallery with more than 5 photos", () => {
    const bad = {
      ...DEFAULT_SITE,
      gallery: [...DEFAULT_SITE.gallery, { ...DEFAULT_SITE.gallery[0] }],
    };
    expect(SiteSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts an exception in closed mode without opens/closes", () => {
    const ok = {
      ...DEFAULT_SITE,
      exceptions: [{ date: "2026-12-24", label: "Karácsony", mode: "closed" }],
    };
    expect(SiteSchema.safeParse(ok).success).toBe(true);
  });

  it("rejects a gallery with duplicate slot values", () => {
    const dup = {
      ...DEFAULT_SITE,
      gallery: [
        { ...DEFAULT_SITE.gallery[0] },
        { ...DEFAULT_SITE.gallery[1], slot: 1 as const }, // duplicate slot
        { ...DEFAULT_SITE.gallery[2] },
        { ...DEFAULT_SITE.gallery[3] },
        { ...DEFAULT_SITE.gallery[4] },
      ],
    };
    expect(SiteSchema.safeParse(dup).success).toBe(false);
  });

  it("rejects invalid time values like 25:99 or 00:60", () => {
    const bad = {
      ...DEFAULT_SITE,
      hours: { ...DEFAULT_SITE.hours, fri: { closed: false, opens: "25:99", closes: "18:00" } },
    };
    expect(SiteSchema.safeParse(bad).success).toBe(false);

    const bad2 = {
      ...DEFAULT_SITE,
      hours: { ...DEFAULT_SITE.hours, fri: { closed: false, opens: "10:00", closes: "00:60" } },
    };
    expect(SiteSchema.safeParse(bad2).success).toBe(false);

    const good = {
      ...DEFAULT_SITE,
      hours: { ...DEFAULT_SITE.hours, fri: { closed: false, opens: "23:59", closes: "00:00" } },
    };
    // "23:59" and "00:00" are both valid times (the schema doesn't enforce open < close)
    expect(SiteSchema.safeParse(good).success).toBe(true);
  });
});
