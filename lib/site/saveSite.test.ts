import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { writeSiteToDisk } from "./saveSite";
import { DEFAULT_SITE } from "./schema";

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "savesite-"));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe("saveSite", () => {
  it("calls revalidateTag('site') and revalidatePath('/', 'layout')", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "savesite-wrapper-"));
    const prevDataDir = process.env.SITE_DATA_DIR;
    process.env.SITE_DATA_DIR = tmp;
    try {
      vi.resetModules();
      const { saveSite: saveSiteFn } = await import("./saveSite");
      const cache = await import("next/cache");

      await saveSiteFn(DEFAULT_SITE);

      expect((cache.revalidateTag as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith("site");
      expect((cache.revalidatePath as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith("/", "layout");
    } finally {
      if (prevDataDir === undefined) delete process.env.SITE_DATA_DIR;
      else process.env.SITE_DATA_DIR = prevDataDir;
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});

describe("writeSiteToDisk", () => {
  it("validates with zod then writes atomically", async () => {
    const target = path.join(dir, "site.json");
    const next = { ...DEFAULT_SITE, meta: { ...DEFAULT_SITE.meta, title: "Mentve" } };
    await writeSiteToDisk(target, next);
    const raw = await fs.readFile(target, "utf8");
    expect(JSON.parse(raw).meta.title).toBe("Mentve");
  });

  it("throws on invalid input and leaves disk untouched", async () => {
    const target = path.join(dir, "site.json");
    await fs.writeFile(target, JSON.stringify(DEFAULT_SITE));
    const bad = { ...DEFAULT_SITE, meta: { title: "", description: "", slogan: "" } };
    await expect(writeSiteToDisk(target, bad as never)).rejects.toThrow();
    const after = JSON.parse(await fs.readFile(target, "utf8"));
    expect(after.meta.title).toBe(DEFAULT_SITE.meta.title);
  });
});
