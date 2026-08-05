export type ModalidadQuote =
  | "monotributo"
  | "relacion_dependencia"
  | "particular";

export type QuoteStep =
  | "idle"
  | "nombre"
  | "edades"
  | "laboral"
  | "laboral_detalle"
  | "whatsapp"
  | "prepaga"
  | "localidad"
  | "uso"
  | "done";

export type QuoteData = {
  nombre?: string;
  edades?: string;
  modalidad?: ModalidadQuote;
  monotributoCategoria?: string;
  sueldoBruto?: string;
  celular?: string;
  prepaga?: string;
  localidad?: string;
  uso?: string;
};

export type QuoteState = {
  active: boolean;
  step: QuoteStep;
  data: QuoteData;
  leadId?: string;
  pendingSave?: "hot" | "optional" | null;
};

export type QuoteQuickReply = { label: string; value: string };

export type QuoteFlowResult = {
  handled: boolean;
  answer?: string;
  state: QuoteState;
  quickReplies?: QuoteQuickReply[];
  sources?: string[];
};

export function emptyQuoteState(): QuoteState {
  return { active: false, step: "idle", data: {} };
}

const QUOTE_INTENT =
  /\b(cotiz|presupuesto|precio|cu[aá]nto\s+(sale|cuesta|sale|me\s+sale)|quiero\s+(afiliar|asociar|el\s+plan|un\s+plan)|me\s+interesa\s+(el\s+)?plan|armar(me)?\s+(una\s+)?cotizaci[oó]n|pasame\s+(un\s+)?precio)\b/i;

const SKIP =
  /^(no|nop|ahora\s+no|despu[eé]s|saltar|omitir|pasar|na|nada|preferisco\s+no|prefiero\s+no)\b/i;

export function detectsQuoteIntent(text: string): boolean {
  return QUOTE_INTENT.test(text.trim());
}

function firstName(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre;
}

function normalizeLaboral(text: string): ModalidadQuote | null {
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/monotribut/.test(t)) return "monotributo";
  if (/dependenc|relacion|relaci[oó]n|sueldo|empleado|en\s+blanco/.test(t)) {
    return "relacion_dependencia";
  }
  if (/particular|privado|cuenta\s+propia\s+sin\s+mono|pago\s+yo/.test(t)) {
    return "particular";
  }
  if (/^1\b/.test(t.trim())) return "monotributo";
  if (/^2\b/.test(t.trim())) return "relacion_dependencia";
  if (/^3\b/.test(t.trim())) return "particular";
  return null;
}

function extractPhone(text: string): string | null {
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 8 && digits.length <= 15) return digits;
  return null;
}

function extractAgeHint(text: string): number | null {
  const m = text.match(/\b([1-9]\d)\b/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 0 && n <= 120 ? n : null;
}

function laboralLabel(m: ModalidadQuote): string {
  if (m === "monotributo") return "Monotributo";
  if (m === "relacion_dependencia") return "Relación de dependencia";
  return "Particular";
}

export function buildNotas(data: QuoteData, extra?: string): string {
  const lines = [
    "Lead desde chatbot Marxel",
    data.nombre ? `Nombre: ${data.nombre}` : null,
    data.edades ? `Edades titular/grupo: ${data.edades}` : null,
    data.modalidad ? `Situación laboral: ${laboralLabel(data.modalidad)}` : null,
    data.monotributoCategoria
      ? `Categoría monotributo: ${data.monotributoCategoria}`
      : null,
    data.sueldoBruto ? `Sueldo bruto estimado: ${data.sueldoBruto}` : null,
    data.prepaga ? `Prepaga/OS actual: ${data.prepaga}` : null,
    data.localidad ? `Localidad: ${data.localidad}` : null,
    data.uso ? `Uso habitual: ${data.uso}` : null,
    extra || null,
  ].filter(Boolean);
  return lines.join("\n");
}

const LABORAL_REPLIES: QuoteQuickReply[] = [
  { label: "Monotributo", value: "Monotributo" },
  { label: "Relación de dependencia", value: "Relación de dependencia" },
  { label: "Particular", value: "Particular" },
];

const SKIP_REPLIES: QuoteQuickReply[] = [
  { label: "Saltar", value: "Saltar" },
  { label: "Ahora no", value: "Ahora no" },
];

/**
 * Flujo natural, pregunta por pregunta:
 * CLAVE: nombre → edades → laboral (+ detalle) → WhatsApp
 * OPCIONAL: prepaga → localidad → uso
 */
export function processQuoteFlow(
  message: string,
  prev: QuoteState | null | undefined
): QuoteFlowResult {
  const text = message.trim();
  let state: QuoteState = prev?.active
    ? { ...prev, data: { ...prev.data } }
    : emptyQuoteState();

  if (!state.active) {
    if (!detectsQuoteIntent(text)) {
      return { handled: false, state };
    }
    state = { active: true, step: "nombre", data: {} };
    return {
      handled: true,
      state,
      answer:
        "Dale, te ayudo con la cotización. Vamos de a una para que sea más fácil.\n\n¿Cómo te llamás?",
    };
  }

  if (/^(cancelar|salir|dejar\s+cotiz)/i.test(text)) {
    return {
      handled: true,
      state: emptyQuoteState(),
      answer:
        "Sin problema, lo dejamos acá. Cuando quieras retomar, decime quiero cotizar.",
    };
  }

  switch (state.step) {
    case "nombre": {
      if (text.length < 2) {
        return {
          handled: true,
          state,
          answer: "Decime tu nombre, así te armo la cotización a tu medida.",
        };
      }
      state.data.nombre = text.replace(/^me llamo\s+/i, "").trim();
      state.step = "edades";
      return {
        handled: true,
        state,
        answer: `Gracias, ${firstName(state.data.nombre)}. Ahora contame las edades: la del titular y las del grupo familiar, si hay.`,
      };
    }

    case "edades": {
      if (text.length < 1) {
        return {
          handled: true,
          state,
          answer:
            "Necesito las edades del titular y del grupo familiar para cotizar bien.",
        };
      }
      state.data.edades = text;
      state.step = "laboral";
      return {
        handled: true,
        state,
        answer:
          "Perfecto. ¿Cómo estás laboralmente hoy: monotributo, relación de dependencia o particular?",
        quickReplies: LABORAL_REPLIES,
      };
    }

    case "laboral": {
      const modalidad = normalizeLaboral(text);
      if (!modalidad) {
        return {
          handled: true,
          state,
          answer:
            "Contame si sos monotributista, estás en relación de dependencia o particular.",
          quickReplies: LABORAL_REPLIES,
        };
      }
      state.data.modalidad = modalidad;

      if (modalidad === "monotributo") {
        state.step = "laboral_detalle";
        return {
          handled: true,
          state,
          answer: "Bien. ¿En qué categoría de monotributo estás?",
        };
      }
      if (modalidad === "relacion_dependencia") {
        state.step = "laboral_detalle";
        return {
          handled: true,
          state,
          answer: "Bien. ¿Cuál es tu sueldo bruto estimado, más o menos?",
        };
      }

      state.step = "whatsapp";
      return {
        handled: true,
        state,
        answer: `Genial, ${firstName(state.data.nombre || "")}. Con eso ya puedo cotizarte.\n\n¿A qué WhatsApp te mando la propuesta?`,
      };
    }

    case "laboral_detalle": {
      if (text.length < 1) {
        return {
          handled: true,
          state,
          answer:
            state.data.modalidad === "monotributo"
              ? "Decime la categoría del monotributo."
              : "Decime el sueldo bruto estimado.",
        };
      }
      if (state.data.modalidad === "monotributo") {
        state.data.monotributoCategoria = text;
      } else {
        state.data.sueldoBruto = text;
      }
      state.step = "whatsapp";
      return {
        handled: true,
        state,
        answer: `Listo, ${firstName(state.data.nombre || "")}. Ya tengo lo necesario para cotizarte.\n\n¿A qué WhatsApp te envío la propuesta?`,
      };
    }

    case "whatsapp": {
      const phone = extractPhone(text);
      if (!phone) {
        return {
          handled: true,
          state,
          answer:
            "Pasame el WhatsApp con código de área, por ejemplo 3875123456.",
        };
      }
      state.data.celular = phone;
      state.step = "prepaga";
      state.pendingSave = "hot";
      return {
        handled: true,
        state,
        answer:
          "Quedó registrado. Un asesor te va a escribir por ahí.\n\nSi querés, te hago tres preguntas más opcionales. ¿Tenés prepaga u obra social ahora?",
        quickReplies: SKIP_REPLIES,
      };
    }

    case "prepaga": {
      if (!SKIP.test(text)) {
        state.data.prepaga = text;
      }
      state.step = "localidad";
      state.pendingSave = "optional";
      return {
        handled: true,
        state,
        answer: "¿De qué localidad sos? Pensamos en Salta y alrededores.",
        quickReplies: SKIP_REPLIES,
      };
    }

    case "localidad": {
      if (!SKIP.test(text)) {
        state.data.localidad = text;
      }
      state.step = "uso";
      state.pendingSave = "optional";
      return {
        handled: true,
        state,
        answer:
          "Última: ¿para qué suele usarla más? Por ejemplo consultas, estudios o internaciones.",
        quickReplies: SKIP_REPLIES,
      };
    }

    case "uso": {
      if (!SKIP.test(text)) {
        state.data.uso = text;
      }
      state.pendingSave = "optional";
      return {
        handled: true,
        state: { ...state, active: false, step: "done" },
        answer: `Gracias, ${firstName(state.data.nombre || "")}. Ya está todo. Te van a contactar por WhatsApp con la cotización.\n\nSi querés, mientras tanto puedo responderte dudas de A2, A4 o cartilla.`,
      };
    }

    default:
      return { handled: false, state: emptyQuoteState() };
  }
}

export function parseEdadTitular(edades: string | undefined): number | null {
  if (!edades) return null;
  return extractAgeHint(edades);
}

/** Quita markdown tipo **negrita** y viñetas con * */
export function stripMarkdownNoise(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/(^|\n)\s*\*\s+/g, "$1")
    .replace(/\*/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
