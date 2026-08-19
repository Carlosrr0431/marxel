import type { MetadataRoute } from "next";
import { site } from "@/lib/content";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.lockup,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f6fafc",
    theme_color: "#0a355c",
    lang: "es-AR",
    icons: [
      {
        src: "/brand/marxel-mark.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  };
}
