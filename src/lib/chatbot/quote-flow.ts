import type { ProductoInteres } from "@/lib/crm/types";
import type {
  AutoCatalogItem,
  AutoLocation,
  AutoPlan,
  AutoVersion,
} from "@/lib/sc-auto";
import {
  handleAutoQuoteStep,
  isAutoQuoteStep,
  parseYearFromText,
  startAutoQuote,
  submitAutoQuote,
  continueAutoQuote,
  AUTO_MORE,
  AUTO_RETRY,
} from "@/lib/chatbot/auto-quote-flow";

export type ModalidadQuote =
  | "monotributo"
  | "relacion_dependencia"
  | "particular";

export type SeguroGrupo = "auto" | "auto_moto" | "hogar_comercio" | "praxis_art_ap";

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
  | "auto_anio"
  | "auto_marca"
  | "auto_modelo"
  | "auto_version"
  | "auto_cp"
  | "auto_localidad"
  | "auto_plan"
  | "auto_patente"
  | "done";

export type AutoQuoteDraft = {
  year?: number;
  is0km?: boolean;
  brand?: AutoCatalogItem;
  model?: AutoCatalogItem;
  version?: AutoVersion;
  cp?: string;
  location?: AutoLocation;
  page?: number;
  plans?: AutoPlan[];
  quoteId?: number;
  planElegido?: string;
  patente?: string;
};

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
  auto?: AutoQuoteDraft;
};

export type QuoteState = {
  active: boolean;
  step: QuoteStep;
  data: QuoteData;
  leadId?: string;
  pendingSave?: "hot" | "optional" | null;
  channel?: "web" | "whatsapp";
  /** Aviso corto al productor por el primer interés de WhatsApp. */
  notifiedInterest?: boolean;
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
  { label: "Auto", value: "Auto" },
  { label: "Moto", value: "Moto" },
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
    step === "grupo" ||
    step === "auto_anio" ||
    step === "auto_marca" ||
    step === "auto_modelo" ||
    step === "auto_version" ||
    step === "auto_localidad" ||
    step === "auto_plan"
  );
}

const QUOTE_INTENT =
  /\b(cotiz|presupuesto|precio|cu[aá]nto\s+(sale|cuesta|me\s+sale)|quiero\s+(afiliar|asociar|el\s+plan|un\s+plan|un\s+seguro)|armar(me)?\s+(una\s+)?cotizaci[oó]n|pasame\s+(un\s+)?precio|necesito\s+(una\s+)?cotiz|asesorarme|asesoramiento)\b/i;

const QUOTE_RESTART =
  /^(quiero\s+)?cotizar\.?$|^(necesito\s+)?(una\s+)?cotizaci[oó]n\.?$|^pasame\s+(un\s+)?precio\.?$|^cu[aá]nto\s+(sale|cuesta)\??$|^(quiero\s+)?asesorarme\.?$/i;

const HEALTH_COVERAGE =
  /\b(plan(es)?(\s+de\s+salud)?|cobertura|cartilla|prepaga|obra\s+social|aportes|ortodoncia|kinesiolog|psicolog|odontolog|dentista|pr[oó]tesis|afiliar|comparativ)\b/i;

const SKIP =
  /^(no|nop|ahora\s+no|despu[eé]s|saltar|omitir|pasar|na|nada|prefiero\s+no)\b/i;

export function isGreeting(text: string): boolean {
  return /^(hola+|holis|buenas([,\s].*)?|buen\s*(d[ií]a|dia|tardes|noches)|hey|hi|hello|info|men[uú]|opciones|start|inicio)\.?\s*$/i.test(
    text.trim()
  );
}

export function menuForChannel(channel?: QuoteState["channel"]): QuoteQuickReply[] {
  if (channel === "whatsapp") {
    return [
      ...PRODUCT_REPLIES,
      { label: "Hablar con un asesor", value: MENU_WHATSAPP },
    ];
  }
  return MAIN_MENU;
}

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
  if (grupo === "auto") return "Auto";
  if (grupo === "auto_moto") return "Moto";
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
  const hasAuto = /auto|vehiculo|veh[ií]culo/.test(t);
  const hasMoto = /\bmoto/.test(t);
  if (hasAuto && hasMoto) return null;
  if (hasAuto) return "auto";
  if (hasMoto) return "auto_moto";
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
    data.auto?.year
      ? `Vehículo: ${data.auto.year}${data.auto.is0km ? " 0km" : ""} ${[
          data.auto.brand?.description,
          data.auto.model?.description,
          data.auto.version?.description,
        ]
          .filter(Boolean)
          .join(" ")}`.trim()
      : null,
    data.auto?.cp ? `CP auto: ${data.auto.cp}` : null,
    data.auto?.patente ? `Patente: ${data.auto.patente}` : null,
    data.auto?.planElegido ? `Plan auto: ${data.auto.planElegido}` : null,
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

/** Pide solo contacto que falte; no repite nombre, WhatsApp ni localidad. */
async function continueWithContact(
  data: QuoteData,
  channel?: QuoteState["channel"]
): Promise<QuoteFlowResult> {
  if (!data.nombre) return askNombre(data);
  if (!data.celular) {
    return {
      handled: true,
      state: { active: true, step: "whatsapp", data, channel },
      answer: `Gracias, ${firstName(data.nombre)}. Dejanos tu WhatsApp, con código de área, para enviarte las opciones.`,
    };
  }
  if (!data.localidad) {
    return afterWhatsapp({ active: true, step: "whatsapp", data, channel });
  }
  if (data.producto === "salud") {
    return {
      handled: true,
      state: {
        active: true,
        step: "prepaga",
        data,
        channel,
        pendingSave: "optional",
      },
      answer: "¿Tenés alguna prepaga o cobertura ahora? (opcional)",
      quickReplies: SKIP_REPLIES,
    };
  }
  return finishQuote({ active: true, step: "localidad", data, channel });
}

function startSeguros(data: QuoteData = {}): QuoteFlowResult {
  const nombre = data.nombre ? firstName(data.nombre) : "";
  return {
    handled: true,
    state: { active: true, step: "seguro_tipo", data: { ...data, producto: "seguros" } },
    answer: nombre ? `${nombre}, ¿qué querés proteger?` : "¿Qué querés proteger?",
    quickReplies: SEGURO_REPLIES,
  };
}

function startSalud(data: QuoteData = {}): QuoteFlowResult {
  const nombre = data.nombre ? firstName(data.nombre) : "";
  const known = nombre
    ? `${nombre}${data.localidad ? `, te tengo en ${data.localidad}` : ""}. `
    : "";
  return {
    handled: true,
    state: { active: true, step: "laboral", data: { ...data, producto: "salud" } },
    answer: known
      ? `${known}Para armarte la prepaga, ¿cuál es tu situación laboral?`
      : SALUD_PITCH,
    quickReplies: LABORAL_REPLIES,
  };
}

function startViajero(data: QuoteData = {}): QuoteFlowResult {
  const nombre = data.nombre ? firstName(data.nombre) : "";
  return {
    handled: true,
    state: { active: true, step: "viajero_destino", data: { ...data, producto: "viajero" } },
    answer: nombre
      ? `${nombre}, ¿cuál es el destino y las fechas aproximadas del viaje?`
      : "¿Cuál es tu destino y las fechas aproximadas de viaje?",
  };
}

async function startFromMessage(
  text: string,
  channel?: QuoteState["channel"],
  keep: QuoteData = {}
): Promise<QuoteFlowResult> {
  const base = contactKeep(keep);
  if (text === MENU_SALUD) return startSalud(base);
  if (text === MENU_SEGUROS) return startSeguros(base);
  if (text === MENU_VIAJERO) return startViajero(base);

  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const wantsQuote = looksLikeExplicitQuote(text);
  if (wantsQuote && /viajer|viaje/.test(t)) return startViajero(base);
  if (wantsQuote && /salud|prepaga|obra\s+social|medicina\s+prepaga/.test(t)) {
    return startSalud(base);
  }
  if (wantsQuote && /seguro|auto|moto|hogar|comercio|praxis|\bart\b/.test(t)) {
    const grupo = normalizeSeguro(text);
    if (grupo === "auto") return startAutoQuote({ ...base, producto: "seguros", seguroGrupo: "auto" }, channel);
    return grupo
      ? askSeguroDetalle({ ...base, producto: "seguros", seguroGrupo: grupo })
      : startSeguros(base);
  }

  return {
    handled: true,
    state: { active: true, step: "producto", data: base },
    answer: "¿En qué te puedo ayudar hoy?",
    quickReplies: PRODUCT_REPLIES,
  };
}

function askSeguroDetalle(data: QuoteData): QuoteFlowResult {
  const grupo = data.seguroGrupo;
  const prompt =
    grupo === "auto_moto"
      ? "Ingresá el año y modelo de tu moto."
      : grupo === "hogar_comercio"
        ? "Contanos el tipo de vivienda o el rubro del comercio."
        : "Contanos tu actividad o profesión.";
  return {
    handled: true,
    state: { active: true, step: "seguro_detalle", data },
    answer: `${prompt} Después te pido el WhatsApp para enviarte las opciones.`,
  };
}

async function afterWhatsapp(state: QuoteState): Promise<QuoteFlowResult> {
  if (state.data.seguroGrupo === "auto" && state.data.auto?.version && state.data.auto.location) {
    return submitAutoQuote(state);
  }
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
export function cloneQuoteState(prev: QuoteState): QuoteState {
  return {
    ...prev,
    data: {
      ...prev.data,
      auto: prev.data.auto ? { ...prev.data.auto } : undefined,
    },
  };
}

function contactKeep(data?: QuoteData): QuoteData {
  return {
    nombre: data?.nombre,
    celular: data?.celular,
    localidad: data?.localidad,
  };
}

/** Conserva nombre, WhatsApp y localidad al cambiar de producto (auto → salud, viajero, etc.). */
export function switchQuoteProduct(
  state: QuoteState,
  producto: ProductoInteres,
  extra?: { seguroGrupo?: SeguroGrupo }
): QuoteState {
  return {
    ...state,
    active: true,
    step: "idle",
    pendingSave: null,
    data: {
      ...contactKeep(state.data),
      producto,
      ...(extra?.seguroGrupo ? { seguroGrupo: extra.seguroGrupo } : {}),
    },
  };
}

/** Producto comercial (cotización). No usa odontólogo/prótesis: eso es pregunta de cobertura. */
export function inferQuoteProducto(text: string): ProductoInteres | null {
  const t = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/\b(viajer|asistencia al viaj|seguro de viaje|go assistance)\b/.test(t)) {
    return "viajero";
  }
  if (/\b(salud|prepaga|obra social|medicina prepaga|afiliar(me)?)\b/.test(t)) {
    return "salud";
  }
  if (/\b(seguro|auto|moto|hogar|comercio|praxis|\bart\b|sancor|cristobal)\b/.test(t)) {
    return "seguros";
  }
  return null;
}

export function inferProductoFromMessage(text: string): ProductoInteres | null {
  const quoted = inferQuoteProducto(text);
  if (quoted) return quoted;
  const t = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (
    /\b(odontolog|dentista|protesis|ortodoncia|cartilla|kinesiolog|psicolog)\b/.test(t)
  ) {
    return "salud";
  }
  return null;
}

export function looksLikeExplicitQuote(text: string): boolean {
  const t = text.trim();
  return (
    QUOTE_RESTART.test(t) ||
    QUOTE_INTENT.test(t) ||
    t === MENU_SEGUROS ||
    t === MENU_SALUD ||
    t === MENU_VIAJERO
  );
}

const HEALTH_QUESTION =
  /\b(odontolog|dentista|protesis|pr[oó]tesis|implante|ortodoncia|kinesiolog|psicolog|prepaga|obra\s+social|cartilla|afiliad|plan\s+(de\s+)?salud|cobertura\s+(de\s+)?salud|medicina\s+prepaga)\b/i;

const VIAJERO_QUESTION =
  /\b(viajer|asistencia al viaj|seguro de viaje|cubre\s+(en|el)\s+viaje)\b/i;

export function looksLikeCoverageQuestion(
  text: string,
  state?: QuoteState | null
): boolean {
  const t = text.trim();
  if (looksLikeExplicitQuote(t)) return false;
  const health = HEALTH_QUESTION.test(t);
  const travel = VIAJERO_QUESTION.test(t);
  if (!health && !travel) return false;
  const step = state?.step;
  const producto = state?.data.producto;
  if (state?.active && producto === "salud" && step === "uso" && health) return false;
  if (state?.active && producto === "viajero" && step === "viajero_destino" && travel) {
    return false;
  }
  return true;
}

export function looksLikeProductSwitchRequest(text: string): boolean {
  if (looksLikeExplicitQuote(text)) return true;
  const t = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!inferQuoteProducto(t)) return false;
  return /\b(quiero|necesito|pasame|armame|cotiz|cambi(o|ar)|en\s+vez|mejor)\b/.test(t);
}

export function detectQuoteProductSwitch(
  state: QuoteState,
  text: string
): { producto: ProductoInteres; seguroGrupo?: SeguroGrupo } | null {
  const hasContext =
    state.active ||
    Boolean(state.data.producto || state.data.nombre || state.data.celular || state.data.localidad);
  if (!hasContext) return null;
  const t = text.trim();
  const menuProducto: ProductoInteres | null =
    t === MENU_SALUD ? "salud" : t === MENU_VIAJERO ? "viajero" : t === MENU_SEGUROS ? "seguros" : null;
  if (!menuProducto && !looksLikeProductSwitchRequest(t)) return null;

  const producto = menuProducto || inferQuoteProducto(t);
  if (!producto) return null;

  const current = state.data.producto;
  if (producto !== current) return { producto };

  if (producto === "seguros") {
    const grupo = normalizeSeguro(t);
    if (grupo && grupo !== state.data.seguroGrupo) {
      return { producto: "seguros", seguroGrupo: grupo };
    }
  }
  return null;
}

export function shouldSendWhatsappPoll(step: QuoteStep, replies: QuoteQuickReply[] = []): boolean {
  if (replies.length < 2 || replies.length > 6) return false;
  if (
    step === "auto_anio" ||
    step === "auto_marca" ||
    step === "auto_modelo" ||
    step === "auto_version" ||
    step === "auto_localidad"
  ) {
    return false;
  }
  return true;
}

export function isDeterministicQuoteInput(text: string, state?: QuoteState | null): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/^(menu:|auto:)/i.test(t) || t === AUTO_MORE || t === AUTO_RETRY) return true;
  if (t === MENU_SEGUROS || t === MENU_SALUD || t === MENU_VIAJERO || t === MENU_WHATSAPP) return true;
  if (SEGURO_REPLIES.some((item) => item.value === t || item.label === t)) return true;
  if (LABORAL_REPLIES.some((item) => item.value === t || item.label === t)) return true;
  if (GRUPO_REPLIES.some((item) => item.value === t || item.label === t)) return true;
  if (QUOTE_RESTART.test(t)) return true;
  if (state?.step === "auto_anio" && parseYearFromText(t)) return true;
  if (state?.step === "auto_cp" && t.replace(/\D/g, "").length === 4) return true;
  if (state?.step === "whatsapp" && extractPhone(t)) return true;
  return false;
}

export async function processQuoteFlow(
  message: string,
  prev: QuoteState | null | undefined,
  channel?: QuoteState["channel"]
): Promise<QuoteFlowResult> {
  const text = message.trim();

  if (text === MENU_WHATSAPP) {
    if (channel === "whatsapp") {
      return {
        handled: true,
        state: { active: true, step: "nombre", data: { ...(prev?.data || {}) } },
        answer: "Dale, un asesor de MARXEN te va a escribir. ¿Me decís tu nombre?",
      };
    }
    return {
      handled: true,
      state: prev?.active ? prev : emptyQuoteState(),
      answer: "Te abro WhatsApp para hablar con un asesor de MARXEN.",
    };
  }

  if (prev && looksLikeCoverageQuestion(text, prev)) {
    return { handled: false, state: prev };
  }

  if (prev) {
    const sw = detectQuoteProductSwitch(prev, text);
    if (sw) {
      const resumed = await resumeQuoteState(switchQuoteProduct(prev, sw.producto, sw));
      if (resumed) return resumed;
    }
  }

  if (
    text === MENU_SEGUROS ||
    text === MENU_SALUD ||
    text === MENU_VIAJERO ||
    QUOTE_RESTART.test(text) ||
    (!prev?.active && detectsQuoteIntent(text))
  ) {
    return startFromMessage(text, channel, prev?.data || {});
  }

  const state: QuoteState = prev ? cloneQuoteState(prev) : emptyQuoteState();
  if (channel) state.channel = channel;

  if (!state.active) {
    if (detectsHealthCoverageIntent(text) && !detectsQuoteIntent(text)) {
      return { handled: false, state: prev || emptyQuoteState() };
    }
    if (detectsQuoteIntent(text)) {
      return startFromMessage(text, channel, prev?.data || {});
    }
    return { handled: false, state };
  }

  if (/^(cancelar|salir|dejar\s+cotiz|menu|men[uú])$/i.test(text)) {
    return {
      handled: true,
      state: { ...state, active: false, step: "idle" },
      answer: "Queda pausado. Cuando quieras seguimos con los datos que ya anoté.",
      quickReplies: menuForChannel(channel),
    };
  }

  switch (state.step) {
    case "producto":
      return startFromMessage(text, channel, state.data);

    case "seguro_tipo": {
      const year = parseYearFromText(text);
      const grupo = normalizeSeguro(text) || (year ? "auto" : null);
      if (!grupo) {
        return {
          handled: true,
          state,
          answer: "Elegí qué querés proteger:",
          quickReplies: SEGURO_REPLIES,
        };
      }
      if (grupo === "auto") {
        return startAutoQuote(
          {
            ...state.data,
            seguroGrupo: "auto",
            auto: year
              ? { ...state.data.auto, year: year.year, is0km: year.is0km, page: 0 }
              : state.data.auto,
          },
          channel
        );
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
      return continueWithContact(state.data, channel);
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
      return continueWithContact(state.data, channel);
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
      return continueWithContact(state.data, channel);
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
          answer: "Necesito el número con código de área, por ejemplo 387 634-8199.",
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
      if (isAutoQuoteStep(state.step)) {
        return handleAutoQuoteStep(text, state);
      }
      return { handled: false, state };
  }
}

export async function processQuoteFlowBatch(
  lines: string[],
  prev: QuoteState,
  persist: (s: QuoteState) => Promise<QuoteState>,
  channel?: QuoteState["channel"]
): Promise<QuoteFlowResult | null> {
  let state = prev;
  let lastResult: QuoteFlowResult | null = null;

  for (const line of lines) {
    const result = await processQuoteFlow(line, state, channel);
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

export async function resumeQuoteState(state: QuoteState): Promise<QuoteFlowResult | null> {
  const data = state.data;
  const channel = state.channel;
  if (data.producto === "seguros" && (data.seguroGrupo === "auto" || data.auto?.year)) {
    return continueAutoQuote({ ...state, active: true, data: { ...data, producto: "seguros", seguroGrupo: "auto" } });
  }
  if (data.producto === "seguros" && !data.seguroGrupo) return startSeguros(data);
  if (data.producto === "seguros" && !data.seguroDetalle) return askSeguroDetalle(data);
  if (data.producto === "salud") {
    if (!data.modalidad) return startSalud(data);
    if (data.modalidad !== "particular" && !data.monotributoCategoria && !data.sueldoBruto) {
      return {
        handled: true,
        state: { ...state, active: true, step: "laboral_detalle", data, channel },
        answer:
          data.modalidad === "monotributo"
            ? "¿Qué categoría de monotributo tenés? (A, B, C...)"
            : "¿Más o menos cuánto es tu sueldo bruto? Un aproximado alcanza.",
      };
    }
    if (!data.grupoFamiliar) {
      return {
        handled: true,
        state: { ...state, active: true, step: "grupo", data, channel },
        answer: "¿Para cuántas personas es la cobertura?",
        quickReplies: GRUPO_REPLIES,
      };
    }
    if (!data.edades) {
      return {
        handled: true,
        state: { ...state, active: true, step: "edades", data, channel },
        answer:
          data.grupoFamiliar === "Individual"
            ? "¿Cuántos años tenés?"
            : "¿Cuántos años tenés? Si hay más personas en el grupo, incluí sus edades también.",
      };
    }
    if (!data.uso) {
      return {
        handled: true,
        state: { ...state, active: true, step: "uso", data, channel },
        answer: "¿Qué estás buscando principalmente? Psicología, ortodoncia, kinesiología, internaciones u otra cobertura.",
      };
    }
  }
  if (data.producto === "viajero" && !data.viajeroDestino) return startViajero(data);
  if ((data.producto || state.active) && !data.nombre) return askNombre(data);
  if (data.nombre && !data.celular) {
    return {
      handled: true,
      state: { ...state, active: true, step: "whatsapp", data, channel },
      answer: `Gracias, ${firstName(data.nombre)}. Dejanos tu WhatsApp, con código de área, para enviarte las opciones.`,
    };
  }
  if (data.celular && !data.localidad) {
    return afterWhatsapp({ ...state, active: true, data, channel });
  }
  return null;
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
