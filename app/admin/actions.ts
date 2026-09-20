"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getSite } from "@/lib/site/getSite";
import { saveSite } from "@/lib/site/saveSite";
import { SiteSchema, type Site } from "@/lib/site/schema";

export type SaveResult = { ok: true } | { ok: false; error: string };

async function saveMutation(mutate: (current: Site) => Site): Promise<SaveResult> {
  await requireAdmin();
  const current = await getSite();
  const next = mutate(current);
  const parsed = SiteSchema.safeParse(next);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  await saveSite(parsed.data);
  return { ok: true };
}

export async function saveMetaAction(input: {
  title: string;
  description: string;
  slogan: string;
  email: string;
  streetAddress: string;
  addressLocality: string;
  postalCode: string;
  neighborhood: string;
}): Promise<SaveResult> {
  return saveMutation((current) => ({
    ...current,
    meta: {
      title: input.title,
      description: input.description,
      slogan: input.slogan,
    },
    contact: {
      email: input.email,
      address: {
        streetAddress: input.streetAddress,
        addressLocality: input.addressLocality,
        postalCode: input.postalCode,
        neighborhood: input.neighborhood,
      },
    },
  }));
}

export async function saveHoursAction(input: Site["hours"]): Promise<SaveResult> {
  return saveMutation((current) => ({ ...current, hours: input }));
}

export async function saveExceptionsAction(input: Site["exceptions"]): Promise<SaveResult> {
  return saveMutation((current) => ({ ...current, exceptions: input }));
}

export async function savePressAction(input: Site["press"]): Promise<SaveResult> {
  return saveMutation((current) => ({ ...current, press: input }));
}
