/** Schema y tools estables para Responses API (cache de contexto). */

export const QUOTE_INTENT_JSON_SCHEMA = {
  name: "quote_intent",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "intent",
      "new_quote",
      "producto",
      "seguro_grupo",
      "year",
      "is0km",
      "brand_id",
      "brand_name",
      "model_id",
      "model_name",
      "version_id",
      "version_name",
      "cp",
      "localidad",
      "nombre",
      "celular",
      "seguro_detalle",
      "viajero_destino",
      "modalidad",
      "grupo_familiar",
      "edades",
      "uso",
      "reply",
      "needs_more_info",
      "missing",
      "confidence",
    ],
    properties: {
      intent: {
        type: "string",
        enum: ["quote", "question", "greeting", "cancel", "other"],
      },
      new_quote: { type: "boolean" },
      producto: {
        type: ["string", "null"],
        enum: ["seguros", "salud", "viajero", null],
      },
      seguro_grupo: {
        type: ["string", "null"],
        enum: ["auto", "auto_moto", "hogar_comercio", "praxis_art_ap", null],
      },
      year: { type: ["integer", "null"] },
      is0km: { type: "boolean" },
      brand_id: { type: ["integer", "null"] },
      brand_name: { type: ["string", "null"] },
      model_id: { type: ["integer", "null"] },
      model_name: { type: ["string", "null"] },
      version_id: { type: ["integer", "null"] },
      version_name: { type: ["string", "null"] },
      cp: { type: ["string", "null"] },
      localidad: { type: ["string", "null"] },
      nombre: { type: ["string", "null"] },
      celular: { type: ["string", "null"] },
      seguro_detalle: { type: ["string", "null"] },
      viajero_destino: { type: ["string", "null"] },
      modalidad: {
        type: ["string", "null"],
        enum: ["monotributo", "relacion_dependencia", "particular", null],
      },
      grupo_familiar: { type: ["string", "null"] },
      edades: { type: ["string", "null"] },
      uso: { type: ["string", "null"] },
      reply: { type: ["string", "null"] },
      needs_more_info: { type: "boolean" },
      missing: { type: "array", items: { type: "string" } },
      confidence: { type: "number" },
    },
  },
};

export const QUOTE_INTENT_TOOLS = [
  {
    type: "function",
    name: "lookup_auto_brands",
    description:
      "Busca marcas reales del catálogo San Cristóbal para un año. Obligatorio antes de devolver brand_id. No inventes IDs.",
    strict: false,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["year"],
      properties: {
        year: { type: "integer", description: "Año del auto, ej. 2020" },
        query: { type: "string", description: "Marca o alias, ej. toyota, vw, chevrolet" },
      },
    },
  },
  {
    type: "function",
    name: "lookup_auto_models",
    description:
      "Busca modelos reales de una marca y año. Obligatorio antes de devolver model_id.",
    strict: false,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["year", "brand_id"],
      properties: {
        year: { type: "integer" },
        brand_id: { type: "integer" },
        query: { type: "string", description: "Modelo, ej. gol, corolla, cronos" },
      },
    },
  },
  {
    type: "function",
    name: "lookup_auto_versions",
    description:
      "Busca versiones reales de un modelo. Obligatorio antes de devolver version_id.",
    strict: false,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["year", "brand_id", "model_id"],
      properties: {
        year: { type: "integer" },
        brand_id: { type: "integer" },
        model_id: { type: "integer" },
        query: { type: "string", description: "Versión, ej. trend, xei, 1.6" },
      },
    },
  },
  {
    type: "function",
    name: "lookup_locations",
    description:
      "Busca localidades reales por código postal. No inventes CP ni locationId.",
    strict: false,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["cp"],
      properties: {
        cp: { type: "string", description: "Código postal de 4 dígitos, ej. 4400" },
        query: { type: "string", description: "Nombre de localidad si hay varias" },
      },
    },
  },
  {
    type: "function",
    name: "lookup_prestadores",
    description:
      "Busca clínicas, sanatorios, institutos y centros de la cartilla A2/A4 en Salta por nombre (Jaraba, Tres Cerritos, Berg, etc.). Usalo SIEMPRE si preguntan si atienden, cubren o trabajan con un lugar.",
    strict: false,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: {
        query: { type: "string", description: "Nombre del prestador o parte, ej. jaraba, tres cerritos" },
      },
    },
  },
  {
    type: "function",
    name: "search_knowledge",
    description:
      "Consulta la base de MARXEN (salud, seguros, viajero, contacto). Usalo para preguntas. No inventes coberturas ni precios.",
    strict: false,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: {
        query: { type: "string" },
      },
    },
  },
  {
    type: "function",
    name: "get_contact_info",
    description: "WhatsApp, email y ubicación de MARXEN en Salta. Usalo si preguntan cómo contactar o dónde están.",
    strict: false,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
];
