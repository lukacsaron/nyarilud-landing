import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { seasons, drugs } from "./fonts";
import "./globals.css";

const SITE_URL = "https://nyarilud.hu";
const OG_IMAGE = "/nyarilud-og.jpg";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "nyári lúd · premium preloved butik · Budapest",
    template: "%s · nyári lúd",
  },
  description:
    "Kicsi bolt a Pozsonyi úton. Tele ruhákkal, amik már megéltek egy életet — és most új sztorira várnak. Premium preloved divat Újlipótvárosban.",
  applicationName: "nyári lúd",
  keywords: [
    "nyári lúd",
    "preloved Budapest",
    "vintage Budapest",
    "second hand Budapest",
    "Pozsonyi út",
    "Újlipótváros butik",
    "vintage divat",
    "premium preloved",
  ],
  authors: [{ name: "nyári lúd" }],
  creator: "nyári lúd",
  publisher: "nyári lúd",
  formatDetection: {
    telephone: true,
    address: true,
    email: true,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "hu_HU",
    url: SITE_URL,
    siteName: "nyári lúd",
    title: "nyári lúd · premium preloved butik",
    description: "Premium preloved butik · Pozsonyi út 30 · Budapest 1137",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "nyári lúd — premium preloved butik · Pozsonyi út 30, Budapest",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "nyári lúd",
    description: "Premium preloved butik · Pozsonyi út 30 · Budapest 1137",
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png" }],
  },
  manifest: "/manifest.webmanifest",
  category: "shopping",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F4ECDC",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ClothingStore",
  "@id": `${SITE_URL}/#store`,
  name: "nyári lúd",
  alternateName: "nyari lud",
  description:
    "Premium preloved butik a Pozsonyi úton. Gondosan válogatott, megélt ruhák új sztorira várva.",
  url: SITE_URL,
  image: `${SITE_URL}${OG_IMAGE}`,
  logo: `${SITE_URL}/nyarilud-logo.svg`,
  email: "dora@nyarilud.hu",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Pozsonyi út 30",
    addressLocality: "Budapest",
    addressRegion: "Budapest",
    postalCode: "1137",
    addressCountry: "HU",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 47.5167,
    longitude: 19.0494,
  },
  hasMap: "https://maps.google.com/?q=Pozsonyi+%C3%BAt+30%2C+Budapest",
  areaServed: {
    "@type": "City",
    name: "Budapest",
  },
  currenciesAccepted: "HUF",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Saturday"],
      opens: "10:00",
      closes: "15:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Friday",
      opens: "10:00",
      closes: "18:00",
    },
  ],
  sameAs: ["https://www.instagram.com/nyarilud/"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={`${seasons.variable} ${drugs.variable}`}>
      <head>
        <meta name="geo.region" content="HU-BU" />
        <meta name="geo.placename" content="Budapest, Újlipótváros" />
        <meta name="geo.position" content="47.5167;19.0494" />
        <meta name="ICBM" content="47.5167, 19.0494" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
