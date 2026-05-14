import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { seasons, drugs } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "nyári lúd · premium preloved butik · Budapest",
  description:
    "Kicsi bolt a Pozsonyi úton. Tele ruhákkal, amik már megéltek egy életet — és most új sztorira várnak.",
  openGraph: {
    title: "nyári lúd",
    description: "Premium preloved butik · Pozsonyi út 30 · Budapest 1137",
    type: "website",
    images: [
      {
        url: "/og.png",
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
    images: ["/og.png"],
  },
  icons: { icon: [{ url: "/favicon.png", type: "image/png" }] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F4ECDC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={`${seasons.variable} ${drugs.variable}`}>
      <head>
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
