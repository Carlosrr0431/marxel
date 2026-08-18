import type { ProductoInteres } from "@/lib/crm/types";

export type ModalidadQuote =
  | "monotributo"
  | "relacion_dependencia"
  | "particular";

export type SeguroGrupo = "auto_moto" | "hogar_comercio" | "praxis_art_ap";

export type QuoteStep =
  | "idle"
  | "producto"
  | "seguro_tipo"
  | "seguro_detalle"
  | "laboral"
  | "laboral_detalle"
  | "grupo"
  | "edades"
  | "uso"
  | "viajero_destino"
  | "nombre"
  | "whatsapp"
  | "localidad"
  | "prepaga"
  | "done";

export type QuoteData = {
  producto?: ProductoInteres;
  seguroGrupo?: SeguroGrupo;
  seguroDetalle?: string;
  viajeroDestino?: string;
  grupoFamiliar?: string;
  nombre?: string;
  celular?: string;
  localidad?: string;
  edades?: string;
  modalidad?: ModalidadQuote;
  monotributoCategoria?: string;
  sueldoBruto?: string;
  prepaga?: string;
  uso?: string;
};

export type QuoteState = {
  active: boolean;
  step: QuoteStep;
  data: QuoteData;
  leadId?: string;
  pendingSave?: "hot" | "optional" | null;
  channel?: "web" | "whatsapp";
};

export type QuoteQuickReply = {
  label: string;
  value: string;
  hint?: string;
};

export type QuoteFlowResult = {
  handled: boolean;
  answer?: string;
  state: QuoteState;
  quickReplies?: QuoteQuickReply[];
  sources?: string[];
};

export const MENU_SEGUROS = "menu:seguros";
export const MENU_SALUD = "menu:salud";
export const MENU_VIAJERO = "menu:viajero";
export const MENU_WHATSAPP = "menu:whatsapp";

export const MAIN_MENU: QuoteQuickReply[] = [
  {
    label: "Cotizar un Seguro",
    value: MENU_SEGUROS,
    hint: "Autos, motos, hogar, comercio, ART, AP, mala praxis",
  },
  {
    label: "Consultar Cobertura de Salud",
    value: MENU_SALUD,
    hint: "Prepagas y derivación de aportes",
  },
  {
    label: "Asistencia al Viajero",
    value: MENU_VIAJERO,
    hint: "Cobertura nacional e internacional",
  },
  {
    label: "Hablar con un Asesor por WhatsApp",
    value: MENU_WHATSAPP,
  },
];

const PRODUCT_REPLIES: QuoteQuickReply[] = MAIN_MENU.filter(
  (item) => item.value !== MENU_WHATSAPP
);

const SEGURO_REPLIES: QuoteQuickReply[] = [
  { label: "Auto / Moto", value: "Auto/Moto" },
  { label: "Hogar / Comercio", value: "Hogar/Comercio" },
  { label: "Mala Praxis / ART / AP", value: "Mala Praxis / ART / AP" },
];

const LABORAL_REPLIES: QuoteQuickReply[] = [
  { label: "Relación de dependencia", value: "Relación de dependencia" },
  { label: "Monotributo", value: "Monotributo" },
  { label: "Particular", value: "Particular" },
];

const GRUPO_REPLIES: QuoteQuickReply[] = [
  { label: "Individual", value: "Individual" },
  { label: "Grupo familiar", value: "Grupo familiar" },
];

const SKIP_REPLIES: QuoteQuickReply[] = [
  { label: "Saltar", value: "Saltar" },
  { label: "Ahora no", value: "Ahora no" },
];

const SALUD_PITCH = `En MARXEN Salud trabajamos con diferentes opciones de medicina prepaga y planes de salud adaptados a tus necesidades y presupuesto.

Podemos ayudarte a:
- Elegir la mejor cartilla médica (médicos, clínicas y sanatorios de tu zona).
- Derivar tus aportes laborales (Monotributo o Relación de dependencia) para pagar menos o $0 de costo adicional.
- Encontrar el plan ideal para vos o tu grupo familiar.

Para enviarte una propuesta a medida, ¿cuál es tu situación laboral actual?`;

export function emptyQuoteState(): QuoteState {
  return { active: false, step: "idle", data: {} };
}

export function usesChoiceGrid(step: QuoteStep): boolean {
  return (
    step === "producto" ||
    step === "seguro_tipo" ||
    step === "laboral" ||
    step === "grupo"
  );
}

const QUOTE_INTENT =
  /\b(cotiz|presupuesto|precio|cu[aá]nto\s+(sale|cuesta|me\s+sale)|quiero\s+(afiliar|asociar|el\s+plan|un\s+plan|un\s+seguro)|armar(me)?\s+(una\s+)?cotizaci[oó]n|pasame\s+(un\s+)?precio|necesito\s+(una\s+)?cotiz|asesorarme|asesoramiento)\b/i;

const QUOTE_RESTART =
  /^(quiero\s+)?cotizar\.?$|^(necesito\s+)?(una\s+)?cotizaci[oó]n\.?$|^pasame\s+(un\s+)?precio\.?$|^cu[aá]nto\s+(sale|cuesta)\??$|^(quiero\s+)?asesorarme\.?$/i;

const HEALTH_COVERAGE =
  /\b(plan(es)?(\s+de\s+salud)?|cobertura|cartilla|prepaga|obra\s+social|aportes|ortodoncia|kinesiolog|psicolog|afiliar|comparativ)\b/i;

const SKIP =
  /^(no|nop|ahora\s+no|despu[eé]s|saltar|omitir|pasar|na|nada|prefiero\s+no)\b/i;

export function detectsQuoteIntent(text: string): boolean {
  const t = text.trim();
  return (
    QUOTE_RESTART.test(t) ||
    QUOTE_INTENT.test(t) ||
    t === MENU_SEGUROS ||
    t === MENU_SALUD ||
    t === MENU_VIAJERO
  );
}

export function detectsHealthCoverageIntent(text: string): boolean {
  return HEALTH_COVERAGE.test(text.trim());
}

export function isSaludHandoffReady(state: QuoteState | null | undefined): boolean {
  const data = state?.data;
  return Boolean(
    data?.producto === "salud" &&
      data.nombre &&
      data.celular &&
      data.modalidad &&
      data.edades
  );
}

function firstName(nombre: string): string {
  return prettyName(nombre).split(/\s+/)[0] || prettyName(nombre);
}

function prettyName(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .map((word) =>
      word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word
    )
    .join(" ");
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

function productLabel(p: ProductoInteres): string {
  if (p === "salud") return "Salud";
  if (p === "seguros") return "Seguros";
  if (p === "viajero") return "Viajero";
  return "consulta";
}

function seguroLabel(grupo: SeguroGrupo): string {
  if (grupo === "auto_moto") return "Auto / Moto";
  if (grupo === "hogar_comercio") return "Hogar / Comercio";
  return "Mala Praxis / ART / AP";
}

function normalizeLaboral(text: string): ModalidadQuote | null {
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/monotribut/.test(t)) return "monotributo";
  if (/dependenc|relacion|relaci[oó]n|sueldo|empleado|en\s+blanco/.test(t)) {
    return "relacion_dependencia";
  }
  if (/particular|privado|ingreso\s+directo|pago\s+yo/.test(t)) {
    return "particular";
  }
  return null;
}

function normalizeSeguro(text: string): SeguroGrupo | null {
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/auto|moto|vehiculo|veh[ií]culo/.test(t)) return "auto_moto";
  if (/hogar|casa|vivienda|comercio|local|negocio/.test(t)) return "hogar_comercio";
  if (/praxis|art\b|accidente|ap\b/.test(t)) return "praxis_art_ap";
  return null;
}

function normalizeGrupo(text: string): string | null {
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/individual|solo|una\s+persona|^1\b/.test(t)) return "Individual";
  if (/familiar|grupo|familia|pareja|hijos/.test(t)) return "Grupo familiar";
  return null;
}

export function buildNotas(data: QuoteData, extra?: string): string {
  const lines = [
    "Lead desde chatbot MARXEN",
    data.producto ? `Interés: ${productLabel(data.producto)}` : null,
    data.seguroGrupo ? `Ramo: ${seguroLabel(data.seguroGrupo)}` : null,
    data.seguroDetalle ? `Detalle seguro: ${data.seguroDetalle}` : null,
    data.viajeroDestino ? `Viaje: ${data.viajeroDestino}` : null,
    data.nombre ? `Nombre: ${data.nombre}` : null,
    data.celular ? `WhatsApp: ${data.celular}` : null,
    data.localidad ? `Localidad: ${data.localidad}` : null,
    data.modalidad ? `Situación laboral: ${laboralLabel(data.modalidad)}` : null,
    data.monotributoCategoria
      ? `Categoría monotributo: ${data.monotributoCategoria}`
      : null,
    data.sueldoBruto ? `Sueldo bruto estimado: ${data.sueldoBruto}` : null,
    data.grupoFamiliar ? `Cobertura: ${data.grupoFamiliar}` : null,
    data.edades ? `Edades titular/grupo: ${data.edades}` : null,
    data.uso ? `Busca: ${data.uso}` : null,
    data.prepaga ? `Prepaga/OS actual: ${data.prepaga}` : null,
    extra || null,
  ].filter(Boolean);
  return lines.join("\n");
}

function askNombre(data: QuoteData): QuoteFlowResult {
  return {
    handled: true,
    state: { active: true, step: "nombre", data },
    answer: "¿Me decís tu nombre?",
  };
}

function startSeguros(data: QuoteData = {}): QuoteFlowResult {
  return {
    handled: true,
    state: { active: true, step: "seguro_tipo", data: { ...data, producto: "seguros" } },
    answer: "¿Qué querés proteger?",
    quickReplies: SEGURO_REPLIES,
  };
}

function startSalud(): QuoteFlowResult {
  return {
    handled: true,
    state: { active: true, step: "laboral", data: { producto: "salud" } },
    answer: SALUD_PITCH,
    quickReplies: LABORAL_REPLIES,
  };
}

function startViajero(): QuoteFlowResult {
  return {
    handled: true,
    state: { active: true, step: "viajero_destino", data: { producto: "viajero" } },
    answer: "¿Cuál es tu destino y las fechas aproximadas de viaje?",
  };
}

function startFromMessage(text: string): QuoteFlowResult {
  if (text === MENU_SALUD || detectsHealthCoverageIntent(text)) return startSalud();
  if (text === MENU_SEGUROS) return startSeguros();
  if (text === MENU_VIAJERO) return startViajero();

  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/viajer|viaje/.test(t)) return startViajero();
  if (/salud|prepaga|obra\s+social/.test(t)) return startSalud();
  if (/seguro|auto|moto|hogar|comercio|praxis|\bart\b/.test(t)) {
    const grupo = normalizeSeguro(text);
    return grupo
      ? askSeguroDetalle({ producto: "seguros", seguroGrupo: grupo })
      : startSeguros();
  }

  return {
    handled: true,
    state: { active: true, step: "producto", data: {} },
    answer: "¿En qué te puedo ayudar hoy?",
    quickReplies: PRODUCT_REPLIES,
  };
}

function askSeguroDetalle(data: QuoteData): QuoteFlowResult {
  const grupo = data.seguroGrupo;
  const prompt =
    grupo === "auto_moto"
      ? "Ingresá el año y modelo de tu vehículo."
      : grupo === "hogar_comercio"
        ? "Contanos el tipo de vivienda o el rubro del comercio."
        : "Contanos tu actividad o profesión.";
  return {
    handled: true,
    state: { active: true, step: "seguro_detalle", data },
    answer: `${prompt} Después te pido el WhatsApp para enviarte las opciones.`,
  };
}

function afterWhatsapp(state: QuoteState): QuoteFlowResult {
  const nombre = state.data.nombre ? firstName(state.data.nombre) : "";
  state.step = "localidad";
  state.pendingSave = "hot";
  return {
    handled: true,
    state,
    answer: `Perfecto${nombre ? `, ${nombre}` : ""}. Ya te tengo agendado. ¿De qué localidad sos?`,
  };
}

function finishQuote(state: QuoteState, extra?: string): QuoteFlowResult {
  state.pendingSave = extra ? "optional" : "hot";
  const nombre = state.data.nombre ? firstName(state.data.nombre) : "";
  return {
    handled: true,
    state: { ...state, active: false, step: "done" },
    answer: `Listo${nombre ? `, ${nombre}` : ""}. Un asesor de MARXEN te escribe por WhatsApp con estos datos. Si tenés alguna duda, preguntá acá.`,
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

  if (text === MENU_WHATSAPP) {
    return {
      handled: true,
      state: prev?.active ? prev : emptyQuoteState(),
      answer: "Te abro WhatsApp para hablar con un asesor de MARXEN.",
    };
  }

  if (
    text === MENU_SEGUROS ||
    text === MENU_SALUD ||
    text === MENU_VIAJERO ||
    QUOTE_RESTART.test(text) ||
    (!prev?.active && detectsQuoteIntent(text))
  ) {
    return startFromMessage(text);
  }

  let state: QuoteState = prev?.active
    ? { ...prev, data: { ...prev.data } }
    : emptyQuoteState();

  if (!state.active) {
    if (
      isSaludHandoffReady(prev) &&
      detectsHealthCoverageIntent(text) &&
      !detectsQuoteIntent(text)
    ) {
      return { handled: false, state: prev || emptyQuoteState() };
    }
    if (detectsQuoteIntent(text) || detectsHealthCoverageIntent(text)) {
      return startFromMessage(text);
    }
    return { handled: false, state };
  }

  if (/^(cancelar|salir|dejar\s+cotiz|menu|men[uú])$/i.test(text)) {
    return {
      handled: true,
      state: emptyQuoteState(),
      answer: "Entendido. Cuando quieras, elegí una opción del menú.",
      quickReplies: PRODUCT_REPLIES,
    };
  }

  switch (state.step) {
    case "producto":
      return startFromMessage(text);

    case "seguro_tipo": {
      const grupo = normalizeSeguro(text);
      if (!grupo) {
        return {
          handled: true,
          state,
          answer: "Elegí qué querés proteger:",
          quickReplies: SEGURO_REPLIES,
        };
      }
      return askSeguroDetalle({ ...state.data, seguroGrupo: grupo });
    }

    case "seguro_detalle": {
      if (text.length < 2) {
        return {
          handled: true,
          state,
          answer: "Necesito un dato más: año/modelo o actividad.",
        };
      }
      state.data.seguroDetalle = text;
      return askNombre(state.data);
    }

    case "laboral": {
      const modalidad = normalizeLaboral(text);
      if (!modalidad) {
        return {
          handled: true,
          state,
          answer: "Elegí tu situación laboral:",
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
      state.step = "grupo";
      return {
        handled: true,
        state,
        answer: "¿Para cuántas personas es la cobertura?",
        quickReplies: GRUPO_REPLIES,
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
      state.step = "grupo";
      return {
        handled: true,
        state,
        answer: "¿Para cuántas personas es la cobertura?",
        quickReplies: GRUPO_REPLIES,
      };
    }

    case "grupo": {
      const grupo = normalizeGrupo(text) || text;
      if (text.length < 2) {
        return {
          handled: true,
          state,
          answer: "¿Es individual o grupo familiar?",
          quickReplies: GRUPO_REPLIES,
        };
      }
      state.data.grupoFamiliar = grupo;
      state.step = "edades";
      return {
        handled: true,
        state,
        answer:
          grupo === "Individual"
            ? "¿Cuántos años tenés?"
            : "¿Cuántos años tenés? Si hay más personas en el grupo, incluí sus edades también.",
      };
    }

    case "edades": {
      if (text.length < 1) {
        return {
          handled: true,
          state,
          answer: "¿Cuántos años tenés? Si hay grupo familiar, incluí las edades.",
        };
      }
      state.data.edades = text;
      state.step = "uso";
      return {
        handled: true,
        state,
        answer:
          "¿Qué estás buscando principalmente? Psicología, ortodoncia, kinesiología, internaciones u otra cobertura.",
      };
    }

    case "uso": {
      if (text.length < 2) {
        return {
          handled: true,
          state,
          answer: "¿Qué cobertura te interesa más? Psicología, ortodoncia, kinesiología...",
        };
      }
      state.data.uso = text;
      return askNombre(state.data);
    }

    case "viajero_destino": {
      if (text.length < 3) {
        return {
          handled: true,
          state,
          answer: "¿Cuál es el destino y las fechas aproximadas de viaje?",
        };
      }
      state.data.viajeroDestino = text;
      return askNombre(state.data);
    }

    case "nombre": {
      if (text.length < 2 || QUOTE_RESTART.test(text) || text.startsWith("menu:")) {
        return {
          handled: true,
          state,
          answer: "¿Cómo te llamás?",
        };
      }
      state.data.nombre = prettyName(text.replace(/^me llamo\s+/i, ""));
      state.step = "whatsapp";
      return {
        handled: true,
        state,
        answer: `Gracias, ${firstName(state.data.nombre)}. Dejanos tu WhatsApp, con código de área, para enviarte las opciones.`,
      };
    }

    case "whatsapp": {
      const phone = extractPhone(text);
      if (!phone) {
        return {
          handled: true,
          state,
          answer: "Necesito el número con código de área, por ejemplo 387 534-8199.",
        };
      }
      state.data.celular = phone;
      return afterWhatsapp(state);
    }

    case "localidad": {
      if (text.length < 2) {
        return {
          handled: true,
          state,
          answer: "¿De qué ciudad o localidad sos?",
        };
      }
      state.data.localidad = text;
      if (state.data.producto === "salud") {
        state.step = "prepaga";
        state.pendingSave = "optional";
        return {
          handled: true,
          state,
          answer: "¿Tenés alguna prepaga o cobertura ahora? (opcional)",
          quickReplies: SKIP_REPLIES,
        };
      }
      return finishQuote(state, "optional");
    }

    case "prepaga": {
      if (!SKIP.test(text)) state.data.prepaga = text;
      return finishQuote(state, "optional");
    }

    default:
      return { handled: false, state: emptyQuoteState() };
  }
}

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
    .replace(/^\s*[-*•]\s+/gm, "• ")
    .replace(/(^|\n)\s*\*\s+/g, "$1• ")
    .replace(/\*/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
