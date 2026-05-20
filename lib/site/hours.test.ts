import { describe, it, expect } from "vitest";
import { DEFAULT_SITE } from "./schema";
import { toOpeningHoursSpecification } from "./hours";
import { toHumanGroups } from "./hours";
import { statusAt, todaysExceptionBanner } from "./hours";

function at(iso: string): Date { return new Date(iso); }

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

describe("statusAt", () => {
  it("reports open during a weekday's regular hours", () => {
    // Friday 2026-05-22 at 11:00 Budapest = 09:00 UTC
    expect(statusAt(DEFAULT_SITE, at("2026-05-22T09:00:00Z"))).toEqual({ open: true });
  });

  it("reports closed before opening with nextDayLabel 'ma'", () => {
    // Tuesday 2026-05-19 at 08:00 Budapest = 06:00 UTC
    expect(statusAt(DEFAULT_SITE, at("2026-05-19T06:00:00Z"))).toEqual({
      open: false, nextDayLabel: "ma", nextHour: 10,
    });
  });

  it("reports closed after hours, points to next open day", () => {
    // Saturday 2026-05-23 at 16:00 Budapest (closes 15:00) → next open is Tuesday "kedden"
    expect(statusAt(DEFAULT_SITE, at("2026-05-23T14:00:00Z"))).toEqual({
      open: false, nextDayLabel: "kedden", nextHour: 10,
    });
  });

  it("respects a 'closed' exception for today", () => {
    const site = {
      ...DEFAULT_SITE,
      exceptions: [{ date: "2026-05-22", mode: "closed" as const, label: "Karácsony" }],
    };
    // Friday 11:00 — would be open, but exception closes it
    expect(statusAt(site, at("2026-05-22T09:00:00Z")).open).toBe(false);
  });

  it("respects a 'custom' exception for today", () => {
    const site = {
      ...DEFAULT_SITE,
      exceptions: [{ date: "2026-05-22", mode: "custom" as const, opens: "12:00", closes: "14:00" }],
    };
    // 11:00 → still closed
    expect(statusAt(site, at("2026-05-22T09:00:00Z")).open).toBe(false);
    // 13:00 → open
    expect(statusAt(site, at("2026-05-22T11:00:00Z")).open).toBe(true);
  });
});

describe("todaysExceptionBanner", () => {
  it("returns null when no exception today", () => {
    expect(todaysExceptionBanner(DEFAULT_SITE, at("2026-05-22T09:00:00Z"))).toBeNull();
  });

  it("returns the label + 'ma zárva' for a labeled closed exception today", () => {
    const site = {
      ...DEFAULT_SITE,
      exceptions: [{ date: "2026-05-22", mode: "closed" as const, label: "Karácsony" }],
    };
    expect(todaysExceptionBanner(site, at("2026-05-22T09:00:00Z"))).toBe("Karácsony — ma ZÁRVA");
  });
});
