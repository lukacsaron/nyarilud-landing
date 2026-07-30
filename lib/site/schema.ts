import { z } from "zod";

const TimeHHMM = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM (00:00–23:59)");

const DaySchema = z.object({
  closed: z.boolean(),
  opens: TimeHHMM,
  closes: TimeHHMM,
});

const ExceptionSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    label: z.string().optional(),
    mode: z.enum(["closed", "custom"]),
    opens: TimeHHMM.optional(),
    closes: TimeHHMM.optional(),
  })
  .refine(
    (e) => e.mode === "closed" || (e.opens !== undefined && e.closes !== undefined),
    { message: "custom mode requires opens and closes" }
  );

const PinStyle = z.enum(["tape-top", "tape-tl", "tape-tr", "pin"]);

const PhotoSchema = z.object({
  id: z.string(),
  slot: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  alt: z.string(),
  pin: PinStyle,
  blueTape: z.boolean().default(false),
  tapeRot: z.string().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  blurDataURL: z.string(),
});

export const SiteSchema = z.object({
  meta: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    slogan: z.string().min(1),
  }),
  contact: z.object({
    email: z.email(),                           // ← zod v4: top-level z.email() not z.string().email()
    address: z.object({
      streetAddress: z.string(),
      addressLocality: z.string(),
      postalCode: z.string(),
      neighborhood: z.string(),
    }),
  }),
  hours: z.object({
    mon: DaySchema, tue: DaySchema, wed: DaySchema, thu: DaySchema,
    fri: DaySchema, sat: DaySchema, sun: DaySchema,
  }),
  exceptions: z.array(ExceptionSchema),
  gallery: z.array(PhotoSchema).min(1).max(5).refine(
    (arr) => new Set(arr.map((p) => p.slot)).size === arr.length,
    { message: "gallery slots must be unique" }
  ),
});

export type Site = z.infer<typeof SiteSchema>;
export type SiteHours = Site["hours"];
export type SiteException = Site["exceptions"][number];
export type SitePhoto = Site["gallery"][number];
export type DayKey = keyof SiteHours;

export const DAY_KEYS: readonly DayKey[] = [
  "mon", "tue", "wed", "thu", "fri", "sat", "sun",
] as const;

const closedDay = { closed: true, opens: "10:00", closes: "15:00" } as const;
const open10to15 = { closed: false, opens: "10:00", closes: "15:00" } as const;
const open10to18 = { closed: false, opens: "10:00", closes: "18:00" } as const;

export const DEFAULT_SITE: Site = {
  meta: {
    title: "nyári lúd · premium preloved boutique · Budapest",
    description:
      "Premium preloved boutique a Pozsonyi úton (Újlipótváros, Budapest). Gondosan válogatott Ganni, Baum und Pferdgarten, Stine Goya, Samsøe Samsøe, Sézane, Isabel Marant, A.P.C., Acne Studios és további skandináv és francia márkák.",
    slogan:
      "kicsi bolt a Pozsonyi úton, tele ruhákkal,\namik már megéltek egy életet\n— és most új sztorira várnak.",
  },
  contact: {
    email: "dora@nyarilud.hu",
    address: {
      streetAddress: "Pozsonyi út 30",
      addressLocality: "Budapest",
      postalCode: "1137",
      neighborhood: "Újlipótváros",
    },
  },
  hours: {
    mon: closedDay,
    tue: open10to15,
    wed: open10to15,
    thu: open10to15,
    fri: open10to18,
    sat: open10to15,
    sun: closedDay,
  },
  exceptions: [],
  gallery: [
    { id: "seed-1", slot: 1, alt: "Nyári lúd — sárga csíkos kabát", pin: "tape-top", blueTape: false, width: 1440, height: 1920, blurDataURL: "data:image/webp;base64,UklGRgAA" },
    { id: "seed-2", slot: 2, alt: "Nyári lúd — hímzett mellény", pin: "tape-tl", blueTape: true, width: 1440, height: 1920, blurDataURL: "data:image/webp;base64,UklGRgAA" },
    { id: "seed-3", slot: 3, alt: "Nyári lúd — sárga öv hangtag-gel", pin: "pin", blueTape: false, width: 1440, height: 1920, blurDataURL: "data:image/webp;base64,UklGRgAA" },
    { id: "seed-4", slot: 4, alt: "Nyári lúd — boltbelső", pin: "tape-tr", blueTape: false, width: 1440, height: 1920, blurDataURL: "data:image/webp;base64,UklGRgAA" },
    { id: "seed-5", slot: 5, alt: "Nyári lúd — a kirakat", pin: "tape-top", blueTape: true, tapeRot: "2deg", width: 1440, height: 1920, blurDataURL: "data:image/webp;base64,UklGRgAA" },
  ],
};
