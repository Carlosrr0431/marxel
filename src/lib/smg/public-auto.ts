import { parseSmgCovers, type CoverMap } from "@/lib/plan-covers";
import { buildQuoteBody, smgAsegurado, smgCotizar, smgUbicaciones, smgVehiculos, withEmission } from "./client";

export type PublicSmgPlan = {
  id: string;
  title: string;
  monthly: number;
  covers: CoverMap | null;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asList(value: unknown) {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function text(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function shortText(value: unknown) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text || text.startsWith("{") || text.startsWith("[") || text.length > 180) return "";
  return text;
}

function messageOf(data: unknown) {
  const row = asRecord(data);
  const nested = asRecord(row.data);
  return shortText(nested.errMessage || row.message || row.Message || row.errMessage);
}

function problemOf(data: unknown) {
  const row = asRecord(data);
  const lists = [row.Errores, row.errores, row.Validaciones, row.validaciones];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const message =
        typeof item === "string"
          ? shortText(item)
          : shortText(text(asRecord(item), ["mensaje", "Mensaje", "descripcion", "errMessage"]));
      if (message) return message;
    }
  }
  return "";
}

function placesOf(data: unknown) {
  const row = asRecord(data);
  return asList(row.ubicaciones).length
    ? asList(row.ubicaciones)
    : asList(asRecord(row.data).ubicaciones);
}

function plansOf(data: unknown): PublicSmgPlan[] {
  const riesgo = asList(asRecord(data).riesgo)[0];
  const vehiculo = asRecord(asRecord(asRecord(riesgo).entidad).vehiculo);
  return asList(vehiculo.planCobertura)
    .map((plan) => ({
      id: text(plan, ["codPlanCobertura"]),
      title: text(plan, ["planCobertura", "descripcion"]) || "Cobertura",
      monthly: Math.round(Number(plan.importeCuota) || Number(plan.importePremio) || 0),
      covers: parseSmgCovers(text(plan, ["descripcionAmparos"])),
    }))
    .filter((plan) => plan.id)
    .sort((a, b) => a.monthly - b.monthly);
}

async function placeForPostal(postalCode: number) {
  const queries = [
    { txtLocalidad: "", codPostal: postalCode },
    { txtLocalidad: "SALTA", codPostal: postalCode },
    { txtLocalidad: "SALTA", codPostal: 0 },
  ];
  for (const query of queries) {
    const result = await smgUbicaciones(query);
    if (result.status >= 400) continue;
    const places = placesOf(result.data);
    const place =
      places.find((item) => fold(text(item, ["txtLocalidad"])) === "salta" && Number(text(item, ["codPostal"]) || postalCode) === postalCode) ||
      places.find((item) => fold(text(item, ["txtLocalidad"])) === "salta") ||
      places.find((item) => Number(text(item, ["codPostal"])) === postalCode) ||
      places[0];
    if (place && text(place, ["codProvincia"]) && text(place, ["codLocalidad"])) return place;
  }
  if (postalCode === 4400) {
    return { txtLocalidad: "SALTA", codProvincia: 17, codLocalidad: 1, codPostal: 4400 };
  }
  throw new Error("SMG no encontró la localidad de ese código postal");
}

async function matchVehicle(input: { brand: string; model: string; year: number; place: Record<string, unknown> }) {
  const province = Number(text(input.place, ["codProvincia"]));
  const locality = Number(text(input.place, ["codLocalidad"]));
  const queries = [input.brand, input.model].filter(Boolean);
  for (const query of queries) {
    const result = await smgVehiculos({
      codProducto: 10,
      codProvincia: province,
      codLocalidad: locality,
      txtModelo: query,
      anio: input.year,
    });
    if (result.status >= 400) continue;
    const brands = asList(asRecord(asRecord(result.data).datos).marca);
    const brand =
      brands.find((item) => fold(text(item, ["descripcion"])) === fold(input.brand)) || brands[0];
    const models = asList(brand?.modelo);
    const wanted = fold(input.model);
    const model =
      models.find((item) => fold(text(item, ["descripcion"])) === wanted) ||
      models.find((item) => fold(text(item, ["descripcion"])).includes(wanted)) ||
      models[0];
    if (!brand || !model) continue;
    return {
      codMarca: text(model, ["codigoMarca"]),
      marca: text(brand, ["descripcion"]),
      codModelo: text(model, ["codigoModelo"]),
      modelo: text(model, ["descripcion"]),
      codProvincia: province,
      codMunicipio: locality,
    };
  }
  throw new Error("SMG no tiene ese auto en el catálogo");
}

export async function quoteSmgPublic(input: {
  year: number;
  brand: string;
  model: string;
  postalCode: number;
  plate?: string;
}) {
  const place = await placeForPostal(input.postalCode);
  const vehicle = await matchVehicle({ ...input, place });
  const body = buildQuoteBody({
    codProducto: 10,
    codProvincia: vehicle.codProvincia,
    codMunicipio: vehicle.codMunicipio,
    anio: input.year,
    codMarca: vehicle.codMarca,
    marca: vehicle.marca,
    codModelo: vehicle.codModelo,
    modelo: vehicle.modelo,
    patente: input.plate || "",
    codUso: 1,
    txtUso: "PARTICULAR",
  });
  const result = await smgCotizar(body);
  if (result.status >= 400) throw new Error(messageOf(result.data) || "SMG no pudo cotizar");
  const plans = plansOf(result.data);
  if (!plans.length) throw new Error("SMG no devolvió planes para este auto");
  return { plans, quote: result.data, vehicle };
}

function policyNumberOf(data: unknown) {
  const root = asRecord(data);
  const header = asRecord(root.encabezado);
  const solicitud = asRecord(root.respuestaSolicitud);
  const number =
    text(solicitud, ["numerosolicitud", "nroSolicitud"]) ||
    text(header, ["nroSolicitud", "nroPoliza", "numeroPoliza"]) ||
    text(root, ["nroPoliza", "numeroPoliza", "nroSolicitud"]);
  return number && number !== "0" ? number : "";
}

function emissionProblem(data: unknown) {
  const row = asRecord(data);
  const raw = String(row.message || "");
  if (raw.startsWith("{")) {
    try {
      const inner = asRecord(JSON.parse(raw));
      const node = asRecord(inner.Data || inner.data);
      const solicitud = asRecord(node.RespuestaSolicitud || node.respuestaSolicitud);
      return problemOf(solicitud) || problemOf(node) || problemOf(inner);
    } catch {
      return "";
    }
  }
  return problemOf(data) || messageOf(data);
}

function customerCode(data: unknown) {
  const root = asRecord(data);
  const lists = [root.asegurado, root.asegurados, asRecord(root.data).asegurado, root];
  for (const item of lists) {
    const row = Array.isArray(item) ? asRecord(item[0]) : asRecord(item);
    const code = text(row, ["codAsegurado", "codaseg"]);
    if (code && code !== "0") return code;
  }
  return "";
}

export async function emitSmgPublic(input: {
  year: number;
  brand: string;
  model: string;
  postalCode: number;
  plate: string;
  planId: string;
  nombre: string;
  apellido: string;
  email: string;
  phone: string;
  dni: string;
  gender: string;
  birthDate: string;
  street: string;
  streetNumber: string;
  vin: string;
  engineNumber: string;
}) {
  const quoted = await quoteSmgPublic(input);
  const existing = await smgAsegurado({ codtipodocumento: "1", nrodoc: input.dni }).catch(() => null);
  const codAsegurado = existing ? customerCode(existing.data) : "";
  const issued = withEmission(quoted.quote, {
    nombre: input.nombre,
    apellido: input.apellido,
    fecnac: input.birthDate,
    sexo: input.gender,
    tipoDoc: 1,
    nroDoc: input.dni,
    calle: input.street,
    numero: input.streetNumber,
    cp: String(input.postalCode),
    codProvincia: quoted.vehicle.codProvincia,
    codMunicipio: quoted.vehicle.codMunicipio,
    email: input.email,
    telefono: input.phone,
    patente: input.plate,
    chasis: input.vin,
    motor: input.engineNumber,
    codPlanCobertura: input.planId,
    codAsegurado,
    esCliente: Boolean(codAsegurado),
    condicionFiscal: 5,
  });
  const result = await smgCotizar(issued);
  const policyNumber = policyNumberOf(result.data);
  if (policyNumber) return { policyNumber, data: result.data };
  const problem = emissionProblem(result.data);
  throw new Error(problem || "SMG cotizó el plan y no emitió la solicitud. El pedido quedó para el productor.");
}
