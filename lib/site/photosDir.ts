import { promises as fs } from "fs";
import crypto from "crypto";
import path from "path";

export async function swapPhotosDir(opts: {
  live: string;
  build: (stagingDir: string) => Promise<void>;
}): Promise<void> {
  const id = crypto.randomUUID();
  const parent = path.dirname(opts.live);
  const staging = path.join(parent, `photos.staging-${id}`);
  const archive = path.join(parent, `photos.old-${id}`);

  await fs.mkdir(staging, { recursive: true });
  try {
    await opts.build(staging);
  } catch (err) {
    await fs.rm(staging, { recursive: true, force: true });
    throw err;
  }

  try {
    await fs.rename(opts.live, archive);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      await fs.rm(staging, { recursive: true, force: true });
      throw err;
    }
  }
  await fs.rename(staging, opts.live);
  await fs.rm(archive, { recursive: true, force: true });
}
