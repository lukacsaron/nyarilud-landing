import { cookies } from "next/headers";

const enc = new TextEncoder();
const COOKIE_NAME = "sid";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

let keyPromise: Promise<CryptoKey> | null = null;
function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error("SESSION_SECRET missing or shorter than 32 chars (use: openssl rand -hex 32)");
    }
    keyPromise = crypto.subtle.importKey(
      "raw", enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
    );
  }
  return keyPromise;
}

function toB64Url(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString("base64url");
}
function fromB64Url(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, "base64url"));
}

export async function signToken(sub: string, expiresAtMs: number): Promise<string> {
  const payload = `${sub}.${expiresAtMs}`;
  const sig = await crypto.subtle.sign("HMAC", await getKey(), enc.encode(payload));
  return `${payload}.${toB64Url(sig)}`;
}

export async function verifyToken(token: string): Promise<{ sub: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [sub, expStr, sigB64] = parts;
  if (!sub || !expStr || !sigB64) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return null;
  const ok = await crypto.subtle.verify(
    "HMAC",
    await getKey(),
    fromB64Url(sigB64),
    enc.encode(`${sub}.${expStr}`)
  );
  if (!ok) return null;
  if (Date.now() > exp) return null;
  return { sub };
}

export async function setSession(sub: string): Promise<void> {
  const token = await signToken(sub, Date.now() + TTL_MS);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function readSession(): Promise<{ sub: string } | null> {
  const jar = await cookies();
  const value = jar.get(COOKIE_NAME)?.value;
  if (!value) return null;
  return verifyToken(value);
}

export const SESSION_COOKIE = COOKIE_NAME;
