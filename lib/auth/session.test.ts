import { describe, it, expect, beforeAll } from "vitest";
import { signToken, verifyToken } from "./session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-please-rotate-in-prod-0123456789";
});

describe("signToken / verifyToken", () => {
  it("round-trips a valid token", async () => {
    const token = await signToken("dora", Date.now() + 60_000);
    const result = await verifyToken(token);
    expect(result).not.toBeNull();
    expect(result!.sub).toBe("dora");
  });

  it("rejects a tampered token", async () => {
    const token = await signToken("dora", Date.now() + 60_000);
    const tampered = token.slice(0, -2) + "AA";
    expect(await verifyToken(tampered)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signToken("dora", Date.now() - 1_000);
    expect(await verifyToken(token)).toBeNull();
  });

  it("rejects a malformed token", async () => {
    expect(await verifyToken("notatoken")).toBeNull();
  });
});
