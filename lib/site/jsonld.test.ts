import { describe, it, expect } from "vitest";
import { DEFAULT_SITE } from "./schema";
import { buildStoreJsonLd, buildBrandsJsonLd, buildWebsiteJsonLd } from "./jsonld";
import { BRANDS_CARRIED } from "@/lib/brands";

const SITE_URL = "https://nyarilud.hu";

describe("buildStoreJsonLd", () => {
  it("emits the expected @type and key fields from DEFAULT_SITE", () => {
    const ld = buildStoreJsonLd(DEFAULT_SITE, BRANDS_CARRIED, SITE_URL, "/nyarilud-og.jpg");
    expect(ld["@type"]).toEqual(["ClothingStore", "SecondHandStore"]);
    expect(ld.name).toBe("nyári lúd");
    expect(ld.slogan).toBe(DEFAULT_SITE.meta.slogan.replace(/\n/g, " "));
    expect(ld.email).toBe("dora@nyarilud.hu");
    expect(ld.address.streetAddress).toBe("Pozsonyi út 30");
    expect(ld.openingHoursSpecification).toHaveLength(5);
    expect(ld.makesOffer.length).toBe(BRANDS_CARRIED.length);
  });
});

describe("buildBrandsJsonLd", () => {
  it("emits an ItemList of the brand constant", () => {
    const ld = buildBrandsJsonLd(BRANDS_CARRIED, SITE_URL);
    expect(ld["@type"]).toBe("ItemList");
    expect(ld.numberOfItems).toBe(BRANDS_CARRIED.length);
  });
});

describe("buildWebsiteJsonLd", () => {
  it("emits a WebSite node referencing the store id", () => {
    const ld = buildWebsiteJsonLd(SITE_URL);
    expect(ld["@type"]).toBe("WebSite");
    expect(ld.publisher["@id"]).toBe(`${SITE_URL}/#store`);
  });
});

describe("buildStoreJsonLd — press", () => {
  const pressed = {
    ...DEFAULT_SITE,
    press: [
      {
        id: "wlb-2026-09",
        outlet: "We Love Budapest",
        title: "Igazi kincsesbánya nyílt Újlipótvárosban",
        url: "https://welovebudapest.com/cikk/2026/09/16/nyari-lud/",
        date: "2026-09-16",
        author: "Gedeon Lili",
      },
    ],
  };

  it("omits subjectOf entirely when there is no press", () => {
    const ld = buildStoreJsonLd({ ...DEFAULT_SITE, press: [] }, BRANDS_CARRIED, SITE_URL, "/nyarilud-og.jpg");
    expect("subjectOf" in ld).toBe(false);
  });

  it("emits one NewsArticle per press item", () => {
    const ld = buildStoreJsonLd(pressed, BRANDS_CARRIED, SITE_URL, "/nyarilud-og.jpg");
    expect(ld.subjectOf).toHaveLength(1);
    const article = ld.subjectOf![0];
    expect(article["@type"]).toBe("NewsArticle");
    expect(article.headline).toBe("Igazi kincsesbánya nyílt Újlipótvárosban");
    expect(article.url).toBe("https://welovebudapest.com/cikk/2026/09/16/nyari-lud/");
    expect(article.datePublished).toBe("2026-09-16");
    expect(article.author).toEqual({ "@type": "Person", name: "Gedeon Lili" });
    expect(article.publisher).toEqual({ "@type": "Organization", name: "We Love Budapest" });
    expect(article.about).toEqual({ "@id": `${SITE_URL}/#store` });
  });

  it("drops the author key when the press item has no byline", () => {
    const anon = { ...pressed, press: [{ ...pressed.press[0], author: undefined }] };
    const ld = buildStoreJsonLd(anon, BRANDS_CARRIED, SITE_URL, "/nyarilud-og.jpg");
    expect("author" in ld.subjectOf![0]).toBe(false);
  });
});

describe("buildStoreJsonLd — resilience to a pre-press cached Site", () => {
  it("does not throw when press is missing from the object entirely", () => {
    // unstable_cache persists the parsed Site to disk, so a cache entry written
    // before `press` existed is handed straight back without re-parsing — the
    // zod default never runs. The layout renders this on every page.
    const { press: _omitted, ...stale } = DEFAULT_SITE;
    const ld = buildStoreJsonLd(stale as typeof DEFAULT_SITE, BRANDS_CARRIED, SITE_URL, "/nyarilud-og.jpg");
    expect("subjectOf" in ld).toBe(false);
    expect(ld.name).toBe("nyári lúd");
  });
});
