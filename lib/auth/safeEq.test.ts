import { describe, it, expect } from "vitest";
import { safeEq } from "./safeEq";

describe("safeEq", () => {
  it("returns true for identical strings", async () => {
    expect(await safeEq("dora", "dora")).toBe(true);
  });

  it("returns false for different strings of equal length", async () => {
    expect(await safeEq("dora", "DORA")).toBe(false);
  });

  it("returns false for different lengths without throwing", async () => {
    expect(await safeEq("dora", "dorabella")).toBe(false);
  });

  it("returns false for empty vs non-empty", async () => {
    expect(await safeEq("", "x")).toBe(false);
  });

  it("returns true for two empty strings", async () => {
    expect(await safeEq("", "")).toBe(true);
  });
});
