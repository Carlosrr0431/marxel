import type { Metadata } from "next";
import type { FaqItem } from "@/lib/content";
import { site } from "@/lib/content";

export const SITE_URL = "https://www.marxen.com.ar";

export const SITE_GEO = {
  latitude: -24.7859,
  longitude: -65.4118,
  regionCode: "AR-A",
  locality: "Salta",
  region: "Salta",
  country: "AR",
  countryName: "Argentina",
} as const;

export const ORG_ID = `${SITE_URL}/#organizacion`;
export const WEBSITE_ID = `${SITE_URL}/#sitio`;

export const DEFAULT_KEYWORDS = [
  "MARXEN",
  "MARXEN Salta",
  "productores de seguros Salta",
  "seguro de auto Salta",
  "seguros de auto",
  "cotizar seguro de auto",
  "San Cristóbal Seguros",
  "prepaga Salta",
  "seguro de salud Salta",
  "Prevención Salud",
  "plan A2",
  "plan A4",
  "seguro de viaje Salta",
  "asistencia al viajero Salta",
  "seguro de hogar Salta",
  "seguro de moto Salta",
];

export function absoluteUrl(path = "/") {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  absoluteTitle?: boolean;
}): Metadata {
  const canonical = opts.path || "/";
  return {
    title: opts.absoluteTitle ? { absolute: opts.title } : opts.title,
    description: opts.description,
    keywords: opts.keywords ?? DEFAULT_KEYWORDS,
    alternates: {
      canonical,
      languages: { "es-AR": canonical, es: canonical },
      types: { "text/plain": "/llms.txt" },
    },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: canonical,
      locale: "es_AR",
      type: "website",
      siteName: site.name,
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
    },
  };
}

type JsonLd = Record<string, unknown>;

export function organizationNode(): JsonLd {
  return {
    "@type": ["InsuranceAgency", "LocalBusiness", "Organization"],
    "@id": ORG_ID,
    name: site.lockup,
    alternateName: [site.name, "Marxel", "MARXEN Salta"],
    legalName: site.lockup,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/brand/marxel-lockup.svg"),
    },
    image: absoluteUrl("/opengraph-image"),
    telephone: site.phoneLocal,
    email: site.email,
    description:
      "Productores asesores de seguros, prepagas y asistencia al viajero en Salta, Argentina. Cotización de auto, moto y hogar con San Cristóbal, planes de Prevención Salud y asistencia al viajero.",
    slogan: "Tu protección, sin vueltas.",
    priceRange: "$$",
    currenciesAccepted: "ARS",
    paymentAccepted: "Cash, Credit Card, Debit Card, Bank Transfer",
    identifier: {
      "@type": "PropertyValue",
      name: "Código de productor San Cristóbal",
      value: "08-006051",
    },
    foundingLocation: {
      "@type": "Place",
      name: "Salta, Argentina",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: SITE_GEO.locality,
      addressRegion: SITE_GEO.region,
      postalCode: "4400",
      addressCountry: SITE_GEO.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE_GEO.latitude,
      longitude: SITE_GEO.longitude,
    },
    hasMap: site.mapsUrl,
    areaServed: [
      { "@type": "City", name: "Salta" },
      { "@type": "AdministrativeArea", name: "Provincia de Salta" },
      { "@type": "Country", name: "Argentina" },
    ],
    knowsAbout: [
      "Seguro de automóviles",
      "Seguros de auto en Salta",
      "Seguro de motos",
      "Seguro de hogar",
      "Seguro de comercio",
      "ART",
      "Accidentes personales",
      "Mala praxis",
      "Medicina prepaga",
      "Seguro de salud",
      "Prevención Salud",
      "Asistencia al viajero",
      "Seguro de viaje",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: "+5493876348199",
        email: site.email,
        areaServed: "AR",
        availableLanguage: ["Spanish"],
        url: `https://wa.me/${site.whatsapp}`,
      },
    ],
    sameAs: [site.instagram, site.facebook, site.mapsUrl],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Coberturas MARXEN",
      itemListElement: [
        {
          "@type": "Offer",
          url: absoluteUrl("/seguro-de-auto"),
          itemOffered: { "@type": "Service", name: "Seguro de auto", url: absoluteUrl("/seguro-de-auto") },
        },
        {
          "@type": "Offer",
          url: absoluteUrl("/seguro-de-moto"),
          itemOffered: { "@type": "Service", name: "Seguro de moto", url: absoluteUrl("/seguro-de-moto") },
        },
        {
          "@type": "Offer",
          url: absoluteUrl("/seguro-de-hogar"),
          itemOffered: { "@type": "Service", name: "Seguro de hogar", url: absoluteUrl("/seguro-de-hogar") },
        },
        {
          "@type": "Offer",
          url: absoluteUrl("/salud"),
          itemOffered: { "@type": "Service", name: "Medicina prepaga", url: absoluteUrl("/salud") },
        },
        {
          "@type": "Offer",
          url: absoluteUrl("/viajero"),
          itemOffered: {
            "@type": "Service",
            name: "Seguro de viaje y asistencia al viajero",
            url: absoluteUrl("/viajero"),
          },
        },
      ],
    },
  };
}

export function websiteNode(): JsonLd {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: site.name,
    inLanguage: "es-AR",
    publisher: { "@id": ORG_ID },
  };
}

export function webPageNode(opts: {
  path: string;
  title: string;
  description: string;
}): JsonLd {
  const url = absoluteUrl(opts.path);
  return {
    "@type": "WebPage",
    "@id": `${url}#pagina`,
    url,
    name: opts.title,
    description: opts.description,
    inLanguage: "es-AR",
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORG_ID },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "[data-seo-lede]"],
    },
  };
}

export function breadcrumbNode(items: { name: string; path: string }[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqNode(items: FaqItem[]): JsonLd | null {
  if (!items.length) return null;
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function serviceNode(opts: {
  name: string;
  description: string;
  path: string;
  serviceType?: string;
}): JsonLd {
  const url = absoluteUrl(opts.path);
  return {
    "@type": "Service",
    "@id": `${url}#servicio`,
    name: opts.name,
    serviceType: opts.serviceType ?? opts.name,
    description: opts.description,
    url,
    provider: { "@id": ORG_ID },
    areaServed: [
      { "@type": "City", name: SITE_GEO.locality },
      { "@type": "AdministrativeArea", name: "Provincia de Salta" },
      { "@type": "Country", name: SITE_GEO.countryName },
    ],
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: url,
      availableLanguage: ["es-AR", "es"],
    },
  };
}

export function jsonLdGraph(nodes: Array<JsonLd | null>) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean),
  };
}

export function pageJsonLd(opts: {
  path: string;
  title: string;
  description: string;
  crumbs: { name: string; path: string }[];
  faqs?: FaqItem[];
  service?: { name: string; serviceType?: string };
}) {
  return jsonLdGraph([
    webPageNode(opts),
    breadcrumbNode(opts.crumbs),
    opts.service
      ? serviceNode({
          name: opts.service.name,
          serviceType: opts.service.serviceType,
          description: opts.description,
          path: opts.path,
        })
      : null,
    faqNode(opts.faqs || []),
  ]);
}
