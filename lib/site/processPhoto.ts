import sharp from "sharp";

export type ProcessedPhoto = {
  webp: Buffer;
  width: number;
  height: number;
  blurDataURL: string;
};

export async function processPhotoBuffer(input: Buffer): Promise<ProcessedPhoto> {
  const meta = await sharp(input, { failOn: "error" }).rotate().metadata();
  if (!meta.width || meta.width < 1200) {
    throw new Error("túl kicsi a kép — legalább 1200 px széles legyen");
  }

  const pipeline = sharp(input, { failOn: "error" })
    .rotate()
    .resize({ width: 1440, withoutEnlargement: true, fit: "inside" });

  const { data: webp, info } = await pipeline
    .clone()
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  const blurBuf = await sharp(webp)
    .resize(16, null, { fit: "inside" })
    .webp({ quality: 30 })
    .toBuffer();

  return {
    webp,
    width: info.width,
    height: info.height,
    blurDataURL: `data:image/webp;base64,${blurBuf.toString("base64")}`,
  };
}
