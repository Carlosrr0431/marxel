import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { site } from "@/lib/content";
import { DEFAULT_KEYWORDS, SITE_GEO, SITE_URL } from "@/lib/seo";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const SHARE_TITLE = "Tu protección, sin vueltas.";
const SHARE_DESCRIPTION =
  "Productores asesores de seguros en Salta: auto, moto, hogar, prepagas Prevención Salud y asistencia al viajero.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MARXEN | Productores de seguros y prepagas en Salta",
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.lockup,
  authors: [{ name: site.lockup, url: SITE_URL }],
  creator: site.lockup,
  publisher: site.lockup,
  category: "insurance",
  keywords: DEFAULT_KEYWORDS,
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
  alternates: {
    canonical: "/",
    languages: { "es-AR": "/", es: "/" },
    types: {
      "text/plain": "/llms.txt",
    },
  },
  openGraph: {
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    url: "/",
    locale: "es_AR",
    alternateLocale: ["es_ES"],
    type: "website",
    siteName: site.name,
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-icon",
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  other: {
    "geo.region": SITE_GEO.regionCode,
    "geo.placename": SITE_GEO.locality,
    "geo.position": `${SITE_GEO.latitude};${SITE_GEO.longitude}`,
    ICBM: `${SITE_GEO.latitude}, ${SITE_GEO.longitude}`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#352872",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR" className={`${jakarta.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-cloud font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
