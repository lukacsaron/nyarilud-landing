import { describe, it, expect, beforeEach } from "vitest";
import { createLimiter } from "./rateLimit";

let now = 1_000_000;
beforeEach(() => { now = 1_000_000; });

describe("createLimiter", () => {
  it("allows up to N attempts in the window then blocks", () => {
    const limiter = createLimiter({ limit: 3, windowMs: 60_000, now: () => now });
    expect(limiter.check("1.2.3.4")).toBe(true);
    expect(limiter.check("1.2.3.4")).toBe(true);
    expect(limiter.check("1.2.3.4")).toBe(true);
    expect(limiter.check("1.2.3.4")).toBe(false);
  });

  it("isolates by key", () => {
    const limiter = createLimiter({ limit: 1, windowMs: 60_000, now: () => now });
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("b")).toBe(true);
    expect(limiter.check("a")).toBe(false);
  });

  it("resets after the window expires", () => {
    const limiter = createLimiter({ limit: 1, windowMs: 1_000, now: () => now });
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(false);
    now += 1_001;
    expect(limiter.check("a")).toBe(true);
  });
});
