import { revalidatePath, revalidateTag } from "next/cache";
import { SiteSchema, type Site } from "./schema";
import { atomicWriteJson } from "./atomic";
import { SITE_JSON_PATH } from "./paths";

export async function writeSiteToDisk(filePath: string, next: Site): Promise<void> {
  const validated = SiteSchema.parse(next);
  await atomicWriteJson(filePath, validated);
}

export async function saveSite(next: Site): Promise<void> {
  await writeSiteToDisk(SITE_JSON_PATH, next);
  revalidateTag("site");
  revalidatePath("/", "layout");
}
