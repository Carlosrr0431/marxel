import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { site } from "@/lib/content";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://marxel-omega.vercel.app"),
  title: {
    default: `${site.name} · Seguros, Salud y Viajero`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    title: `${site.name} · Seguros, Salud y Viajero — Salta, Argentina`,
    description: site.description,
    locale: "es_AR",
    type: "website",
    siteName: site.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} · Seguros, Salud y Viajero`,
    description: site.description,
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
