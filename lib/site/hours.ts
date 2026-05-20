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

const DAY_LABEL_HU: Record<DayKey, string> = {
  mon: "Hét",
  tue: "Kedd",
  wed: "Szer",
  thu: "Csüt",
  fri: "Péntek",
  sat: "Szo",
  sun: "Vas",
};
const DAY_LABEL_HU_LONG: Record<DayKey, string> = {
  mon: "Hétfő",
  tue: "Kedd",
  wed: "Szerda",
  thu: "Csütörtök",
  fri: "Péntek",
  sat: "Szombat",
  sun: "Vasárnap",
};

export type HoursGroup = { label: string; time: string; muted: boolean };

type SignatureRun = { keys: DayKey[]; sig: string; closed: boolean; opens: string; closes: string };

function sigOf(day: { closed: boolean; opens: string; closes: string }): string {
  return day.closed ? "CLOSED" : `${day.opens}-${day.closes}`;
}

// Cyclic consecutiveness on the 7-day week.
function cyclicallyConsecutive(a: DayKey, b: DayKey): boolean {
  const i = DAY_KEYS.indexOf(a);
  const j = DAY_KEYS.indexOf(b);
  return ((j - i + 7) % 7) === 1;
}

function groupRuns(site: Site): SignatureRun[] {
  const runs: SignatureRun[] = [];
  for (const k of DAY_KEYS) {
    const d = site.hours[k];
    const sig = sigOf(d);
    const last = runs[runs.length - 1];
    if (last && last.sig === sig && cyclicallyConsecutive(last.keys[last.keys.length - 1], k)) {
      last.keys.push(k);
    } else {
      runs.push({ keys: [k], sig, closed: d.closed, opens: d.opens, closes: d.closes });
    }
  }
  // Wrap-around merge: if first and last runs share a signature and are cyclically adjacent.
  if (runs.length > 1) {
    const first = runs[0];
    const last = runs[runs.length - 1];
    if (first.sig === last.sig
        && cyclicallyConsecutive(last.keys[last.keys.length - 1], first.keys[0])) {
      last.keys.push(...first.keys);
      runs.shift();
    }
  }
  return runs;
}

// Split a sequence of DayKeys into maximal cyclically-consecutive sub-runs,
// preserving the order they appear in the input.
function subRuns(keys: DayKey[]): DayKey[][] {
  if (keys.length === 0) return [];
  const out: DayKey[][] = [[keys[0]]];
  for (let i = 1; i < keys.length; i++) {
    const prev = out[out.length - 1][out[out.length - 1].length - 1];
    if (cyclicallyConsecutive(prev, keys[i])) {
      out[out.length - 1].push(keys[i]);
    } else {
      out.push([keys[i]]);
    }
  }
  return out;
}

function labelOneRun(run: DayKey[], shortStyle: boolean): string {
  if (run.length === 1) {
    return (shortStyle ? DAY_LABEL_HU : DAY_LABEL_HU_LONG)[run[0]];
  }
  if (run.length === 2) {
    const m = shortStyle ? DAY_LABEL_HU : DAY_LABEL_HU_LONG;
    return `${m[run[0]]}, ${m[run[1]]}`;
  }
  // 3+ → range with short labels
  return `${DAY_LABEL_HU[run[0]]}–${DAY_LABEL_HU[run[run.length - 1]]}`;
}

function labelKeys(keys: DayKey[]): string {
  const subs = subRuns(keys);
  if (subs.length === 1) {
    return labelOneRun(subs[0], /* shortStyle */ false);
  }
  // Multiple sub-runs → short labels everywhere.
  return subs.map((s) => labelOneRun(s, /* shortStyle */ true)).join(", ");
}

function compositeLabel(runs: SignatureRun[]): HoursGroup[] {
  const bySig = new Map<string, SignatureRun[]>();
  for (const r of runs) {
    const arr = bySig.get(r.sig) ?? [];
    arr.push(r);
    bySig.set(r.sig, arr);
  }
  const seen = new Set<string>();
  const ordered: HoursGroup[] = [];
  for (const r of runs) {
    if (seen.has(r.sig)) continue;
    seen.add(r.sig);
    const all = bySig.get(r.sig)!;
    const mergedKeys = all.flatMap((x) => x.keys);
    ordered.push({
      label: labelKeys(mergedKeys),
      time: r.closed ? "ZÁRVA" : `${parseInt(r.opens, 10)} — ${parseInt(r.closes, 10)}`,
      muted: r.closed,
    });
  }
  return ordered;
}

export function toHumanGroups(site: Site): HoursGroup[] {
  return compositeLabel(groupRuns(site));
}

export type OpenStatus =
  | { open: true }
  | { open: false; nextDayLabel: string | null; nextHour: number };

const NEXT_DAY_HU: Record<DayKey, string> = {
  mon: "hétfőn",
  tue: "kedden",
  wed: "szerdán",
  thu: "csütörtökön",
  fri: "pénteken",
  sat: "szombaton",
  sun: "vasárnap",
};

function budapestParts(now: Date): { dayKey: DayKey; isoDate: string; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Budapest",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const weekdayShortToKey: Record<string, DayKey> = {
    Sun: "sun", Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat",
  };
  return {
    dayKey: weekdayShortToKey[parts.weekday],
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    hour: parseInt(parts.hour, 10) % 24,
    minute: parseInt(parts.minute, 10),
  };
}

function parseHHMM(s: string): { h: number; m: number } {
  return { h: parseInt(s.slice(0, 2), 10), m: parseInt(s.slice(3, 5), 10) };
}

function effectiveHoursToday(site: Site, isoDate: string, dayKey: DayKey):
  | { closed: true }
  | { closed: false; opens: string; closes: string } {
  const ex = site.exceptions.find((e) => e.date === isoDate);
  if (ex) {
    if (ex.mode === "closed") return { closed: true };
    return { closed: false, opens: ex.opens!, closes: ex.closes! };
  }
  const d = site.hours[dayKey];
  return d.closed ? { closed: true } : { closed: false, opens: d.opens, closes: d.closes };
}

function findNextOpening(site: Site, fromKey: DayKey): { nextDayLabel: string | null; nextHour: number } {
  for (let i = 1; i <= 7; i++) {
    const k = DAY_KEYS[(DAY_KEYS.indexOf(fromKey) + i) % 7];
    const d = site.hours[k];
    if (!d.closed) {
      return { nextDayLabel: NEXT_DAY_HU[k], nextHour: parseHHMM(d.opens).h };
    }
  }
  return { nextDayLabel: null, nextHour: 10 };
}

export function statusAt(site: Site, now: Date): OpenStatus {
  const { dayKey, isoDate, hour, minute } = budapestParts(now);
  const today = effectiveHoursToday(site, isoDate, dayKey);
  if (!today.closed) {
    const o = parseHHMM(today.opens);
    const c = parseHHMM(today.closes);
    const nowMin = hour * 60 + minute;
    const openMin = o.h * 60 + o.m;
    const closeMin = c.h * 60 + c.m;
    if (nowMin >= openMin && nowMin < closeMin) return { open: true };
    if (nowMin < openMin) return { open: false, nextDayLabel: "ma", nextHour: o.h };
  }
  return { open: false, ...findNextOpening(site, dayKey) };
}

export function todaysExceptionBanner(site: Site, now: Date): string | null {
  const { isoDate } = budapestParts(now);
  const ex = site.exceptions.find((e) => e.date === isoDate);
  if (!ex) return null;
  const labelPrefix = ex.label ? `${ex.label} — ` : "";
  if (ex.mode === "closed") return `${labelPrefix}ma ZÁRVA`;
  return `${labelPrefix}ma ${parseInt(ex.opens!, 10)} — ${parseInt(ex.closes!, 10)}`;
}
