import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "nyári lúd",
    short_name: "nyári lúd",
    description: "Premium preloved boutique · Pozsonyi út 30 · Budapest",
    start_url: "/",
    display: "standalone",
    background_color: "#F4ECDC",
    theme_color: "#F4ECDC",
    lang: "hu",
    icons: [
      {
        src: "/favicon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
