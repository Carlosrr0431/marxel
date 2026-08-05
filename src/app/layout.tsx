import type { Metadata } from "next";
import { Manrope, Syne } from "next/font/google";
import { site } from "@/lib/content";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${site.name} · Seguros, Salud y Viajero`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    title: site.name,
    description: site.description,
    locale: "es_AR",
    type: "website",
    images: [{ url: "/brand/marxel-logo.png", width: 800, height: 227 }],
  },
  icons: {
    icon: "/brand/marxel-mark.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${manrope.variable} ${syne.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-cloud font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
