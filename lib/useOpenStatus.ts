"use client";

import { useEffect, useState } from "react";

export type OpenStatus =
  | { open: true }
  | { open: false; nextDayLabel: string | null; nextHour: number };

const OPENING_HOUR = 10;
const closingHourFor = (day: number) => (day === 5 ? 18 : 15);
const isOpenDay = (day: number) =>
  day === 2 || day === 3 || day === 4 || day === 5 || day === 6;

const DAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};
const DAY_NAMES = [
  "vasárnap",
  "hétfőn",
  "kedden",
  "szerdán",
  "csütörtökön",
  "pénteken",
  "szombaton",
];

function computeStatus(): OpenStatus {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Budapest",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const weekdayShort = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
  const hour = parseInt(hourStr, 10) % 24;
  const day = DAY_MAP[weekdayShort] ?? 0;

  if (isOpenDay(day) && hour >= OPENING_HOUR && hour < closingHourFor(day)) {
    return { open: true };
  }
  if (isOpenDay(day) && hour < OPENING_HOUR) {
    return { open: false, nextDayLabel: "ma", nextHour: OPENING_HOUR };
  }
  let next = (day + 1) % 7;
  while (!isOpenDay(next)) next = (next + 1) % 7;
  return { open: false, nextDayLabel: DAY_NAMES[next], nextHour: OPENING_HOUR };
}

export function useOpenStatus(): OpenStatus | null {
  const [status, setStatus] = useState<OpenStatus | null>(null);

  useEffect(() => {
    setStatus(computeStatus());
    const id = setInterval(() => setStatus(computeStatus()), 60_000);
    return () => clearInterval(id);
  }, []);

  return status;
}
