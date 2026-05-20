import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { seasons, drugs } from "./fonts";
import "./globals.css";
import { getSite } from "@/lib/site/getSite";
import { buildStoreJsonLd, buildBrandsJsonLd, buildWebsiteJsonLd } from "@/lib/site/jsonld";
import { BRANDS_CARRIED } from "@/lib/brands";

const SITE_URL = "https://nyarilud.hu";
const OG_IMAGE = "/nyarilud-og.jpg";

function ldJson(obj: unknown): string {
  return JSON.stringify(obj).replace(/<\//g, "<\\/");
}

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: site.meta.title, template: "%s · nyári lúd" },
    description: site.meta.description,
    applicationName: "nyári lúd",
    keywords: [
      "nyári lúd",
      "preloved Budapest",
      "vintage Budapest",
      "second hand Budapest",
      "Pozsonyi út",
      "Újlipótváros boutique",
      "vintage divat",
      "premium preloved",
    ],
    authors: [{ name: "nyári lúd" }],
    creator: "nyári lúd",
    publisher: "nyári lúd",
    formatDetection: { telephone: true, address: true, email: true },
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "hu_HU",
      url: `${SITE_URL}/`,
      siteName: "nyári lúd",
      title: site.meta.title,
      description: site.meta.description,
      images: [{
        url: OG_IMAGE, width: 1200, height: 630,
        alt: "nyári lúd — premium preloved boutique · Pozsonyi út 30, Budapest",
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: site.meta.title,
      description: site.meta.description,
      images: [OG_IMAGE],
    },
    robots: {
      index: true, follow: true,
      googleBot: {
        index: true, follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    icons: {
      icon: [{ url: "/favicon.png", type: "image/png", sizes: "512x512" }],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
      shortcut: [{ url: "/favicon.png" }],
    },
    manifest: "/manifest.webmanifest",
    category: "shopping",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F4ECDC",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getSite();
  const storeJsonLd = buildStoreJsonLd(site, BRANDS_CARRIED, SITE_URL, OG_IMAGE);
  const brandsJsonLd = buildBrandsJsonLd(BRANDS_CARRIED, SITE_URL);
  const websiteJsonLd = buildWebsiteJsonLd(SITE_URL);

  return (
    <html lang="hu" className={`${seasons.variable} ${drugs.variable}`}>
      <head>
        <meta name="geo.region" content="HU-BU" />
        <meta name="geo.placename" content="Budapest, Újlipótváros" />
        <meta name="geo.position" content="47.5167;19.0494" />
        <meta name="ICBM" content="47.5167, 19.0494" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldJson(storeJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldJson(brandsJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldJson(websiteJsonLd) }}
        />
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WJ27QR9F');`}
        </Script>
        <Script
          id="gtag-src"
          src="https://www.googletagmanager.com/gtag/js?id=G-CR5EJ9HH4Y"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-CR5EJ9HH4Y');`}
        </Script>
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-WJ27QR9F"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
