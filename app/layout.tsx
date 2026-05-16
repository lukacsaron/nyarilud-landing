import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { seasons, drugs } from "./fonts";
import "./globals.css";

const SITE_URL = "https://nyarilud.hu";
const OG_IMAGE = "/nyarilud-og.jpg";

const BRANDS_CARRIED = [
  "Ganni",
  "Baum und Pferdgarten",
  "Stine Goya",
  "Samsøe Samsøe",
  "Sézane",
  "Rouje Paris",
  "Isabel Marant",
  "Isabel Marant Étoile",
  "A.P.C.",
  "&Other Stories",
  "Arket",
  "COS",
  "Wood Wood",
  "Acne Studios",
  "Anine Bing",
  "Lollys Laundry",
  "Lovechild 1979",
  "Neo Noir",
  "Mads Nørgaard Copenhagen",
  "Second Female",
  "Stella Nova",
  "Beck Söndergaard",
  "Bobo Choses",
  "Brigitte Herskind",
  "Cecilie Copenhagen",
  "DAY Birger et Mikkelsen",
  "Designers Remix",
  "Envii",
  "Esmé Studio",
  "Gestuz",
  "Habiba",
  "Han Kjøbenhavn",
  "Henrik Vibskov",
  "Ichi",
  "InWear",
  "KA:NT Copenhagen",
  "Konges Sløjd",
  "Liberté Essentiel",
  "Magasin",
  "Malene Birger",
  "Mood Copenhagen",
  "MSCH Copenhagen",
  "Munthe",
  "Nümph",
  "Opera Sport",
  "Part Two",
  "Pernilla Wahlgren",
  "Pieces",
  "Pure Friday",
  "Rabens Saloner",
  "Rodebjer",
  "Rotate",
  "Sabina Sommer",
  "Sand Copenhagen",
  "Selected Femme",
  "Sissel Edelbo",
  "Sisters Point",
  "Skall Studio",
  "Sofie Schnoor",
  "Studio Feder",
  "Tiger of Sweden",
  "Trois Pommes",
  "YAS",
  "Zadig & Voltaire",
  "American Vintage",
  "Atelier Revive",
  "Boii Studios",
  "Bongusta",
  "Celine",
  "Comme des Garçons",
  "Comme des Garçons PLAY",
  "Free People",
  "IRO Paris",
  "Kenzo",
  "Marella",
  "MAX&Co",
  "MOTHER",
  "MSGM Milano",
  "Nanushka",
  "Never Fully Dressed",
  "NoaNoa",
  "Proenza Schouler",
  "Sandro Paris",
  "Scotch & Soda",
  "Sea New York",
  "See by Chloé",
  "Stella McCartney",
  "Stüssy",
  "T by Alexander Wang",
  "The Jogg Concept",
  "Topshop",
  "Tory Burch",
  "Canada Goose",
  "Carhartt",
  "Columbia",
  "Dickies",
  "Fjäll Räven",
  "Homeboy",
  "Ilse Jacobsen",
  "Karen Millen",
  "Lee",
  "Levi's",
  "Lindex",
  "Mango",
  "Monki",
  "Moves",
  "NA-KD",
  "Nike ACG",
  "Pico",
  "Ralph Lauren",
  "The North Face",
  "Urban Outfitters",
  "U.S. Polo Assn.",
  "Vila",
  "Wrangler",
  "Zara",
  "H&M Premium",
  "H&M Trend",
  "H&M Edition",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "nyári lúd · premium preloved butik · Budapest",
    template: "%s · nyári lúd",
  },
  description:
    "Premium preloved butik a Pozsonyi úton (Újlipótváros, Budapest). Gondosan válogatott Ganni, Baum und Pferdgarten, Stine Goya, Samsøe Samsøe, Sézane, Isabel Marant, A.P.C., Acne Studios és további skandináv és francia márkák.",
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
    url: `${SITE_URL}/`,
    siteName: "nyári lúd",
    title: "nyári lúd · premium preloved butik · Budapest",
    description:
      "Premium preloved butik · Pozsonyi út 30 · Budapest 1137. Ganni, Baum und Pferdgarten, Stine Goya, Samsøe Samsøe, Sézane, Isabel Marant és további skandináv & francia márkák.",
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
    title: "nyári lúd · premium preloved butik · Budapest",
    description:
      "Premium preloved butik · Pozsonyi út 30 · Budapest 1137. Ganni, Baum und Pferdgarten, Stine Goya, Samsøe Samsøe és további skandináv & francia márkák.",
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

const storeJsonLd = {
  "@context": "https://schema.org",
  "@type": ["ClothingStore", "SecondHandStore"],
  "@id": `${SITE_URL}/#store`,
  name: "nyári lúd",
  alternateName: ["nyari lud", "Nyári Lúd", "nyári lúd butik"],
  description:
    "Premium preloved butik a Pozsonyi úton. Gondosan válogatott, megélt designer ruhák új sztorira várva — Ganni, Baum und Pferdgarten, Stine Goya, Samsøe Samsøe, Sézane, Isabel Marant és további skandináv és francia márkák.",
  slogan: "Tele ruhákkal, amik már megéltek egy életet — és most új sztorira várnak.",
  url: SITE_URL,
  image: `${SITE_URL}${OG_IMAGE}`,
  logo: `${SITE_URL}/nyarilud-logo.svg`,
  email: "dora@nyarilud.hu",
  priceRange: "$$",
  paymentAccepted: ["Cash", "Credit Card", "Debit Card"],
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
  areaServed: [
    { "@type": "City", name: "Budapest" },
    { "@type": "Country", name: "Hungary" },
  ],
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
  knowsAbout: [
    "premium preloved fashion",
    "second-hand designer clothing",
    "vintage fashion",
    "Scandinavian fashion",
    "French fashion",
    "sustainable fashion",
    "circular fashion",
    "curated second-hand",
  ],
  makesOffer: BRANDS_CARRIED.map((brand) => ({
    "@type": "Offer",
    itemOffered: {
      "@type": "Product",
      category: "Preloved women's clothing",
      brand: { "@type": "Brand", name: brand },
    },
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/UsedCondition",
  })),
  sameAs: ["https://www.instagram.com/nyarilud/"],
};

const brandsJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "@id": `${SITE_URL}/#brands`,
  name: "Márkák a nyári lúd butikban",
  description:
    "Designer márkák, amelyek rendszeresen elérhetők a nyári lúd preloved butikban (Pozsonyi út 30, Budapest).",
  numberOfItems: BRANDS_CARRIED.length,
  itemListElement: BRANDS_CARRIED.map((brand, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "Brand",
      name: brand,
    },
  })),
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "nyári lúd",
  inLanguage: "hu-HU",
  publisher: { "@id": `${SITE_URL}/#store` },
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(brandsJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
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
