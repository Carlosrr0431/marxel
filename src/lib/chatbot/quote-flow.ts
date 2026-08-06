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
  /\b(cotiz|presupuesto|precio|cu[aá]nto\s+(sale|cuesta|sale|me\s+sale)|quiero\s+(afiliar|asociar|el\s+plan|un\s+plan)|me\s+interesa\s+(el\s+)?plan|armar(me)?\s+(una\s+)?cotizaci[oó]n|pasame\s+(un\s+)?precio|necesito\s+(una\s+)?cotiz)\b/i;

/** Frases que reinician el flujo aunque hubiera otra conversación */
const QUOTE_RESTART =
  /^(quiero\s+)?cotizar\.?$|^(necesito\s+)?(una\s+)?cotizaci[oó]n\.?$|^pasame\s+(un\s+)?precio\.?$|^cu[aá]nto\s+(sale|cuesta)\??$/i;

const SKIP =
  /^(no|nop|ahora\s+no|despu[eé]s|saltar|omitir|pasar|na|nada|preferisco\s+no|prefiero\s+no)\b/i;

export function detectsQuoteIntent(text: string): boolean {
  const t = text.trim();
  return QUOTE_RESTART.test(t) || QUOTE_INTENT.test(t);
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

function startQuote(): QuoteFlowResult {
  return {
    handled: true,
    state: { active: true, step: "nombre", data: {} },
    answer: "¡Dale! ¿Me decís tu nombre?",
  };
}

/**
 * Flujo corto: una sola pregunta por mensaje.
 */
export function processQuoteFlow(
  message: string,
  prev: QuoteState | null | undefined
): QuoteFlowResult {
  const text = message.trim();

  // Reinicio explícito (ej. botón "Quiero cotizar")
  if (QUOTE_RESTART.test(text) || (!prev?.active && detectsQuoteIntent(text))) {
    return startQuote();
  }

  let state: QuoteState = prev?.active
    ? { ...prev, data: { ...prev.data } }
    : emptyQuoteState();

  if (!state.active) {
    if (detectsQuoteIntent(text)) return startQuote();
    return { handled: false, state };
  }

  if (/^(cancelar|salir|dejar\s+cotiz)/i.test(text)) {
    return {
      handled: true,
      state: emptyQuoteState(),
      answer: "Entendido. Cuando quieras, escribí 'quiero cotizar' y arrancamos.",
    };
  }

  switch (state.step) {
    case "nombre": {
      if (text.length < 2 || detectsQuoteIntent(text)) {
        return {
          handled: true,
          state,
          answer: "¿Cómo te llamás?",
        };
      }
      state.data.nombre = text.replace(/^me llamo\s+/i, "").trim();
      state.step = "edades";
      return {
        handled: true,
        state,
        answer: `Bueno, ${firstName(state.data.nombre)}. ¿Cuántos años tenés? Si hay más personas en el grupo, incluí sus edades también.`,
      };
    }

    case "edades": {
      if (text.length < 1) {
        return {
          handled: true,
          state,
          answer: "¿Cuántos años tenés? ¿Hay alguien más en el grupo familiar?",
        };
      }
      state.data.edades = text;
      state.step = "laboral";
      return {
        handled: true,
        state,
        answer: "¿Cómo estás en lo laboral?",
        quickReplies: LABORAL_REPLIES,
      };
    }

    case "laboral": {
      const modalidad = normalizeLaboral(text);
      if (!modalidad) {
        return {
          handled: true,
          state,
          answer: "Elegí una opción:",
          quickReplies: LABORAL_REPLIES,
        };
      }
      state.data.modalidad = modalidad;

      if (modalidad === "monotributo") {
        state.step = "laboral_detalle";
        return {
          handled: true,
          state,
          answer: "¿Qué categoría de monotributo tenés? (A, B, C...)",
        };
      }
      if (modalidad === "relacion_dependencia") {
        state.step = "laboral_detalle";
        return {
          handled: true,
          state,
          answer: "¿Más o menos cuánto es tu sueldo bruto? Un aproximado alcanza.",
        };
      }

      state.step = "whatsapp";
      return {
        handled: true,
        state,
        answer: "¿A qué número te mando la cotización?",
      };
    }

    case "laboral_detalle": {
      if (text.length < 1) {
        return {
          handled: true,
          state,
          answer:
            state.data.modalidad === "monotributo"
              ? "¿Qué categoría de monotributo tenés?"
              : "¿Más o menos cuánto es tu sueldo bruto?",
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
        answer: "¿A qué número te mando la cotización?",
      };
    }

    case "whatsapp": {
      const phone = extractPhone(text);
      if (!phone) {
        return {
          handled: true,
          state,
          answer: "Necesito el número con código de área, por ejemplo 3878...",
        };
      }
      state.data.celular = phone;
      state.step = "prepaga";
      state.pendingSave = "hot";
      const nombre = state.data.nombre ? firstName(state.data.nombre) : "";
      return {
        handled: true,
        state,
        answer: `Perfecto${nombre ? `, ${nombre}` : ""}. Ya te tengo agendado. ¿Tenés alguna prepaga o cobertura ahora? (opcional)`,
        quickReplies: SKIP_REPLIES,
      };
    }

    case "prepaga": {
      if (!SKIP.test(text)) state.data.prepaga = text;
      state.step = "localidad";
      state.pendingSave = "optional";
      return {
        handled: true,
        state,
        answer: "¿De qué parte de Salta sos? (opcional)",
        quickReplies: SKIP_REPLIES,
      };
    }

    case "localidad": {
      if (!SKIP.test(text)) state.data.localidad = text;
      state.step = "uso";
      state.pendingSave = "optional";
      return {
        handled: true,
        state,
        answer: "¿Para qué la usarías principalmente? Consultas, medicamentos, internaciones... (opcional)",
        quickReplies: SKIP_REPLIES,
      };
    }

    case "uso": {
      if (!SKIP.test(text)) state.data.uso = text;
      state.pendingSave = "optional";
      return {
        handled: true,
        state: { ...state, active: false, step: "done" },
        answer: "¡Listo! Te mandamos la cotización por WhatsApp. Cualquier duda, preguntá acá.",
      };
    }

    default:
      return { handled: false, state: emptyQuoteState() };
  }
}

/**
 * Procesa múltiples mensajes en cadena (para cuando el usuario envió varios antes de que el bot respondiera).
 * Detiene la cadena al primer mensaje no reconocido por el flujo.
 */
export async function processQuoteFlowBatch(
  lines: string[],
  prev: QuoteState,
  persist: (s: QuoteState) => Promise<QuoteState>
): Promise<QuoteFlowResult | null> {
  let state = prev;
  let lastResult: QuoteFlowResult | null = null;

  for (const line of lines) {
    const result = processQuoteFlow(line, state);
    if (!result.handled) break;

    // Si el paso requiere guardar en CRM, hacerlo antes de continuar
    if (result.state.pendingSave) {
      state = await persist(result.state);
    } else {
      state = result.state;
    }
    lastResult = { ...result, state };
  }

  return lastResult;
}

export function parseEdadTitular(edades: string | undefined): number | null {
  if (!edades) return null;
  return extractAgeHint(edades);
}

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
