import { describe, it, expect } from "vitest";
import { DEFAULT_SITE } from "./schema";
import { toOpeningHoursSpecification } from "./hours";
import { toHumanGroups } from "./hours";

describe("toOpeningHoursSpecification", () => {
  it("emits one entry per open day with matching times", () => {
    const spec = toOpeningHoursSpecification(DEFAULT_SITE);
    expect(spec).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Tuesday",   opens: "10:00", closes: "15:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Wednesday", opens: "10:00", closes: "15:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Thursday",  opens: "10:00", closes: "15:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Friday",    opens: "10:00", closes: "18:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday",  opens: "10:00", closes: "15:00" },
    ]);
  });

  it("emits no entries when all days are closed", () => {
    const allClosed = {
      ...DEFAULT_SITE,
      hours: Object.fromEntries(
        Object.keys(DEFAULT_SITE.hours).map((k) => [k, { closed: true, opens: "10:00", closes: "15:00" }])
      ) as typeof DEFAULT_SITE.hours,
    };
    expect(toOpeningHoursSpecification(allClosed)).toEqual([]);
  });
});

describe("toHumanGroups", () => {
  it("groups DEFAULT_SITE into Hungarian day ranges", () => {
    expect(toHumanGroups(DEFAULT_SITE)).toEqual([
      { label: "Kedd–Csüt, Szo", time: "10 — 15", muted: false },
      { label: "Péntek",         time: "10 — 18", muted: false },
      { label: "Vasárnap, Hétfő", time: "ZÁRVA",  muted: true  },
    ]);
  });

  it("regroups when a previously open day becomes closed", () => {
    const wedClosed = {
      ...DEFAULT_SITE,
      hours: { ...DEFAULT_SITE.hours, wed: { closed: true, opens: "10:00", closes: "15:00" } },
    };
    const groups = toHumanGroups(wedClosed);
    expect(groups[0]).toEqual({ label: "Kedd, Csüt, Szo", time: "10 — 15", muted: false });
  });

  it("collapses an all-closed week into a single 'ZÁRVA' row", () => {
    const allClosed = {
      ...DEFAULT_SITE,
      hours: Object.fromEntries(
        Object.keys(DEFAULT_SITE.hours).map((k) => [k, { closed: true, opens: "10:00", closes: "15:00" }])
      ) as typeof DEFAULT_SITE.hours,
    };
    expect(toHumanGroups(allClosed)).toEqual([
      { label: "Hét–Vas", time: "ZÁRVA", muted: true },
    ]);
  });
});
