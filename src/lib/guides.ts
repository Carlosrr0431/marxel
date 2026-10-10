import type { FaqItem } from "@/lib/content";

export type Guide = {
  path: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  keywords: string[];
  paragraphs: { title: string; text: string }[];
  faqs: FaqItem[];
  related: { href: string; label: string }[];
};

export const GUIDES: Guide[] = [
  {
    path: "/guias/seguro-de-auto-en-salta",
    title: "Cómo elegir seguro de auto en Salta | Guía MARXEN",
    description:
      "Guía para elegir entre terceros básico, terceros completo y todo riesgo en Salta. Qué cubre cada plan de San Cristóbal y cómo cotizar con MARXEN.",
    h1: "Cómo elegir un seguro de auto en Salta",
    lede: "No hay un único plan correcto: depende del valor del auto, si lo usás todos los días y qué riesgo querés transferir. Esta guía resume lo que cotizamos con San Cristóbal desde Salta Capital.",
    keywords: [
      "cómo elegir seguro de auto Salta",
      "qué seguro de auto me conviene",
      "terceros o todo riesgo",
    ],
    paragraphs: [
      {
        title: "Empieza por lo obligatorio",
        text: "En Argentina la responsabilidad civil es obligatoria (art. 68 de la Ley 24.449). Sin eso no podés circular. El terceros básico cubre ese piso: daños a otras personas o sus bienes. No cubre tu auto.",
      },
      {
        title: "Cuándo pasar a terceros completo",
        text: "Si el auto tiene un valor que te dolería perder por un robo, un incendio o una destrucción total, el terceros completo es el salto natural. En Salta el granizo también importa: en muchos productos de San Cristóbal entra en este nivel, siempre según el código cotizado.",
      },
      {
        title: "Cuándo vale la pena el todo riesgo",
        text: "El todo riesgo suma los daños parciales de tu propio auto (un choque, un rayón grave) con franquicia. Suele convenir en vehículos más nuevos o de mayor suma. La franquicia no es un precio oculto: aparece en la cotización.",
      },
      {
        title: "Cómo cotizar sin comprometerte",
        text: "En MARXEN ves primas reales online y cerrás por WhatsApp. El asesoramiento no tiene costo. Taxis, remises y flotas no van por este cotizador: se arman aparte.",
      },
    ],
    faqs: [
      {
        q: "¿Cuál es el seguro de auto más barato en Salta?",
        a: "El terceros básico suele ser el de menor prima porque solo cubre a terceros. El precio exacto depende del auto y del código postal. Cotizá en /seguro-de-auto; no publicamos un precio único.",
      },
      {
        q: "¿MARXEN es la aseguradora?",
        a: "No. MARXEN es productor asesor en Salta. La póliza de auto la emite San Cristóbal Seguros. Te representamos frente a la compañía.",
      },
    ],
    related: [
      { href: "/seguro-de-auto", label: "Cotizar seguro de auto" },
      { href: "/seguro-de-auto/terceros-completo", label: "Terceros completo" },
      { href: "/seguro-de-auto/todo-riesgo", label: "Todo riesgo" },
    ],
  },
  {
    path: "/guias/prepaga-en-salta",
    title: "Prepaga en Salta: A2, A4 y aportes | Guía MARXEN",
    description:
      "Cómo elegir prepaga en Salta: planes A2 y A4 de Prevención Salud, derivación de aportes de monotributo o relación de dependencia, y cartilla local.",
    h1: "Cómo elegir una prepaga en Salta",
    lede: "La prepaga no se elige solo por la cuota: importan cartilla en Salta, copagos, grupo familiar y si podés derivar aportes. MARXEN asesora planes de Prevención Salud; no es la prepaga.",
    keywords: [
      "prepaga Salta guía",
      "plan A2 o A4",
      "derivar aportes prepaga Salta",
    ],
    paragraphs: [
      {
        title: "Cartilla local primero",
        text: "Los planes A2 y A4 de Prevención Salud que asesoramos tienen cartilla en la provincia de Salta. Antes de decidir, mirá prestadores en marxen.com.ar/salud/cartilla-medica: clínicas, sanatorios y farmacias.",
      },
      {
        title: "A2 y A4 no son lo mismo",
        text: "A2 entra en la línea inicial (jóvenes o presupuestos más ajustados, con o sin copago según el producto). A4 está en la línea media, pensada para familias y con más equilibrio de prestaciones. La comparativa interactiva está en /salud.",
      },
      {
        title: "Aportes: monotributo o relación de dependencia",
        text: "Si sos monotributista o estás en relación de dependencia, parte de la cuota puede cubrirse derivando aportes de ley. Si el aporte no alcanza, abonás la diferencia. El ingreso particular paga la cuota completa. El trámite de afiliación no tiene arancel de inscripción.",
      },
      {
        title: "No cites un precio de internet",
        text: "La cuota varía por edad, grupo y aportes. Un asesor de MARXEN arma la propuesta. Por ley, una prepaga no puede rechazar el ingreso por preexistencias declaradas; puede haber un diferencial transitorio regulado.",
      },
    ],
    faqs: [
      {
        q: "¿Prepaga y seguro de salud son lo mismo?",
        a: "En la búsqueda cotidiana sí: la gente busca “seguro de salud” y “prepaga”. En MARXEN asesoramos medicina prepaga Prevención Salud en Salta, no una obra social propia.",
      },
    ],
    related: [
      { href: "/salud", label: "Planes A2 y A4" },
      { href: "/salud/cartilla-medica", label: "Cartilla médica" },
    ],
  },
  {
    path: "/guias/seguro-de-viaje-schengen",
    title: "Seguro de viaje Schengen desde Salta | Guía MARXEN",
    description:
      "Qué cobertura pide Europa (Schengen) y cómo contratar asistencia al viajero desde Salta con MARXEN: montos, repatriación y cuándo cotizar.",
    h1: "Seguro de viaje Schengen: qué contratar desde Salta",
    lede: "Para entrar al espacio Schengen necesitás asistencia médica de al menos 30.000 euros, repatriación y vigencia en todo el viaje. Se contrata antes de salir del país. MARXEN cotiza desde Salta.",
    keywords: [
      "seguro de viaje Schengen",
      "asistencia al viajero Europa",
      "seguro viaje Salta",
    ],
    paragraphs: [
      {
        title: "El mínimo de Schengen no es un plan “barato cualquiera”",
        text: "El requisito habitual es cobertura médica mínima de 30.000 EUR, repatriación, validez en todos los países Schengen y durante toda la estadía. Los planes internacionales que cotizamos con GO! ASSISTANCE superan ese piso; el voucher se confirma al emitir.",
      },
      {
        title: "No reemplaza a la prepaga",
        text: "La prepaga cubre tu salud en Argentina. El seguro de viaje cubre urgencias médicas y logística fuera del país (y, según el plan, equipaje). Son productos distintos.",
      },
      {
        title: "Cuándo cotizar",
        text: "Antes de sacar el pasaje definitivo conviene cotizar destino, fechas y edades. Hay recargos etarios y preexistencias que hay que declarar. ETIAS, cuando aplique, no reemplaza la asistencia.",
      },
    ],
    faqs: [
      {
        q: "¿Puedo comprar el seguro de viaje en Salta?",
        a: "Sí. MARXEN cotiza asistencia al viajero desde Salta Capital. Usá /viajero o WhatsApp 0387 572-4473.",
      },
    ],
    related: [
      { href: "/viajero", label: "Cotizar seguro de viaje" },
      { href: "/salud", label: "Prepaga en Salta" },
    ],
  },
  {
    path: "/guias/seguro-de-moto-en-salta",
    title: "Seguro de moto en Salta | Guía MARXEN",
    description:
      "Qué cubre un seguro de moto en Salta, la diferencia entre uso particular y reparto, y cómo cotizarlo con MARXEN.",
    h1: "Cómo elegir un seguro de moto en Salta",
    lede: "La responsabilidad civil es el piso para circular. El resto depende de la cilindrada, el valor de la moto y si el uso es particular. MARXEN cotiza motos en Salta; no es la compañía que emite la póliza.",
    keywords: [
      "seguro de moto en Salta",
      "seguro de motos Salta",
      "cotizar seguro de moto",
    ],
    paragraphs: [
      {
        title: "Lo obligatorio y lo opcional",
        text: "Para circular hace falta responsabilidad civil. Los planes que cotizamos suman, según el nivel, robo, incendio y asistencia. El detalle se ve en la cotización, no en un precio publicado.",
      },
      {
        title: "Uso particular",
        text: "El cotizador online es para uso particular. Delivery, reparto y flotas se cotizan aparte: el ramo y el precio cambian.",
      },
      {
        title: "Cómo cotizar",
        text: "En marxen.com.ar/seguro-de-moto podés partir de la patente o cargar año, marca y modelo. Un asesor de Salta confirma el alta por WhatsApp 0387 572-4473. El asesoramiento no tiene costo.",
      },
    ],
    faqs: [
      {
        q: "¿MARXEN asegura motos en Salta?",
        a: "Sí, como productor asesor. La póliza la emite la compañía. Cotizá en /seguro-de-moto o escribinos por WhatsApp.",
      },
    ],
    related: [
      { href: "/seguro-de-moto", label: "Cotizar seguro de moto" },
      { href: "/seguro-de-auto", label: "Seguro de auto" },
    ],
  },
  {
    path: "/guias/obra-social-y-prepaga-en-salta",
    title: "Obra social y prepaga en Salta | Guía MARXEN",
    description:
      "Diferencia entre obra social, prepaga y seguro de salud en Salta, y cómo derivar aportes de monotributo o relación de dependencia con MARXEN.",
    h1: "Obra social, prepaga y seguro de salud en Salta",
    lede: "Obra social, prepaga y seguro de salud no son lo mismo. MARXEN no es una obra social: asesora planes de Prevención Salud y la derivación de aportes cuando tu situación laboral lo permite.",
    keywords: [
      "obra social Salta",
      "derivar obra social",
      "seguro de salud Salta",
      "prepaga o obra social",
    ],
    paragraphs: [
      {
        title: "Tres nombres, tres cosas",
        text: "La obra social es la cobertura de ley ligada al trabajo o al monotributo. La prepaga es un plan de medicina privada, como Prevención Salud. “Seguro de salud” es la forma en que mucha gente busca esa prepaga. MARXEN asesora la prepaga; no reemplaza a la Superintendencia ni a tu empleador.",
      },
      {
        title: "Cuándo se pueden derivar aportes",
        text: "Si estás en relación de dependencia, la opción de cambio se gestiona en Mi SSSalud. Si sos monotributista, el componente de obra social puede usarse como pago a cuenta del plan. Si el aporte no cubre la cuota, abonás la diferencia. El ingreso particular paga la cuota completa.",
      },
      {
        title: "Qué mirar antes de cambiar",
        text: "Cartilla en Salta, copagos, grupo familiar y preexistencias declaradas. Las prestaciones del PMO tienen cobertura desde el día 1; las carencias aplican a extras. Una prepaga no puede rechazar el ingreso por una preexistencia declarada. La cuota no se publica: depende de edad, grupo y aportes.",
      },
    ],
    faqs: [
      {
        q: "¿MARXEN es una obra social?",
        a: "No. Es un productor asesor en Salta Capital. Te ayuda a elegir un plan de Prevención Salud y a orientar los aportes cuando corresponde.",
      },
      {
        q: "¿Dónde pido la derivación?",
        a: "En marxen.com.ar/salud o por WhatsApp 0387 572-4473. El asesor confirma si tu caso es monotributo, relación de dependencia o particular.",
      },
    ],
    related: [
      { href: "/salud", label: "Planes de salud" },
      { href: "/guias/prepaga-en-salta", label: "Guía de prepaga" },
      { href: "/salud/cartilla-medica", label: "Cartilla médica" },
    ],
  },
];
