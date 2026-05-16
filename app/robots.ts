import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "facebookexternalhit", allow: "/" },
      { userAgent: "meta-externalagent", allow: "/" },
      { userAgent: "Twitterbot", allow: "/" },
    ],
    sitemap: "https://nyarilud.hu/sitemap.xml",
    host: "https://nyarilud.hu",
  };
}
