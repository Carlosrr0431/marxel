import type { FaqItem } from "@/lib/content";

export type QuoteProduct = "auto" | "moto" | "hogar";

export type ProductLanding = {
  path: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  eyebrow: string;
  crumbLabel: string;
  keywords: string[];
  serviceName: string;
  embed: QuoteProduct;
  introTitle: string;
  intro: string;
  points: { title: string; text: string }[];
  faqs: FaqItem[];
  related: { href: string; label: string }[];
};

export const productLandings: Record<QuoteProduct, ProductLanding> = {
  auto: {
    path: "/seguro-de-auto",
    title: "Seguro de auto en Salta | Cotización online",
    description:
      "Cotizá seguro de auto en Salta con MARXEN y San Cristóbal: terceros básico, completo y todo riesgo. Productor asesor local, respuesta por WhatsApp.",
    h1: "Seguro de auto en Salta",
    lede: "Cotizá online tu seguro de auto con San Cristóbal a través de MARXEN, productor asesor en Salta Capital. Ves planes en minutos y cerrás por WhatsApp, sin vueltas.",
    eyebrow: "MARXEN Seguros · Salta Capital",
    crumbLabel: "Seguro de auto",
    keywords: [
      "seguro de auto Salta",
      "seguros de auto",
      "cotizar seguro de auto",
      "seguro de auto San Cristóbal",
      "terceros completo Salta",
      "todo riesgo auto Salta",
    ],
    serviceName: "Seguro de auto",
    embed: "auto",
    introTitle: "Cobertura para tu auto, con un productor de Salta",
    intro:
      "El seguro de auto es obligatorio (responsabilidad civil, art. 68 de la Ley 24.449) y, según el plan, también cubre tu propio vehículo. En MARXEN cotizás desde Salta con San Cristóbal: cargás año, marca y modelo, comparás terceros básico, terceros completo y todo riesgo, y un asesor te confirma la póliza.",
    points: [
      {
        title: "Terceros básico, completo y todo riesgo",
        text: "Desde responsabilidad civil hasta daños parciales del propio auto, con granizo, cristales y asistencia en ruta según el plan que elijas.",
      },
      {
        title: "Cotización online en Salta",
        text: "El cotizador te muestra primas reales de San Cristóbal. No hay que esperar un mail: ves las opciones y dejás tu WhatsApp para cerrar.",
      },
      {
        title: "Uso particular",
        text: "Estas coberturas están pensadas para uso particular. Taxis, remises y flotas se cotizan aparte con un asesor.",
      },
    ],
    faqs: [
      {
        q: "¿Dónde cotizo un seguro de auto en Salta?",
        a: "En marxen.com.ar/seguro-de-auto. MARXEN es productor asesor en Salta Capital: cotizás con San Cristóbal online y confirmás por WhatsApp +54 9 387 634-8199.",
      },
      {
        q: "¿Qué cubre el seguro de auto?",
        a: "Todos los planes incluyen responsabilidad civil a terceros. El terceros completo suma robo, incendio y destrucción total, y suele incluir granizo o cristales. El todo riesgo agrega daños parciales del propio auto, con franquicia. El detalle se ve en cada cotización.",
      },
      {
        q: "¿El seguro de auto es obligatorio en Argentina?",
        a: "Sí. La responsabilidad civil es obligatoria (art. 68 de la Ley 24.449). El resto de coberturas son optativas y se eligen según el valor del auto y el uso.",
      },
      {
        q: "¿Cuánto sale un seguro de auto en Salta?",
        a: "Depende del año, marca, modelo, código postal y plan. No publicamos un precio fijo: usá el cotizador de esta página o escribinos por WhatsApp. El asesoramiento no tiene costo.",
      },
    ],
    related: [
      { href: "/guias/seguro-de-auto-en-salta", label: "Guía: cómo elegir" },
      { href: "/seguro-de-moto", label: "Seguro de moto" },
      { href: "/seguro-de-hogar", label: "Seguro de hogar" },
      { href: "/salud", label: "Prepaga / salud" },
      { href: "/viajero", label: "Seguro de viaje" },
    ],
  },
  moto: {
    path: "/seguro-de-moto",
    title: "Seguro de moto en Salta | Cotizá online",
    description:
      "Cotizá seguro de moto en Salta con MARXEN y San Cristóbal. Planes Base, Premium y Platinum para uso particular. Productor asesor local.",
    h1: "Seguro de moto en Salta",
    lede: "Asegurá tu moto con San Cristóbal a través de MARXEN en Salta. Cotizá online planes Base, Premium o Platinum y cerrá por WhatsApp.",
    eyebrow: "MARXEN Seguros · Salta Capital",
    crumbLabel: "Seguro de moto",
    keywords: [
      "seguro de moto Salta",
      "cotizar seguro de moto",
      "seguro moto San Cristóbal",
      "MARXEN motos",
    ],
    serviceName: "Seguro de moto",
    embed: "moto",
    introTitle: "Protección para tu moto, con asesor local",
    intro:
      "El seguro de moto cubre responsabilidad civil y, según el plan, robo, incendio y asistencia. Cotizamos motos de uso particular en Salta con San Cristóbal. Si usás la moto para delivery o flota, te armamos la propuesta aparte.",
    points: [
      {
        title: "Base, Premium y Platinum",
        text: "Tres niveles para elegir según cilindrada, valor de la moto y el respaldo que buscás en ruta.",
      },
      {
        title: "Cotizá con patente o datos",
        text: "Podés partir de la patente o cargar año, marca y modelo. Ves primas y dejás tu celular para el alta.",
      },
      {
        title: "Uso particular",
        text: "Estos planes no cubren moto de reparto. Si es laboral, escribinos y cotizamos el ramo correcto.",
      },
    ],
    faqs: [
      {
        q: "¿Puedo cotizar seguro de moto online en Salta?",
        a: "Sí. En esta página cotizás con San Cristóbal a través de MARXEN. Si la patente no figura o es uso comercial, te asesoramos por WhatsApp.",
      },
      {
        q: "¿El seguro de moto es obligatorio?",
        a: "La responsabilidad civil es la cobertura mínima exigida para circular. El resto de coberturas son opcionales y se ven en el cotizador.",
      },
    ],
    related: [
      { href: "/seguro-de-auto", label: "Seguro de auto" },
      { href: "/seguro-de-hogar", label: "Seguro de hogar" },
      { href: "/viajero", label: "Seguro de viaje" },
    ],
  },
  hogar: {
    path: "/seguro-de-hogar",
    title: "Seguro de hogar en Salta | Cotizá online",
    description:
      "Cotizá seguro de hogar en Salta con MARXEN y San Cristóbal: incendio, robo, agua, cristales y RC familiar. Productor asesor local.",
    h1: "Seguro de hogar en Salta",
    lede: "Protegé tu casa y tu contenido con un seguro de hogar cotizado en Salta. Incendio, robo, daños por agua y asistencia, con San Cristóbal y MARXEN.",
    eyebrow: "MARXEN Seguros · Salta Capital",
    crumbLabel: "Seguro de hogar",
    keywords: [
      "seguro de hogar Salta",
      "seguro de casa Salta",
      "cotizar seguro hogar",
      "incendio y robo Salta",
    ],
    serviceName: "Seguro de hogar",
    embed: "hogar",
    introTitle: "Tu casa y tu contenido, con respaldo local",
    intro:
      "El seguro de hogar cubre vivienda, contenido y responsabilidad civil familiar. En MARXEN cotizás planes Base, Plus o Premium con San Cristóbal y te explicamos qué entra (incendio, robo, cristales, agua, electrónicos) según el inmueble en Salta.",
    points: [
      {
        title: "Incendio, robo y RC",
        text: "La base protege el continente y el contenido. Podés sumar cristales, daños por agua y electrónicos.",
      },
      {
        title: "Planes claros",
        text: "Base/Standard, Plus, Premium o una propuesta a medida si tu vivienda o el contenido lo piden.",
      },
      {
        title: "Asistencia 24 h",
        text: "Según el plan, hay asistencia domiciliaria para imprevistos. El detalle se confirma al cotizar.",
      },
    ],
    faqs: [
      {
        q: "¿Qué cubre un seguro de hogar en Salta?",
        a: "Incendio, robo, responsabilidad civil familiar y, según el plan, cristales, agua y electrónicos. La cotización depende de metros, tipo de vivienda y sumas aseguradas.",
      },
      {
        q: "¿Sirve si alquilo?",
        a: "Sí. Hay coberturas pensadas para inquilinos (contenido y RC) y para propietarios. Contanos tu caso y armamos el plan.",
      },
    ],
    related: [
      { href: "/seguro-de-auto", label: "Seguro de auto" },
      { href: "/seguro-de-moto", label: "Seguro de moto" },
      { href: "/salud", label: "Prepaga / salud" },
    ],
  },
};
