import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { readSiteFromDisk } from "./getSite";
import { DEFAULT_SITE } from "./schema";

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "getsite-"));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("readSiteFromDisk", () => {
  it("returns DEFAULT_SITE when the file does not exist", async () => {
    const site = await readSiteFromDisk(path.join(dir, "site.json"));
    expect(site).toEqual(DEFAULT_SITE);
  });

  it("returns parsed contents when valid", async () => {
    const custom = { ...DEFAULT_SITE, meta: { ...DEFAULT_SITE.meta, title: "Új cím" } };
    await fs.writeFile(path.join(dir, "site.json"), JSON.stringify(custom));
    const site = await readSiteFromDisk(path.join(dir, "site.json"));
    expect(site.meta.title).toBe("Új cím");
  });

  it("returns DEFAULT_SITE when JSON is malformed", async () => {
    await fs.writeFile(path.join(dir, "site.json"), "{ not json");
    const site = await readSiteFromDisk(path.join(dir, "site.json"));
    expect(site).toEqual(DEFAULT_SITE);
  });

  it("returns DEFAULT_SITE when schema validation fails", async () => {
    await fs.writeFile(path.join(dir, "site.json"), JSON.stringify({ meta: { title: "" } }));
    const site = await readSiteFromDisk(path.join(dir, "site.json"));
    expect(site).toEqual(DEFAULT_SITE);
  });
});
