const enc = new TextEncoder();

export async function safeEq(a: string, b: string): Promise<boolean> {
  const ha = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(a)));
  const hb = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(b)));
  let diff = 0;
  for (let i = 0; i < 32; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}
