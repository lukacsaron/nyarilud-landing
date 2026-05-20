import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getSite } from "@/lib/site/getSite";
import { saveSite } from "@/lib/site/saveSite";
import { PHOTOS_DIR } from "@/lib/site/paths";
import { swapPhotosDir } from "@/lib/site/photosDir";
import { processPhotoBuffer } from "@/lib/site/processPhoto";
import { atomicWriteJson } from "@/lib/site/atomic";
import type { SitePhoto } from "@/lib/site/schema";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
]);

const PinStyle = z.enum(["tape-top", "tape-tl", "tape-tr", "pin"]);
const Slot = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

const MetaItem = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("keep"),
    id: z.string(),
    slot: Slot,
    alt: z.string(),
    pin: PinStyle,
    blueTape: z.boolean(),
    tapeRot: z.string().optional(),
  }),
  z.object({
    kind: z.literal("new"),
    fileKey: z.string(),
    slot: Slot,
    alt: z.string(),
    pin: PinStyle,
    blueTape: z.boolean(),
    tapeRot: z.string().optional(),
  }),
]);
const MetaArray = z.array(MetaItem).length(5);

function originOk(host: string | null, origin: string | null): boolean {
  if (!origin) return false;
  try {
    const o = new URL(origin);
    return o.host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  await requireAdmin();

  const h = await headers();
  if (!originOk(h.get("host"), req.headers.get("origin"))) {
    return Response.json({ ok: false, error: "Bad Origin" }, { status: 400 });
  }

  const form = await req.formData();
  const metaRaw = String(form.get("meta") ?? "");
  let metaParsed;
  try {
    metaParsed = JSON.parse(metaRaw);
  } catch {
    return Response.json({ ok: false, error: "meta nem érvényes JSON" }, { status: 400 });
  }

  const meta = MetaArray.safeParse(metaParsed);
  if (!meta.success) {
    return Response.json({ ok: false, error: meta.error.issues.map(i => i.message).join("; ") }, { status: 400 });
  }

  const slots = meta.data.map(m => m.slot).sort();
  if (JSON.stringify(slots) !== JSON.stringify([1, 2, 3, 4, 5])) {
    return Response.json({ ok: false, error: "minden slot kötelező (1..5)" }, { status: 400 });
  }

  const newKeys = meta.data
    .filter((m): m is Extract<typeof m, { kind: "new" }> => m.kind === "new")
    .map(m => m.fileKey);
  if (new Set(newKeys).size !== newKeys.length) {
    return Response.json({ ok: false, error: "duplikált fájlkulcs" }, { status: 400 });
  }

  const files: Record<string, File> = {};
  for (const key of newKeys) {
    const f = form.get(`photo[${key}]`);
    if (!(f instanceof File)) {
      return Response.json({ ok: false, error: `hiányzó fájl: ${key}` }, { status: 400 });
    }
    if (f.size > MAX_BYTES) {
      return Response.json({ ok: false, error: `túl nagy fájl (${key})` }, { status: 413 });
    }
    if (!ACCEPT_MIME.has(f.type)) {
      return Response.json({ ok: false, error: `nem támogatott formátum: ${f.type}` }, { status: 415 });
    }
    files[key] = f;
  }

  const current = await getSite();
  const liveById: Record<string, SitePhoto> = Object.fromEntries(current.gallery.map(p => [p.id, p]));

  type Out = { sidecar: SitePhoto; webp?: Buffer };
  let outputs: Out[];
  try {
    outputs = await Promise.all(
      meta.data.map<Promise<Out>>(async (m) => {
        if (m.kind === "keep") {
          const existing = liveById[m.id];
          if (!existing) throw new Error(`ismeretlen id: ${m.id}`);
          return {
            sidecar: {
              ...existing,
              slot: m.slot,
              alt: m.alt,
              pin: m.pin,
              blueTape: m.blueTape,
              tapeRot: m.tapeRot,
            },
          };
        }
        const buf = Buffer.from(await files[m.fileKey].arrayBuffer());
        const processed = await processPhotoBuffer(buf);
        const id = `p-${crypto.randomUUID()}`;
        return {
          sidecar: {
            id,
            slot: m.slot,
            alt: m.alt,
            pin: m.pin,
            blueTape: m.blueTape,
            tapeRot: m.tapeRot,
            width: processed.width,
            height: processed.height,
            blurDataURL: processed.blurDataURL,
          },
          webp: processed.webp,
        };
      })
    );
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }

  await swapPhotosDir({
    live: PHOTOS_DIR,
    build: async (staging) => {
      for (const o of outputs) {
        const isSeed = o.sidecar.id.startsWith("seed-");
        if (o.webp) {
          await fs.writeFile(path.join(staging, `${o.sidecar.id}.webp`), o.webp);
          await atomicWriteJson(path.join(staging, `${o.sidecar.id}.json`), o.sidecar);
        } else if (!isSeed) {
          const src = path.join(PHOTOS_DIR, `${o.sidecar.id}.webp`);
          const srcSidecar = path.join(PHOTOS_DIR, `${o.sidecar.id}.json`);
          await fs.copyFile(src, path.join(staging, `${o.sidecar.id}.webp`));
          await fs.copyFile(srcSidecar, path.join(staging, `${o.sidecar.id}.json`));
        }
      }
    },
  });

  const gallery = outputs.map(o => o.sidecar) as [SitePhoto, SitePhoto, SitePhoto, SitePhoto, SitePhoto];
  await saveSite({ ...current, gallery });

  return Response.json({ ok: true, gallery });
}
