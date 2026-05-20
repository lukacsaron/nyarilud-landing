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
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
