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

describe("SiteSchema — press", () => {
  const validItem = {
    id: "wlb-2026-09",
    outlet: "We Love Budapest",
    title: "Igazi kincsesbánya nyílt Újlipótvárosban",
    quote: "A Nyári Lúd nem egy tipikus turkáló.",
    url: "https://welovebudapest.com/cikk/2026/09/16/nyari-lud/",
    date: "2026-09-16",
    author: "Gedeon Lili",
    logo: "welovebudapest.png",
  };

  it("defaults press to [] when the key is absent (live site.json back-compat)", () => {
    const { press: _omitted, ...withoutPress } = DEFAULT_SITE;
    const result = SiteSchema.safeParse(withoutPress);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.press).toEqual([]);
  });

  it("accepts a fully populated press item", () => {
    expect(SiteSchema.safeParse({ ...DEFAULT_SITE, press: [validItem] }).success).toBe(true);
  });

  it("accepts a press item without the optional fields", () => {
    const minimal = {
      id: validItem.id,
      outlet: validItem.outlet,
      title: validItem.title,
      url: validItem.url,
      date: validItem.date,
    };
    expect(SiteSchema.safeParse({ ...DEFAULT_SITE, press: [minimal] }).success).toBe(true);
  });

  it("rejects a press item with a non-url link", () => {
    const bad = { ...DEFAULT_SITE, press: [{ ...validItem, url: "welovebudapest.com" }] };
    expect(SiteSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a press item with a malformed date", () => {
    const bad = { ...DEFAULT_SITE, press: [{ ...validItem, date: "2026.09.16" }] };
    expect(SiteSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a press item with an empty outlet or title", () => {
    expect(SiteSchema.safeParse({ ...DEFAULT_SITE, press: [{ ...validItem, outlet: "" }] }).success).toBe(false);
    expect(SiteSchema.safeParse({ ...DEFAULT_SITE, press: [{ ...validItem, title: "" }] }).success).toBe(false);
  });

  it("rejects more than 8 press items", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ ...validItem, id: `p-${i}` }));
    expect(SiteSchema.safeParse({ ...DEFAULT_SITE, press: many }).success).toBe(false);
  });

  it("rejects duplicate press ids", () => {
    const dup = { ...DEFAULT_SITE, press: [validItem, { ...validItem, title: "Másik cím" }] };
    expect(SiteSchema.safeParse(dup).success).toBe(false);
  });
});
