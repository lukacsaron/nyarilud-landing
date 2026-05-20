import { promises as fs } from "fs";
import path from "path";
import { PHOTOS_DIR } from "@/lib/site/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_NAME = /^[a-zA-Z0-9_-]+\.webp$/;

export async function GET(_: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!SAFE_NAME.test(name)) return new Response(null, { status: 400 });
  try {
    const fh = await fs.open(path.join(PHOTOS_DIR, name), "r");
    const stream = fh.readableWebStream() as unknown as ReadableStream;
    return new Response(stream, {
      headers: {
        "content-type": "image/webp",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
