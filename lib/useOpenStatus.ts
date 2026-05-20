"use client";

import { useEffect, useState } from "react";
import type { Site } from "@/lib/site/schema";
import { statusAt, type OpenStatus } from "@/lib/site/hours";

export type { OpenStatus };

export function useOpenStatus(site: Site): OpenStatus | null {
  const [status, setStatus] = useState<OpenStatus | null>(null);

  useEffect(() => {
    setStatus(statusAt(site, new Date()));
    const id = setInterval(() => setStatus(statusAt(site, new Date())), 60_000);
    return () => clearInterval(id);
  }, [site]);

  return status;
}
