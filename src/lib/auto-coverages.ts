import type { FaqItem } from "@/lib/content";

export type CoverageKey = "terceros-basico" | "terceros-completo" | "todo-riesgo";

export type CoverageMark = "si" | "no" | "segun";

export type CoverageRow = {
  label: string;
  valores: Record<CoverageKey, CoverageMark>;
};

export type AutoCoverage = {
  key: CoverageKey;
  path: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  crumbLabel: string;
  keywords: string[];
  ideal: string;
  includes: string[];
  excludes: string[];
  faqs: FaqItem[];
};

export const COVERAGE_ROWS: CoverageRow[] = [
  {
    label: "Responsabilidad civil (daños a terceros)",
    valores: { "terceros-basico": "si", "terceros-completo": "si", "todo-riesgo": "si" },
  },
  {
    label: "Robo e incendio del propio auto",
    valores: { "terceros-basico": "no", "terceros-completo": "si", "todo-riesgo": "si" },
  },
  {
    label: "Destrucción total por accidente",
    valores: { "terceros-basico": "no", "terceros-completo": "si", "todo-riesgo": "si" },
  },
  {
    label: "Granizo y cristales",
    valores: { "terceros-basico": "no", "terceros-completo": "segun", "todo-riesgo": "segun" },
  },
  {
    label: "Daños parciales del propio auto (choque)",
    valores: { "terceros-basico": "no", "terceros-completo": "no", "todo-riesgo": "si" },
  },
  {
    label: "Auxilio y remolque",
    valores: { "terceros-basico": "no", "terceros-completo": "segun", "todo-riesgo": "segun" },
  },
];

export const AUTO_COVERAGES: Record<CoverageKey, AutoCoverage> = {
  "terceros-basico": {
    key: "terceros-basico",
    path: "/seguro-de-auto/terceros-basico",
    title: "Seguro de auto terceros básico en Salta | Cotizá online",
    description:
      "Seguro contra terceros en Salta: responsabilidad civil obligatoria (Ley 24.449) con San Cristóbal, cotizado por MARXEN. El plan de menor costo para circular.",
    h1: "Seguro de auto terceros básico en Salta",
    lede: "Es la cobertura mínima para circular: cubre los daños que tu auto pueda causar a otras personas o sus bienes. Cotizá online con San Cristóbal a través de MARXEN, en Salta Capital.",
    crumbLabel: "Terceros básico",
    keywords: [
      "seguro contra terceros Salta",
      "terceros básico auto",
      "responsabilidad civil auto Salta",
      "seguro obligatorio auto",
    ],
    ideal: "Quienes buscan circular en regla al menor costo, con autos de menor valor o uso ocasional.",
    includes: [
      "Responsabilidad civil: daños a terceros (personas o bienes), según Ley 24.449.",
      "Protección al conductor, según condiciones de la póliza.",
      "Monto asegurado actualizado según tarifa de San Cristóbal.",
    ],
    excludes: [
      "Robo o hurto del vehículo.",
      "Incendio del propio auto.",
      "Granizo, cristales y cubiertas.",
      "Daños parciales o totales de tu auto por accidente.",
    ],
    faqs: [
      {
        q: "¿El terceros básico alcanza para circular en Salta?",
        a: "Sí. La ley exige responsabilidad civil. El terceros básico de San Cristóbal cubre ese mínimo. Si querés proteger también tu auto (robo, incendio, granizo), conviene terceros completo o todo riesgo.",
      },
      {
        q: "¿Qué no cubre el terceros básico?",
        a: "No cubre daños, robo ni incendio de tu propio vehículo. Solo responde ante reclamos de terceros. El detalle se confirma en la cotización.",
      },
    ],
  },
  "terceros-completo": {
    key: "terceros-completo",
    path: "/seguro-de-auto/terceros-completo",
    title: "Terceros completo en Salta: seguro de auto | MARXEN",
    description:
      "Terceros completo en Salta con San Cristóbal: RC, robo, incendio, destrucción total, granizo y cristales según plan. Cotizá online con MARXEN.",
    h1: "Seguro de auto terceros completo en Salta",
    lede: "El plan que más piden: cubre a terceros y también el robo, incendio y destrucción total de tu auto. Granizo y cristales entran según el producto. Cotizá en Salta con MARXEN.",
    crumbLabel: "Terceros completo",
    keywords: [
      "terceros completo Salta",
      "seguro auto terceros completo",
      "robo incendio auto Salta",
      "cotizar terceros completo",
    ],
    ideal: "Quienes quieren un nivel alto de protección a un costo moderado, sin pagar todo riesgo.",
    includes: [
      "Responsabilidad civil obligatoria.",
      "Robo e incendio total y/o parcial, según póliza.",
      "Destrucción total por accidente (cuando reparar supera el porcentaje de la póliza, habitualmente 80%).",
      "Granizo y cristales, según el código de producto.",
      "Auxilio y remolque, según plan.",
    ],
    excludes: [
      "Daños parciales de tu auto por choque de culpa propia (eso es todo riesgo, con franquicia).",
      "Uso de taxi, remise o flota: se cotiza aparte.",
    ],
    faqs: [
      {
        q: "¿Qué es un seguro de auto terceros completo?",
        a: "Además de la responsabilidad civil, cubre daños a tu vehículo por incendio o robo (total y/o parcial) y la destrucción total por accidente. No cubre el choque parcial de tu propio auto: eso entra en todo riesgo.",
      },
      {
        q: "¿Terceros completo incluye granizo en Salta?",
        a: "En las fichas comerciales de San Cristóbal el granizo suele ir sin límite en terceros completo, pero el código de producto y la póliza lo confirman. Lo ves al cotizar con MARXEN.",
      },
    ],
  },
  "todo-riesgo": {
    key: "todo-riesgo",
    path: "/seguro-de-auto/todo-riesgo",
    title: "Seguro de auto todo riesgo en Salta | Cotizá online",
    description:
      "Todo riesgo con franquicia en Salta: cubre también los daños parciales de tu auto. Cotizá San Cristóbal con MARXEN, productor asesor local.",
    h1: "Seguro de auto todo riesgo en Salta",
    lede: "La cobertura más completa: suma a terceros completo los daños parciales de tu propio auto, con una franquicia. Ideal si el vehículo es de mayor valor. Cotizá online en Salta.",
    crumbLabel: "Todo riesgo",
    keywords: [
      "todo riesgo auto Salta",
      "seguro todo riesgo Salta",
      "todo riesgo con franquicia",
      "cotizar todo riesgo San Cristóbal",
    ],
    ideal: "Autos de mayor valor o quien quiere que un choque propio también quede cubierto, pagando la franquicia.",
    includes: [
      "Todo lo de terceros completo (RC, robo, incendio, destrucción total, granizo y cristales según plan).",
      "Daños parciales del propio auto por accidente, vandalismo u otros eventos de casco, según póliza.",
      "Franquicia a cargo del asegurado en daños parciales: el monto se ve en la cotización.",
    ],
    excludes: [
      "El tramo de la franquicia (lo pagás vos en un daño parcial).",
      "Usos no declarados (taxi, remise, delivery) salvo cotización específica.",
    ],
    faqs: [
      {
        q: "¿Por qué elegir todo riesgo?",
        a: "Porque cubre los daños parciales de tu propio auto, no solo a terceros. Si chocás o te dañan el vehículo, San Cristóbal cubre la reparación por encima de la franquicia. Es el producto más completo del portfolio.",
      },
      {
        q: "¿Qué es la franquicia del todo riesgo?",
        a: "Es el monto que queda a tu cargo en un daño parcial. El resto lo cubre la póliza. El valor depende del auto y del plan: lo ves al cotizar, no hay un número fijo publicado.",
      },
    ],
  },
};

export const AUTO_QUOTE_STEPS = [
  {
    name: "Entrá al cotizador",
    text: "Abrí marxen.com.ar/seguro-de-auto desde Salta o cualquier lugar. El cotizador es de San Cristóbal, intermediado por MARXEN.",
  },
  {
    name: "Cargá el vehículo",
    text: "Completá año, marca, modelo y versión (o la patente, si el flujo lo pide) y el código postal.",
  },
  {
    name: "Compará planes",
    text: "Vas a ver terceros básico, terceros completo y todo riesgo con prima real. Elegí según el valor del auto y lo que quieras cubrir.",
  },
  {
    name: "Cerrá por WhatsApp",
    text: "Dejá tu celular. Un asesor de MARXEN en Salta confirma la póliza. Cotizar no tiene costo ni te obliga a contratar.",
  },
];
