import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ChatBot } from "@/components/ChatBot";
import { JsonLd } from "@/components/JsonLd";
import { jsonLdGraph, organizationNode, websiteNode } from "@/lib/seo";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={jsonLdGraph([organizationNode(), websiteNode()])} />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatBot />
      <WhatsAppButton />
    </>
  );
}
