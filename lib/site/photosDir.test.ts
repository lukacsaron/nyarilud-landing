import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { swapPhotosDir } from "./photosDir";

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "photosdir-"));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

async function fileExists(p: string) {
  try { await fs.access(p); return true; } catch { return false; }
}

describe("swapPhotosDir", () => {
  it("replaces an existing photos dir atomically", async () => {
    const live = path.join(root, "photos");
    await fs.mkdir(live, { recursive: true });
    await fs.writeFile(path.join(live, "old.webp"), Buffer.from([0x01]));

    await swapPhotosDir({
      live,
      build: async (staging) => {
        await fs.writeFile(path.join(staging, "new.webp"), Buffer.from([0x02]));
      },
    });

    expect(await fileExists(path.join(live, "new.webp"))).toBe(true);
    expect(await fileExists(path.join(live, "old.webp"))).toBe(false);
  });

  it("creates the photos dir if it does not exist", async () => {
    const live = path.join(root, "photos");
    await swapPhotosDir({
      live,
      build: async (staging) => {
        await fs.writeFile(path.join(staging, "new.webp"), Buffer.from([0x02]));
      },
    });
    expect(await fileExists(path.join(live, "new.webp"))).toBe(true);
  });

  it("leaves live dir untouched if build throws", async () => {
    const live = path.join(root, "photos");
    await fs.mkdir(live, { recursive: true });
    await fs.writeFile(path.join(live, "old.webp"), Buffer.from([0x01]));

    await expect(
      swapPhotosDir({
        live,
        build: async () => { throw new Error("boom"); },
      })
    ).rejects.toThrow("boom");

    expect(await fileExists(path.join(live, "old.webp"))).toBe(true);
    const siblings = await fs.readdir(root);
    expect(siblings.filter((s) => s.startsWith("photos.staging-")).length).toBe(0);
  });
});
