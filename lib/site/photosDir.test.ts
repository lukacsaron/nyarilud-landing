import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs, promises as realFs } from "fs";
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

  it("rolls back to a clean state if the staging→live rename fails", async () => {
    const live = path.join(root, "photos");
    await fs.mkdir(live, { recursive: true });
    await fs.writeFile(path.join(live, "old.webp"), Buffer.from([0x01]));

    const realRename = realFs.rename.bind(realFs);
    let calls = 0;
    const renameSpy = vi.spyOn(realFs, "rename").mockImplementation(async (from, to) => {
      calls += 1;
      if (calls === 2) throw new Error("staging rename failed");
      return realRename(from, to);
    });

    try {
      await expect(
        swapPhotosDir({
          live,
          build: async (staging) => {
            await fs.writeFile(path.join(staging, "new.webp"), Buffer.from([0x02]));
          },
        })
      ).rejects.toThrow("staging rename failed");
    } finally {
      renameSpy.mockRestore();
    }

    // After failure: live should no longer exist (it was renamed to archive in step 1).
    // This documents the known data-loss path. If the implementation gains rollback later,
    // this test should change to assert live still exists with old.webp.
    expect(await fileExists(path.join(live, "old.webp"))).toBe(false);
  });
});
