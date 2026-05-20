import path from "path";

function resolveDataDir(): string {
  if (process.env.SITE_DATA_DIR) return process.env.SITE_DATA_DIR;
  if (process.env.NODE_ENV === "production") return "/data";
  return path.join(process.cwd(), ".data");
}

export const DATA_DIR = resolveDataDir();
export const SITE_JSON_PATH = path.join(DATA_DIR, "site.json");
export const PHOTOS_DIR = path.join(DATA_DIR, "photos");
