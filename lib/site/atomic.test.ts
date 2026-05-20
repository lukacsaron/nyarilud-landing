import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { atomicWriteJson, atomicWriteFile } from "./atomic";

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "atomic-"));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("atomicWriteJson", () => {
  it("writes the file and round-trips", async () => {
    const target = path.join(dir, "site.json");
    await atomicWriteJson(target, { hello: "vilag" });
    const raw = await fs.readFile(target, "utf8");
    expect(JSON.parse(raw)).toEqual({ hello: "vilag" });
  });

  it("does not leave temp files behind on success", async () => {
    const target = path.join(dir, "site.json");
    await atomicWriteJson(target, { x: 1 });
    const entries = await fs.readdir(dir);
    expect(entries).toEqual(["site.json"]);
  });
});

describe("atomicWriteFile", () => {
  it("writes binary buffer atomically", async () => {
    const target = path.join(dir, "blob.bin");
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    await atomicWriteFile(target, buf);
    const read = await fs.readFile(target);
    expect(Buffer.compare(read, buf)).toBe(0);
  });
});
