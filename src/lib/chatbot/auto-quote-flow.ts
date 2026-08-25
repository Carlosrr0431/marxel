import {
  listAutoBrands,
  listAutoLocations,
  listAutoModels,
  listAutoVersions,
  quoteAutoVehicle,
  type AutoCatalogItem,
  type AutoLocation,
  type AutoPlan,
  type AutoVersion,
} from "@/lib/sc-auto";
import type {
  QuoteData,
  QuoteFlowResult,
  QuoteQuickReply,
  QuoteState,
} from "@/lib/chatbot/quote-flow";

export const AUTO_MORE = "auto:more";
export const AUTO_RETRY = "auto:retry";

const YEAR_LIMIT = 30;
const YEAR_TOKEN = /^(auto:year:)?((?:19|20)\d{2})(-0km)?$/i;
const moneyFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

function money(n: number) {
  return `$ ${moneyFmt.format(n)}`;
}

function fold(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cloneAuto(data: QuoteData): QuoteData {
  return { ...data, auto: data.auto ? { ...data.auto } : { page: 0 } };
}

function pageSize(channel?: QuoteState["channel"]) {
  return channel === "whatsapp" ? 6 : 12;
}

function yearOptions() {
  const current = new Date().getFullYear();
  const years = [{ id: `${current}-0km`, label: `${current} 0km` }];
  for (let y = current; y >= current - YEAR_LIMIT; y -= 1) {
    years.push({ id: String(y), label: String(y) });
  }
  return years;
}

function uniqueReplies(items: QuoteQuickReply[]): QuoteQuickReply[] {
  const used = new Set<string>();
  return items.map((item) => {
    let label = item.label.slice(0, 80) || item.value;
    const key = fold(label);
    if (!used.has(key)) {
      used.add(key);
      return { ...item, label };
    }
    const suffix = ` ·${item.value.split(":").pop() || ""}`;
    label = `${item.label.slice(0, Math.max(8, 80 - suffix.length))}${suffix}`.slice(0, 80);
    used.add(fold(label));
    return { ...item, label };
  });
}

function paginate(
  items: QuoteQuickReply[],
  page: number,
  size: number
): { replies: QuoteQuickReply[]; page: number } {
  const unique = uniqueReplies(items);
  const totalPages = Math.max(1, Math.ceil(unique.length / size));
  const safePage = ((page % totalPages) + totalPages) % totalPages;
  const slice = unique.slice(safePage * size, safePage * size + size);
  const replies =
    unique.length > size
      ? [...slice, { label: "Ver más opciones", value: AUTO_MORE }]
      : slice;
  return { replies, page: safePage };
}

function matchReply(text: string, items: QuoteQuickReply[]): QuoteQuickReply | null {
  const raw = text.trim();
  const exactValue = items.find((item) => item.value === raw);
  if (exactValue) return exactValue;
  const n = fold(raw);
  if (!n) return null;
  const exactLabel = items.filter((item) => fold(item.label) === n);
  if (exactLabel.length === 1) return exactLabel[0];
  if (exactLabel.length > 1) return exactLabel[0];
  if (n.length < 3) return null;
  const hits = items.filter((item) => {
    const label = fold(item.label);
    return label.includes(n) || n.includes(label);
  });
  return hits.length === 1 ? hits[0] : null;
}

function parseYearId(id: string) {
  return {
    year: Number(id.replace(/-0km$/, "")),
    is0km: id.endsWith("-0km"),
  };
}

export function parseYearFromText(text: string): { year: number; is0km: boolean } | null {
  const raw = text.trim();
  const token = raw.match(YEAR_TOKEN);
  if (token) {
    const year = Number(token[2]);
    if (!year) return null;
    return { year, is0km: Boolean(token[3]) || /\b0\s*km\b/i.test(raw) };
  }
  const n = fold(raw);
  const km = /\b0\s*km\b|\b0km\b/.test(n);
  const m = n.match(/\b((?:19|20)\d{2})\b/);
  if (!m) return null;
  const rest = n
    .replace(m[0], "")
    .replace(/\b0\s*km\b|\b0km\b/g, "")
    .replace(/\b(año|anio|del|de|el|la|auto|es|un|una|modelo)\b/g, "")
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
  if (rest.length > 2) return null;
  const year = Number(m[1]);
  const current = new Date().getFullYear();
  if (year < current - YEAR_LIMIT || year > current + 1) return null;
  return { year, is0km: km };
}

function carLine(data: QuoteData) {
  const auto = data.auto;
  if (!auto) return "";
  return [
    auto.year,
    auto.is0km ? "0km" : null,
    auto.brand?.description,
    auto.model?.description,
    auto.version?.description,
  ]
    .filter(Boolean)
    .join(" ");
}

function askNombre(data: QuoteData): QuoteFlowResult {
  return {
    handled: true,
    state: { active: true, step: "nombre", data },
    answer: "¿Me decís tu nombre?",
  };
}

function formatPlans(car: string, plans: AutoPlan[]) {
  const lines = plans.map((plan) => {
    const chosen = plan.mostChosen ? " · el más elegido" : "";
    const original =
      plan.original && plan.original > plan.monthly
        ? ` (antes ${money(plan.original)})`
        : "";
    return `${plan.title}${chosen}: ${money(plan.monthly)} por mes${original}\n${plan.description}`;
  });
  return `Cotización para ${car}:\n\n${lines.join("\n\n")}\n\n¿Cuál te interesa? Un asesor de MARXEN te escribe para cerrarlo.`;
}

function failCatalog(data: QuoteData, step: QuoteState["step"], answer: string): QuoteFlowResult {
  return {
    handled: true,
    state: { active: true, step, data },
    answer,
    quickReplies: [{ label: "Reintentar", value: AUTO_RETRY }],
  };
}

export async function startAutoQuote(
  data: QuoteData = {},
  channel?: QuoteState["channel"]
): Promise<QuoteFlowResult> {
  const next = {
    ...data,
    producto: "seguros" as const,
    seguroGrupo: "auto" as const,
    auto: { page: 0, ...(data.auto || {}) },
  };
  const result = next.auto?.year
    ? await askBrand(next, 0, channel)
    : askYear(next, 0, channel);
  if (channel) result.state.channel = channel;
  return result;
}

function askYear(data: QuoteData, page = 0, channel?: QuoteState["channel"]): QuoteFlowResult {
  const items = yearOptions().map((y) => ({
    label: y.label,
    value: `auto:year:${y.id}`,
  }));
  const paged = paginate(items, page, pageSize(channel));
  const next = cloneAuto(data);
  next.auto = { ...next.auto, page: paged.page };
  return {
    handled: true,
    state: { active: true, step: "auto_anio", data: next },
    answer:
      channel === "whatsapp"
        ? "¿De qué año es el auto? Escribí el año, por ejemplo 2020 o 2020 0km."
        : "¿De qué año es el auto?",
    quickReplies: paged.replies,
  };
}

async function askBrand(
  data: QuoteData,
  page = 0,
  channel?: QuoteState["channel"]
): Promise<QuoteFlowResult> {
  const year = data.auto?.year;
  if (!year) return askYear(data, 0, channel);
  try {
    const brands = await listAutoBrands(year);
    if (brands.length === 0) {
      return failCatalog(
        data,
        "auto_anio",
        "No encontramos marcas para ese año. Elegí otro año o reintentá."
      );
    }
    const items = brands.map((b) => ({
      label: b.description,
      value: `auto:brand:${b.id}`,
    }));
    const paged = paginate(items, page, pageSize(channel));
    const next = cloneAuto(data);
    next.auto = { ...next.auto, page: paged.page };
    return {
      handled: true,
      state: { active: true, step: "auto_marca", data: next },
      answer:
        channel === "whatsapp"
          ? "¿Qué marca es? Escribí la marca, por ejemplo Toyota o Volkswagen."
          : "¿Qué marca es?",
      quickReplies: paged.replies,
    };
  } catch {
    return failCatalog(data, "auto_marca", "No pude cargar las marcas. Reintentá en un momento.");
  }
}

async function askModel(
  data: QuoteData,
  page = 0,
  channel?: QuoteState["channel"]
): Promise<QuoteFlowResult> {
  const year = data.auto?.year;
  const brandId = data.auto?.brand?.id;
  if (!year || !brandId) return askBrand(data, 0, channel);
  try {
    const models = await listAutoModels(year, brandId);
    if (models.length === 0) {
      return failCatalog(
        data,
        "auto_marca",
        "No encontramos modelos para esa marca. Elegí otra o reintentá."
      );
    }
    const items = models.map((m) => ({
      label: m.description,
      value: `auto:model:${m.id}`,
    }));
    const paged = paginate(items, page, pageSize(channel));
    const next = cloneAuto(data);
    next.auto = { ...next.auto, page: paged.page };
    return {
      handled: true,
      state: { active: true, step: "auto_modelo", data: next },
      answer:
        channel === "whatsapp"
          ? "¿Qué modelo es? Escribí el modelo, por ejemplo Gol o Corolla."
          : "¿Qué modelo es?",
      quickReplies: paged.replies,
    };
  } catch {
    return failCatalog(data, "auto_modelo", "No pude cargar los modelos. Reintentá en un momento.");
  }
}

async function askVersion(
  data: QuoteData,
  page = 0,
  channel?: QuoteState["channel"]
): Promise<QuoteFlowResult> {
  const year = data.auto?.year;
  const brandId = data.auto?.brand?.id;
  const modelId = data.auto?.model?.id;
  if (!year || !brandId || !modelId) return askModel(data, 0, channel);
  try {
    const versions = await listAutoVersions(year, brandId, modelId);
    if (versions.length === 0) {
      return failCatalog(
        data,
        "auto_modelo",
        "No encontramos versiones para ese modelo. Elegí otro o reintentá."
      );
    }
    const items = versions.map((v) => ({
      label: String(v.description || v.fullCarDescripcion || v.id),
      value: `auto:version:${v.id}`,
    }));
    const paged = paginate(items, page, pageSize(channel));
    const next = cloneAuto(data);
    next.auto = { ...next.auto, page: paged.page };
    return {
      handled: true,
      state: { active: true, step: "auto_version", data: next },
      answer:
        channel === "whatsapp"
          ? "¿Qué versión es? Escribí la versión, o parte del nombre."
          : "¿Qué versión es?",
      quickReplies: paged.replies,
    };
  } catch {
    return failCatalog(
      data,
      "auto_version",
      "No pude cargar las versiones. Reintentá en un momento."
    );
  }
}

function askCp(data: QuoteData): QuoteFlowResult {
  const next = cloneAuto(data);
  next.auto = { ...next.auto, page: 0 };
  return {
    handled: true,
    state: { active: true, step: "auto_cp", data: next },
    answer: "Ingresá el código postal (en Salta Capital es 4400).",
  };
}

function askLocalidad(
  data: QuoteData,
  locations: AutoLocation[],
  page = 0,
  channel?: QuoteState["channel"]
): QuoteFlowResult {
  const items = locations.map((loc) => ({
    label: loc.description,
    value: `auto:loc:${loc.locationId}`,
  }));
  const paged = paginate(items, page, pageSize(channel));
  const next = cloneAuto(data);
  next.auto = { ...next.auto, page: paged.page };
  return {
    handled: true,
    state: { active: true, step: "auto_localidad", data: next },
    answer: "Hay más de una localidad para ese CP. ¿Cuál es la tuya?",
    quickReplies: paged.replies,
  };
}

async function afterCp(data: QuoteData, channel?: QuoteState["channel"]): Promise<QuoteFlowResult> {
  const cp = data.auto?.cp || "";
  try {
    const locations = await listAutoLocations(cp);
    if (locations.length === 0) {
      return {
        handled: true,
        state: { active: true, step: "auto_cp", data },
        answer: "No encontramos esa localidad. Revisá el código postal (4 dígitos).",
      };
    }
    if (locations.length === 1) {
      const next = cloneAuto(data);
      next.auto = { ...next.auto, location: locations[0] };
      next.localidad = locations[0].description;
      return askNombre(next);
    }
    return askLocalidad(data, locations, 0, channel);
  } catch {
    return failCatalog(data, "auto_cp", "No pude validar el código postal. Reintentá.");
  }
}

export async function submitAutoQuote(state: QuoteState): Promise<QuoteFlowResult> {
  const data = cloneAuto(state.data);
  const auto = data.auto;
  if (
    !auto?.year ||
    !auto.brand ||
    !auto.model ||
    !auto.version ||
    !auto.location ||
    !data.nombre ||
    !data.celular
  ) {
    return askYear(data, 0, state.channel);
  }

  try {
    const result = await quoteAutoVehicle({
      year: auto.year,
      is0km: Boolean(auto.is0km),
      brand: auto.brand,
      model: auto.model,
      version: auto.version,
      location: auto.location,
      nombre: data.nombre,
      celular: data.celular,
      source: "chat",
    });
    data.auto = {
      ...auto,
      plans: result.plans,
      quoteId: result.opportunityId,
    };
    data.seguroDetalle = result.carDescription || carLine(data);
    data.localidad = auto.location.description;
    const replies = result.plans.map((plan) => ({
      label: plan.mostChosen ? `${plan.title} (más elegido)` : plan.title,
      value: `auto:plan:${plan.key}`,
    }));
    return {
      handled: true,
      state: {
        ...state,
        active: true,
        step: "auto_plan",
        data,
        pendingSave: "hot",
      },
      answer: formatPlans(data.seguroDetalle, result.plans),
      quickReplies: replies,
    };
  } catch {
    data.seguroDetalle = carLine(data) || data.seguroDetalle;
    data.localidad = auto.location.description;
    return {
      handled: true,
      state: {
        ...state,
        active: true,
        step: "auto_plan",
        data,
        pendingSave: "hot",
      },
      answer:
        "No pude obtener los precios ahora. Un asesor de MARXEN te escribe por WhatsApp con la cotización. Si querés, reintentá.",
      quickReplies: [{ label: "Reintentar cotización", value: AUTO_RETRY }],
    };
  }
}

async function loadList(
  step: QuoteState["step"],
  data: QuoteData
): Promise<QuoteQuickReply[]> {
  const auto = data.auto;
  if (step === "auto_anio") {
    return yearOptions().map((y) => ({ label: y.label, value: `auto:year:${y.id}` }));
  }
  if (step === "auto_marca" && auto?.year) {
    const brands = await listAutoBrands(auto.year);
    return brands.map((b) => ({ label: b.description, value: `auto:brand:${b.id}` }));
  }
  if (step === "auto_modelo" && auto?.year && auto.brand) {
    const models = await listAutoModels(auto.year, auto.brand.id);
    return models.map((m) => ({ label: m.description, value: `auto:model:${m.id}` }));
  }
  if (step === "auto_version" && auto?.year && auto.brand && auto.model) {
    const versions = await listAutoVersions(auto.year, auto.brand.id, auto.model.id);
    return versions.map((v) => ({
      label: String(v.description || v.fullCarDescripcion || v.id),
      value: `auto:version:${v.id}`,
    }));
  }
  if (step === "auto_localidad" && auto?.cp) {
    const locations = await listAutoLocations(auto.cp);
    return locations.map((loc) => ({
      label: loc.description,
      value: `auto:loc:${loc.locationId}`,
    }));
  }
  return [];
}

async function reask(
  step: QuoteState["step"],
  data: QuoteData,
  page: number,
  channel?: QuoteState["channel"]
): Promise<QuoteFlowResult> {
  if (step === "auto_anio") return askYear(data, page, channel);
  if (step === "auto_marca") return askBrand(data, page, channel);
  if (step === "auto_modelo") return askModel(data, page, channel);
  if (step === "auto_version") return askVersion(data, page, channel);
  if (step === "auto_cp") return askCp(data);
  if (step === "auto_localidad" && data.auto?.cp) {
    const locations = await listAutoLocations(data.auto.cp);
    return askLocalidad(data, locations, page, channel);
  }
  if (step === "auto_plan") {
    return submitAutoQuote({ active: true, step: "auto_plan", data, channel });
  }
  return askYear(data, 0, channel);
}

export async function continueAutoQuote(state: QuoteState): Promise<QuoteFlowResult> {
  const data = cloneAuto(state.data);
  const channel = state.channel;
  if (!data.auto?.year) return askYear(data, data.auto?.page || 0, channel);
  if (!data.auto.brand) return askBrand(data, 0, channel);
  if (!data.auto.model) return askModel(data, 0, channel);
  if (!data.auto.version) return askVersion(data, 0, channel);
  if (!data.auto.cp) return askCp(data);
  if (!data.auto.location) return afterCp(data, channel);
  if (!data.nombre) {
    const result = askNombre(data);
    if (channel) result.state.channel = channel;
    return result;
  }
  if (!data.celular) {
    return {
      handled: true,
      state: { ...state, active: true, step: "whatsapp", data, channel },
      answer: data.nombre
        ? `Gracias, ${data.nombre.split(/\s+/)[0]}. Dejanos tu WhatsApp, con código de área.`
        : "Dejanos tu WhatsApp, con código de área, para enviarte las opciones.",
    };
  }
  return submitAutoQuote({ ...state, active: true, data, channel });
}

export function isAutoQuoteStep(step: QuoteState["step"]): boolean {
  return (
    step === "auto_anio" ||
    step === "auto_marca" ||
    step === "auto_modelo" ||
    step === "auto_version" ||
    step === "auto_cp" ||
    step === "auto_localidad" ||
    step === "auto_plan" ||
    step === "auto_patente"
  );
}

export async function handleAutoQuoteStep(
  text: string,
  state: QuoteState
): Promise<QuoteFlowResult> {
  const data = cloneAuto(state.data);
  const channel = state.channel;
  const page = data.auto?.page || 0;

  if (text === AUTO_MORE) {
    return reask(state.step, data, page + 1, channel);
  }
  if (text === AUTO_RETRY) {
    return reask(state.step, data, page, channel);
  }

  if (state.step === "auto_anio") {
    const parsed = parseYearFromText(text);
    if (parsed) {
      data.auto = { year: parsed.year, is0km: parsed.is0km, page: 0 };
      return askBrand(data, 0, channel);
    }
  }

  if (state.step === "auto_plan") {
    const plans = data.auto?.plans || [];
    const replies = plans.map((plan) => ({
      label: plan.mostChosen ? `${plan.title} (más elegido)` : plan.title,
      value: `auto:plan:${plan.key}`,
    }));
    const hit = matchReply(text, replies);
    const plan: AutoPlan | undefined = hit
      ? plans.find((p) => hit.value === `auto:plan:${p.key}`)
      : plans.find((p) => fold(p.title) === fold(text) || fold(text).includes(fold(p.title)));
    if (!plan) {
      if (plans.length === 0) return submitAutoQuote({ ...state, data });
      return {
        handled: true,
        state: { ...state, active: true, step: "auto_plan", data },
        answer: "Elegí un plan de la lista, o escribí el nombre.",
        quickReplies: replies,
      };
    }
    data.auto = { ...data.auto, planElegido: plan.title };
    data.seguroDetalle = [data.seguroDetalle || carLine(data), plan.title, `${money(plan.monthly)}/mes`]
      .filter(Boolean)
      .join(" · ");
    const nombre = data.nombre?.split(/\s+/)[0] || "";
    // Para vehículos usados pedimos la patente antes de finalizar
    if (!data.auto.is0km) {
      return {
        handled: true,
        state: {
          ...state,
          active: true,
          step: "auto_patente",
          data,
          pendingSave: "optional",
        },
        answer: `Listo${nombre ? `, ${nombre}` : ""}. Elegiste ${plan.title} (${money(plan.monthly)}/mes). ¿Cuál es la patente del vehículo? (ej: AB 123 CD)`,
      };
    }
    return {
      handled: true,
      state: {
        ...state,
        active: false,
        step: "done",
        data,
        pendingSave: "optional",
      },
      answer: `Listo${nombre ? `, ${nombre}` : ""}. Anoté ${plan.title} (${money(plan.monthly)}/mes). Un asesor de MARXEN te escribe por WhatsApp para cerrarlo.`,
    };
  }

  if (state.step === "auto_patente") {
    const { normalizeArPlate, classifyArPlate } = await import("@/lib/ar-plate");
    const SKIP = /^(no|nop|sin\s+patente|no\s+tengo|0km|cero\s*km|nuevo|sin|omitir|saltar|-)$/i;
    const nombre = data.nombre?.split(/\s+/)[0] || "";
    if (SKIP.test(text.trim())) {
      return {
        handled: true,
        state: { ...state, active: false, step: "done", data, pendingSave: "optional" },
        answer: `Perfecto${nombre ? `, ${nombre}` : ""}. Un asesor de MARXEN te escribe por WhatsApp para cerrarlo.`,
      };
    }
    const plate = normalizeArPlate(text);
    const kind = classifyArPlate(plate);
    if (kind === "invalid" || kind === "empty") {
      return {
        handled: true,
        state: { ...state, active: true, step: "auto_patente", data },
        answer: "No reconocí la patente. Ingresala en formato ABC123 o AB 123 CD, o respondé «no tengo» si es 0km.",
      };
    }
    data.auto = { ...data.auto, patente: plate };
    return {
      handled: true,
      state: { ...state, active: false, step: "done", data, pendingSave: "optional" },
      answer: `Perfecto${nombre ? `, ${nombre}` : ""}. Patente ${plate} registrada. Un asesor de MARXEN te escribe por WhatsApp para cerrarlo.`,
    };
  }

  if (state.step === "auto_cp") {
    const cp = text.replace(/\D/g, "").slice(0, 4);
    if (cp.length !== 4) {
      return {
        handled: true,
        state: { ...state, active: true, step: "auto_cp", data },
        answer: "Necesito el código postal de 4 dígitos. En Salta Capital es 4400.",
      };
    }
    data.auto = { ...data.auto, cp };
    return afterCp(data, channel);
  }

  let items: QuoteQuickReply[] = [];
  try {
    items = await loadList(state.step, data);
  } catch {
    return failCatalog(data, state.step, "No pude cargar las opciones. Reintentá.");
  }

  const hit = matchReply(text, items);
  if (!hit) {
    return { handled: false, state: { ...state, data } };
  }

  if (state.step === "auto_anio") {
    const id = hit.value.replace(/^auto:year:/, "");
    const parsed = parseYearId(id);
    if (!parsed.year) return askYear(data, page, channel);
    data.auto = { year: parsed.year, is0km: parsed.is0km, page: 0 };
    return askBrand(data, 0, channel);
  }

  if (state.step === "auto_marca") {
    const id = Number(hit.value.replace(/^auto:brand:/, ""));
    const brand: AutoCatalogItem = { id, description: hit.label.split(" ·")[0] };
    data.auto = { ...data.auto, brand, model: undefined, version: undefined, page: 0 };
    return askModel(data, 0, channel);
  }

  if (state.step === "auto_modelo") {
    const id = Number(hit.value.replace(/^auto:model:/, ""));
    const model: AutoCatalogItem = { id, description: hit.label.split(" ·")[0] };
    data.auto = { ...data.auto, model, version: undefined, page: 0 };
    return askVersion(data, 0, channel);
  }

  if (state.step === "auto_version") {
    const id = Number(hit.value.replace(/^auto:version:/, ""));
    let version: AutoVersion | undefined;
    try {
      version = (await listAutoVersions(data.auto!.year!, data.auto!.brand!.id, data.auto!.model!.id)).find(
        (v) => Number(v.id) === id
      );
    } catch {
      version = undefined;
    }
    if (!version) {
      return failCatalog(data, "auto_version", "No pude tomar esa versión. Reintentá.");
    }
    data.auto = { ...data.auto, version, page: 0 };
    return askCp(data);
  }

  if (state.step === "auto_localidad") {
    const id = Number(hit.value.replace(/^auto:loc:/, ""));
    let location: AutoLocation | undefined;
    try {
      location = (await listAutoLocations(data.auto?.cp || "")).find((loc) => loc.locationId === id);
    } catch {
      location = undefined;
    }
    if (!location) {
      return failCatalog(data, "auto_localidad", "No pude tomar esa localidad. Reintentá.");
    }
    data.auto = { ...data.auto, location, page: 0 };
    data.localidad = location.description;
    return askNombre(data);
  }

  return { handled: false, state };
}
