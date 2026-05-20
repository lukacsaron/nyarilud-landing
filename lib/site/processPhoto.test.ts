import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { processPhotoBuffer } from "./processPhoto";

describe("processPhotoBuffer", () => {
  it("produces a WebP buffer + blur placeholder + dimensions", async () => {
    const buf = await fs.readFile(path.join(__dirname, "__fixtures__", "sample.jpg"));
    const result = await processPhotoBuffer(buf);
    expect(result.webp.length).toBeGreaterThan(1000);
    expect(result.width).toBeGreaterThanOrEqual(1200);
    expect(result.width).toBeLessThanOrEqual(1440);
    expect(result.height).toBeGreaterThan(0);
    expect(result.blurDataURL.startsWith("data:image/webp;base64,")).toBe(true);
  });

  it("rejects buffers that are too small (< 1200px wide)", async () => {
    const sharp = (await import("sharp")).default;
    const tiny = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 200, g: 200, b: 200 } },
    }).jpeg().toBuffer();
    await expect(processPhotoBuffer(tiny)).rejects.toThrow(/legalább 1200/);
  });
});
