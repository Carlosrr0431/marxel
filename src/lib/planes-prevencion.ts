export type PlanId = "A2" | "A4";

export type CoberturaValor = {
  a2: string;
  a4: string;
  /** Quién es mejor en esta fila: a4 | a2 | igual */
  mejor?: "a4" | "a2" | "igual";
};

export type CategoriaPlan = {
  id: string;
  titulo: string;
  icono: string;
  filas: { label: string; valores: CoberturaValor; nota?: string }[];
};

export const planesDetalle = {
  A2: {
    id: "A2" as const,
    nombre: "Plan A2",
    linea: "Línea media",
    tagline: "Cartilla abierta con reintegros y habitación individual",
    resumen:
      "Ideal si buscás flexibilidad con reintegros, buena cobertura odontológica y óptica, sin llegar al tope de la línea premium.",
    highlights: [
      "Cartilla abierta con reintegros",
      "Habitación individual",
      "Farmacias 40%",
      "Ortodoncia 100% (prestadores seleccionados)",
      "30 sesiones de kinesiología y fonoaudiología",
      "Asistencia al viajero",
    ],
    color: "sky",
  },
  A4: {
    id: "A4" as const,
    nombre: "Plan A4",
    linea: "Línea superior",
    tagline: "Cartilla de prestigio, reintegros superadores y más cobertura",
    resumen:
      "Pensado para quienes priorizan cartilla de mayor prestigio, más sesiones, óptica y odontología ampliadas, e incluso acceso a cirugías estéticas.",
    highlights: [
      "Cartilla de prestigio a nivel nacional",
      "Reintegros superadores",
      "40 sesiones de kinesiología y fonoaudiología",
      "Cirugía refractiva 100%",
      "Ortodoncia sin límite de edad",
      "Incluye cirugías estéticas*",
    ],
    color: "teal",
  },
} as const;

export const categoriasCobertura: CategoriaPlan[] = [
  {
    id: "resumen",
    titulo: "Lo esencial",
    icono: "★",
    filas: [
      {
        label: "Tipo de cartilla",
        valores: {
          a2: "Abierta con reintegros",
          a4: "Prestigio nacional + reintegros superadores",
          mejor: "a4",
        },
      },
      {
        label: "Internación",
        valores: {
          a2: "Habitación individual",
          a4: "Habitación individual",
          mejor: "igual",
        },
      },
      {
        label: "Asistencia al viajero",
        valores: {
          a2: "Nacional e internacional / países limítrofes",
          a4: "Nacional e internacional",
          mejor: "igual",
        },
      },
      {
        label: "Programas preventivos",
        valores: { a2: "Incluidos", a4: "Incluidos", mejor: "igual" },
      },
      {
        label: "Cirugías estéticas",
        valores: {
          a2: "No destacada en el plan",
          a4: "Incluidas como diferencial*",
          mejor: "a4",
        },
        nota: "Sujeto a auditoría médica y condiciones del contrato.",
      },
    ],
  },
  {
    id: "ambulatorio",
    titulo: "Consultas y rehabilitación",
    icono: "✚",
    filas: [
      {
        label: "Kinesiología / Fisioterapia",
        valores: {
          a2: "30 sesiones anuales",
          a4: "40 sesiones anuales",
          mejor: "a4",
        },
        nota: "Prestación sujeta a validación de auditoría médica.",
      },
      {
        label: "Fonoaudiología",
        valores: {
          a2: "30 sesiones anuales",
          a4: "40 sesiones anuales",
          mejor: "a4",
        },
      },
      {
        label: "Flebología (esclerosante)",
        valores: {
          a2: "No destacada",
          a4: "8 sesiones",
          mejor: "a4",
        },
      },
      {
        label: "Salud mental",
        valores: {
          a2: "Hasta 30 sesiones (con copago)",
          a4: "Hasta 30 sesiones (con copago)",
          mejor: "igual",
        },
      },
    ],
  },
  {
    id: "farmacia",
    titulo: "Medicamentos y prótesis",
    icono: "💊",
    filas: [
      {
        label: "Farmacias / vademécum",
        valores: {
          a2: "40% de cobertura",
          a4: "Amplio vademécum + coberturas superadoras",
          mejor: "a4",
        },
      },
      {
        label: "Prótesis nacionales",
        valores: { a2: "100%", a4: "100%", mejor: "igual" },
      },
      {
        label: "Prótesis importadas",
        valores: { a2: "50%", a4: "75%", mejor: "a4" },
      },
      {
        label: "Vacunas para alergias",
        valores: {
          a2: "Incluidas",
          a4: "Incluidas (cobertura ampliada)",
          mejor: "a4",
        },
      },
    ],
  },
  {
    id: "odontologia",
    titulo: "Odontología",
    icono: "🦷",
    filas: [
      {
        label: "Consultas y odontología general",
        valores: {
          a2: "Sin tope / sin límite",
          a4: "Sin tope / sin límite",
          mejor: "igual",
        },
      },
      {
        label: "Ortodoncia (reintegro)",
        valores: {
          a2: "Entre 5 y 35 años, por única vez (antigüedad 12 meses)",
          a4: "Sin límite de edad, por única vez (antigüedad 6 meses)",
          mejor: "a4",
        },
      },
      {
        label: "Ortodoncia prestacional",
        valores: {
          a2: "100% hasta 30 años, prestadores designados (12 meses)",
          a4: "100% hasta 35 años, prestadores designados (6 meses)",
          mejor: "a4",
        },
        nota: "Sujeto a validación de auditoría odontológica.",
      },
      {
        label: "Prótesis odontológicas",
        valores: {
          a2: "Con cobertura / reintegro (antigüedad 12 meses)",
          a4: "Prótesis e implantes (6 meses prótesis / 12 implantes)",
          mejor: "a4",
        },
      },
    ],
  },
  {
    id: "optica",
    titulo: "Óptica",
    icono: "👓",
    filas: [
      {
        label: "Cirugía refractiva",
        valores: {
          a2: "50% por única vez (antigüedad 18 meses)",
          a4: "100% por única vez (antigüedad 12 meses)",
          mejor: "a4",
        },
      },
      {
        label: "Lentes de contacto",
        valores: {
          a2: "Incluidos (reintegro anual)",
          a4: "Incluidos (reintegro anual)",
          mejor: "igual",
        },
      },
      {
        label: "Cristales bifocales / armazón",
        valores: {
          a2: "Por reintegro anual",
          a4: "Por reintegro anual (cobertura ampliada)",
          mejor: "a4",
        },
      },
    ],
  },
  {
    id: "familia",
    titulo: "Familia y beneficios",
    icono: "♡",
    filas: [
      {
        label: "Maternidad y recién nacido",
        valores: { a2: "Incluido", a4: "Incluido", mejor: "igual" },
      },
      {
        label: "Extensión PMO si fallece el titular",
        valores: {
          a2: "3 meses sin cargo para el grupo familiar",
          a4: "6 meses sin cargo para el grupo familiar",
          mejor: "a4",
        },
      },
      {
        label: "Subsidio por sepelio",
        valores: {
          a2: "Monto fijo (titular o cónyuge)",
          a4: "Monto fijo (titular o cónyuge)",
          mejor: "igual",
        },
      },
    ],
  },
];

export const diferenciasClave = [
  {
    titulo: "Más sesiones de rehabilitación",
    texto: "A4 suma 40 sesiones de kinesiología y fonoaudiología vs 30 en A2.",
  },
  {
    titulo: "Óptica más completa",
    texto: "Cirugía refractiva al 100% en A4 (vs 50% en A2) y menor antigüedad.",
  },
  {
    titulo: "Ortodoncia sin tope de edad",
    texto: "A4 no limita la edad en ortodoncia por reintegro; A2 va de 5 a 35 años.",
  },
  {
    titulo: "Prótesis importadas",
    texto: "A4 cubre 75% en prótesis importadas; A2 cubre 50%.",
  },
];
