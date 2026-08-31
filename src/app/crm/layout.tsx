import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  manifest: "/crm-manifest.webmanifest",
  applicationName: "MARXEN CRM",
  appleWebApp: {
    capable: true,
    title: "MARXEN CRM",
    statusBarStyle: "black-translucent",
  },
};

export default function CrmRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
