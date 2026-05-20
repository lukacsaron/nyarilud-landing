import { describe, it, expect } from "vitest";
import { DEFAULT_SITE } from "./schema";
import { toOpeningHoursSpecification } from "./hours";

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
