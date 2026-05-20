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
