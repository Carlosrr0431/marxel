export type WaTemplate = {
  id: string;
  titulo: string;
  categoria: "apertura" | "seguimiento" | "documentacion" | "cierre";
  producto?: "salud" | "seguros" | "viajero" | "general";
  cuerpo: string;
};

export const WA_TEMPLATES: WaTemplate[] = [
  {
    id: "apertura-salud",
    titulo: "Apertura prepaga",
    categoria: "apertura",
    producto: "salud",
    cuerpo:
      "Hola {{nombre}} 👋 Soy tu asesor de MARXEN. Vi tu consulta por Prevención Salud. ¿Tenés unos minutos para armarte una cotización a medida? Con aportes de monotributo o sueldo a menudo la diferencia queda muy baja.",
  },
  {
    id: "apertura-general",
    titulo: "Primer contacto web",
    categoria: "apertura",
    producto: "general",
    cuerpo:
      "Hola {{nombre}}, te escribo de MARXEN. Recibimos tu solicitud desde la web. ¿Seguimos con la cotización de {{interes}}?",
  },
  {
    id: "recontacto",
    titulo: "Recontacto día siguiente",
    categoria: "seguimiento",
    cuerpo:
      "Hola {{nombre}}, te vuelvo a escribir por si no viste el mensaje de ayer. Puedo enviarte opciones claras de planes y precios sin compromiso. ¿Te viene bien hoy?",
  },
  {
    id: "docs-monotributo",
    titulo: "Pedir docs monotributo",
    categoria: "documentacion",
    producto: "salud",
    cuerpo:
      "Hola {{nombre}}, para avanzar con el alta necesitamos:\n• DNI frente y dorso\n• Constancia de monotributo\n• Últimos 3 pagos\n• Comprobante de opción de cambio en Mi SSSalud\n¿Los podés mandar por acá?",
  },
  {
    id: "docs-relacion",
    titulo: "Pedir docs relación de dependencia",
    categoria: "documentacion",
    producto: "salud",
    cuerpo:
      "Hola {{nombre}}, para tu alta con aportes de sueldo pedimos:\n• DNI frente y dorso\n• Último recibo de sueldo\n• PDF de opción de cambio (Mi SSSalud)\nCon eso procesamos el plan sin costo de trámite.",
  },
  {
    id: "seguros-auto",
    titulo: "Seguro auto / moto",
    categoria: "apertura",
    producto: "seguros",
    cuerpo:
      "Hola {{nombre}}, soy de MARXEN. Para cotizar tu seguro de auto/moto necesito marca, modelo, año y si querés todo riesgo o RC. ¿Me pasás esos datos?",
  },
  {
    id: "viajero",
    titulo: "Asistencia al viajero",
    categoria: "apertura",
    producto: "viajero",
    cuerpo:
      "Hola {{nombre}}! Para armarte la asistencia al viajero decime destino, fechas y cantidad de personas. Te paso opciones de GoAssistance / New Travel.",
  },
  {
    id: "cierre-suave",
    titulo: "Cierre suave",
    categoria: "cierre",
    cuerpo:
      "Hola {{nombre}}, ¿pudiste revisar la propuesta? Si tenés dudas de cartilla, copagos o aportes, las vemos juntos y lo dejamos listo para el alta.",
  },
];

export function fillTemplate(
  cuerpo: string,
  vars: { nombre?: string; interes?: string }
) {
  return cuerpo
    .replaceAll("{{nombre}}", vars.nombre || "")
    .replaceAll("{{interes}}", vars.interes || "tu consulta");
}
