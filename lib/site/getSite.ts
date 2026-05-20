import { promises as fs } from "fs";
import { unstable_cache } from "next/cache";
import { SiteSchema, DEFAULT_SITE, type Site } from "./schema";
import { SITE_JSON_PATH } from "./paths";

export async function readSiteFromDisk(filePath: string): Promise<Site> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return DEFAULT_SITE;
    console.error("[site.json] read error, falling back to defaults", err);
    return DEFAULT_SITE;
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (err) {
    console.error("[site.json] JSON parse error, falling back to defaults", err);
    return DEFAULT_SITE;
  }
  const result = SiteSchema.safeParse(parsedJson);
  if (!result.success) {
    console.error("[site.json] schema invalid, falling back to defaults", result.error.flatten());
    return DEFAULT_SITE;
  }
  return result.data;
}

export const getSite = unstable_cache(
  () => readSiteFromDisk(SITE_JSON_PATH),
  ["site"],
  { tags: ["site"] }
);
