import { promises as fs } from "fs";
import crypto from "crypto";
import path from "path";

async function writeThenRename(target: string, data: string | Buffer): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.tmp-${crypto.randomUUID()}`;
  try {
    await fs.writeFile(tmp, data);
    await fs.rename(tmp, target);
  } catch (err) {
    await fs.rm(tmp, { force: true });
    throw err;
  }
}

export async function atomicWriteJson(target: string, value: unknown): Promise<void> {
  await writeThenRename(target, JSON.stringify(value, null, 2));
}

export async function atomicWriteFile(target: string, data: Buffer | string): Promise<void> {
  await writeThenRename(target, data);
}
