import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx"],
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async redirects() {
    return [
      { source: "/seguros-de-auto", destination: "/seguro-de-auto", permanent: true },
      { source: "/seguro-de-autos", destination: "/seguro-de-auto", permanent: true },
      { source: "/cotizar-seguro-auto", destination: "/seguro-de-auto", permanent: true },
      { source: "/terceros-completo", destination: "/seguro-de-auto/terceros-completo", permanent: true },
      { source: "/todo-riesgo", destination: "/seguro-de-auto/todo-riesgo", permanent: true },
      { source: "/terceros-basico", destination: "/seguro-de-auto/terceros-basico", permanent: true },
      { source: "/faq", destination: "/preguntas-frecuentes", permanent: true },
      { source: "/seguro-de-viaje", destination: "/viajero", permanent: true },
      { source: "/asistencia-al-viajero", destination: "/viajero", permanent: true },
      { source: "/prepaga", destination: "/salud", permanent: true },
      { source: "/seguro-de-salud", destination: "/salud", permanent: true },
      { source: "/medicina-prepaga", destination: "/salud", permanent: true },
    ];
  },
};

export default nextConfig;
