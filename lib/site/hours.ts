import type { Site, DayKey } from "./schema";
import { DAY_KEYS } from "./schema";

const DAY_OF_WEEK: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export type JsonLdHours = {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string;
  opens: string;
  closes: string;
};

export function toOpeningHoursSpecification(site: Site): JsonLdHours[] {
  return DAY_KEYS
    .filter((k) => !site.hours[k].closed)
    .map((k) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_OF_WEEK[k],
      opens: site.hours[k].opens,
      closes: site.hours[k].closes,
    }));
}
