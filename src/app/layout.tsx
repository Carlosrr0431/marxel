import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { site } from "@/lib/content";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const SITE_URL = "https://www.marxen.com.ar";
const SHARE_TITLE = "Tu protección, sin vueltas.";
const SHARE_DESCRIPTION =
  "Seguros, prepagas y asistencia al viajero con asesoramiento claro, humano y a tu medida.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${site.name} · Seguros, Salud y Viajero`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    url: "/",
    locale: "es_AR",
    type: "website",
    siteName: site.name,
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
  },
  icons: {
    icon: "/brand/marxel-mark.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${jakarta.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-cloud font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
