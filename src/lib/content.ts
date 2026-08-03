export const site = {
  name: "Marxel",
  tagline: "Tu marca personal como lo más grande",
  description:
    "Productora de seguros, prepagas y asistencia al viajero. Asesoramiento claro, humano y a tu medida.",
  phone: "+54 9 387 000-0000",
  email: "hola@marxel.com.ar",
  whatsapp: "5493870000000",
  location: "Argentina",
};

export const navLinks = [
  { href: "/seguros", label: "Seguros" },
  { href: "/salud", label: "Salud" },
  { href: "/viajero", label: "Viajero" },
  { href: "/cotizar", label: "Cotizar" },
];

export const seguros = [
  {
    slug: "autos-y-motos",
    title: "Autos y Motos",
    short: "Protección completa para tu vehículo",
    description:
      "Coberturas para autos y motos: responsabilidad civil, todo riesgo, granizo, cristales y asistencia 24 hs en ruta.",
    highlights: ["RC y todo riesgo", "Asistencia en ruta", "Granizo y cristales"],
  },
  {
    slug: "accidentes-personales",
    title: "Accidentes Personales",
    short: "Respaldo ante imprevistos",
    description:
      "Cobertura para vos y tu familia ante accidentes: indemnización, gastos médicos y protección en actividades cotidianas o laborales.",
    highlights: ["Familia y deportes", "Gastos médicos", "Indemnización"],
  },
  {
    slug: "integral-comercios",
    title: "Integral de Comercios",
    short: "Tu negocio, protegido",
    description:
      "Seguro integral para locales y comercios: incendio, robo, responsabilidad civil y cobertura de mercadería.",
    highlights: ["Incendio y robo", "RC comercial", "Mercadería"],
  },
  {
    slug: "art",
    title: "ART",
    short: "Riesgos del trabajo",
    description:
      "Asesoramiento en ART para empresas: cobertura de riesgos laborales, prevención y acompañamiento ante siniestros.",
    highlights: ["Cumplimiento legal", "Prevención", "Gestión de siniestros"],
  },
  {
    slug: "mala-praxis",
    title: "Mala Praxis",
    short: "Respaldo profesional",
    description:
      "Protección específica para profesionales de la salud ante reclamos por responsabilidad profesional.",
    highlights: ["Profesionales de salud", "Defensa legal", "Cobertura a medida"],
  },
  {
    slug: "hogar",
    title: "Hogar",
    short: "Tu casa, cuidada",
    description:
      "Seguro de hogar para vivienda y contenido: incendio, robo, daños por agua y responsabilidad civil familiar.",
    highlights: ["Vivienda y contenido", "Daños por agua", "RC familiar"],
  },
] as const;

export const planesSalud = [
  {
    linea: "Inicial",
    planes: "A1 · A2",
    ideal: "Jóvenes y presupuestos ajustados",
    puntos: [
      "Opciones con y sin copago",
      "Excelente cobertura en cartilla local",
      "Ideal para empezar con tranquilidad",
    ],
  },
  {
    linea: "Media",
    planes: "A3 · A4",
    ideal: "Equilibrio familiar",
    puntos: [
      "Red ampliada de profesionales",
      "Cobertura total sin copagos",
      "Pensada para el día a día familiar",
    ],
  },
  {
    linea: "Premium",
    planes: "A5 y alta gama",
    ideal: "Máxima flexibilidad",
    puntos: [
      "Sistema abierto con reintegros",
      "Mayor cobertura odontológica",
      "Asistencia médica internacional",
    ],
  },
] as const;

export const modalidadesIngreso = [
  {
    title: "Monotributistas",
    text: "Derivá el componente de obra social de tu monotributo como pago a cuenta del plan y aboná solo la diferencia.",
  },
  {
    title: "Relación de dependencia",
    text: "Con opción de cambio en Mi SSSalud podés reorientar tus aportes de ley hacia Prevención Salud.",
  },
  {
    title: "Particular / Ingreso directo",
    text: "Afiliación ágil y digital. Abonás la cuota comercial completa con débito automático o canales digitales.",
  },
] as const;

export type FaqItem = { q: string; a: string };

export const faqSalud: { titulo: string; items: FaqItem[] }[] = [
  {
    titulo: "Ingreso, trámites y familia",
    items: [
      {
        q: "¿Cómo me puedo afiliar y cuánto sale el trámite?",
        a: "Sumarte es fácil y digital. Contactá a tu Productor Asesor, completá la solicitud de afiliación y la Declaración Jurada de Salud. El trámite no tiene arancel ni derecho de inscripción. Los pagos mensuales arrancan cuando se confirma el alta y comienza tu vigencia prestacional.",
      },
      {
        q: "¿A partir de cuándo tengo cobertura si me afilio hoy?",
        a: "La cobertura inicia el primer día del mes correspondiente a tu alta de vigencia, coordinada con tu asesor. En traspasos de aportes, los plazos siguen la normativa de la Superintendencia de Servicios de Salud.",
      },
      {
        q: "¿Qué es la Declaración Jurada de Salud?",
        a: "Es un formulario legal y obligatorio donde el titular y cada integrante del grupo familiar consignan de forma exacta su estado de salud y antecedentes médicos. La falsedad u omisión intencional faculta a rescindir el contrato.",
      },
      {
        q: "Tengo una enfermedad crónica o preexistente, ¿me pueden rechazar?",
        a: "Por la Ley de Medicina Prepaga, ninguna entidad puede rechazar tu admisión por patologías preexistentes. Debés declararlas: la auditoría médica puede aplicar un valor diferencial transitorio, regulado por la SSS.",
      },
      {
        q: "¿A quiénes puedo sumar en el plan familiar?",
        a: "Grupo familiar primario: cónyuge o conviviente, hijos solteros hasta 21 años (o hasta 25 si estudian y están a cargo), hijos con discapacidad a cargo sin límite de edad, y menores bajo guarda o tutela legal.",
      },
    ],
  },
  {
    titulo: "Precios, monotributo y aportes",
    items: [
      {
        q: "¿Qué diferencia hay entre ingreso directo o derivando aportes?",
        a: "Ingreso directo: abonás el 100% de la cuota. Derivación de aportes: trabajadores en relación de dependencia o monotributistas reorientan aportes de ley como pago a cuenta. Si el aporte cubre el plan, tu costo extra puede ser $0; si no, solo abonás la diferencia.",
      },
      {
        q: "¿Qué son los copagos?",
        a: "Son valores fijos que abonás al usar ciertas prestaciones (consultas, diagnóstico, kinesiología). Hay planes con copago (cuota más económica) y sin copago (cuota más alta, cartilla al 100%).",
      },
      {
        q: "¿Me pueden aumentar la cuota por cumplir años?",
        a: "Sí, los planes contemplan franjas etarias. Al cumplir 65 años, si tenés 10 años o más de antigüedad continua en la misma prepaga, quedás exento de aumentos por cambio de franja.",
      },
    ],
  },
  {
    titulo: "Cartilla, coberturas y esperas",
    items: [
      {
        q: "Si me afilio hoy, ¿tengo que esperar meses para atenderme?",
        a: "Las prestaciones del PMO (consultas, guardias, internaciones de urgencia, plan materno infantil) tienen cobertura inmediata desde el día 1. Las carencias (6 a 12 meses) aplican solo a beneficios que exceden el PMO, como cirugías estéticas en planes premium.",
      },
      {
        q: "¿Qué es un plan cerrado y uno abierto con reintegros?",
        a: "Plan cerrado: atención solo con prestadores de cartilla al 100%. Plan abierto (líneas premium): podés atenderte de forma particular y gestionar reintegros según topes del plan.",
      },
      {
        q: "¿Cómo sé qué plan me conviene?",
        a: "Línea Inicial (A1/A2) para jóvenes y presupuestos ajustados; Línea Media (A3/A4) para equilibrio familiar sin copagos; Línea Premium (A5+) para máxima flexibilidad, reintegros y cobertura avanzada.",
      },
    ],
  },
  {
    titulo: "App, órdenes y token",
    items: [
      {
        q: "¿Qué puedo hacer desde la app de Prevención Salud?",
        a: "Consultar cartilla, abonar facturas, cargar recetas, solicitar reintegros, gestionar autorizaciones con foto de la orden y usar la Credencial Digital, incluso sin conexión.",
      },
      {
        q: "¿Qué es el Token y de dónde lo saco?",
        a: "Es un código dinámico que se genera desde la App Mi Prevención. Valida tu identidad en consultorios, laboratorios y farmacias. También funciona offline.",
      },
    ],
  },
];

export const provincias = [
  "Buenos Aires",
  "CABA",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];
