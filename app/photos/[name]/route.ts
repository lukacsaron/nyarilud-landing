import { promises as fs } from "fs";
import path from "path";
import { PHOTOS_DIR } from "@/lib/site/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_NAME = /^[a-zA-Z0-9_-]+\.webp$/;

export async function GET(_: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!SAFE_NAME.test(name)) return new Response(null, { status: 400 });
  let fh;
  try {
    fh = await fs.open(path.join(PHOTOS_DIR, name), "r");
  } catch {
    return new Response(null, { status: 404 });
  }
  const upstream = fh.readableWebStream() as unknown as ReadableStream<Uint8Array>;
  const reader = upstream.getReader();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) controller.close();
      else if (value) controller.enqueue(value);
    },
    async cancel() {
      try { await reader.cancel(); } catch {}
      try { await fh.close(); } catch {}
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "image/webp",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
