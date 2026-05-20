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
