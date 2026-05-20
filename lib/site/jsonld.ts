import type { Site } from "./schema";
import { toOpeningHoursSpecification } from "./hours";

export function buildStoreJsonLd(
  site: Site,
  brands: readonly string[],
  siteUrl: string,
  ogImage: string
) {
  return {
    "@context": "https://schema.org",
    "@type": ["ClothingStore", "SecondHandStore"],
    "@id": `${siteUrl}/#store`,
    name: "nyári lúd",
    alternateName: ["nyari lud", "Nyári Lúd", "nyári lúd boutique"],
    description: site.meta.description,
    slogan: site.meta.slogan.replace(/\n/g, " "),
    url: siteUrl,
    image: `${siteUrl}${ogImage}`,
    logo: `${siteUrl}/nyarilud-logo.svg`,
    email: site.contact.email,
    priceRange: "$$",
    paymentAccepted: ["Cash", "Credit Card", "Debit Card"],
    address: {
      "@type": "PostalAddress",
      streetAddress: site.contact.address.streetAddress,
      addressLocality: site.contact.address.addressLocality,
      addressRegion: site.contact.address.addressLocality,
      postalCode: site.contact.address.postalCode,
      addressCountry: "HU",
    },
    geo: { "@type": "GeoCoordinates", latitude: 47.5167, longitude: 19.0494 },
    hasMap: "https://maps.app.goo.gl/BJohLrrUkpDCzEyU9",
    areaServed: [
      { "@type": "City", name: "Budapest" },
      { "@type": "Country", name: "Hungary" },
    ],
    currenciesAccepted: "HUF",
    openingHoursSpecification: toOpeningHoursSpecification(site),
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
    makesOffer: brands.map((brand) => ({
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
}

export function buildBrandsJsonLd(brands: readonly string[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${siteUrl}/#brands`,
    name: "Márkák a nyári lúd boutiqueban",
    description:
      "Designer márkák, amelyek rendszeresen elérhetők a nyári lúd preloved boutiqueban (Pozsonyi út 30, Budapest).",
    numberOfItems: brands.length,
    itemListElement: brands.map((brand, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: { "@type": "Brand", name: brand },
    })),
  };
}

export function buildWebsiteJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: "nyári lúd",
    inLanguage: "hu-HU",
    publisher: { "@id": `${siteUrl}/#store` },
  };
}
