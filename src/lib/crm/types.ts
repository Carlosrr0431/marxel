export type LeadEstado =
  | "nuevo"
  | "contactado"
  | "interesado"
  | "documentacion"
  | "cotizado"
  | "ganado"
  | "perdido";

export type LeadOrigen =
  | "web"
  | "whatsapp"
  | "referido"
  | "llamada"
  | "redes"
  | "otro";

export type ProductoInteres = "seguros" | "salud" | "viajero" | "general";

export type ModalidadIngreso =
  | "monotributo"
  | "relacion_dependencia"
  | "particular"
  | "no_aplica"
  | "sin_definir";

export type TipoConsulta = "no_cliente" | "ya_cliente";

export type AfiliadoEstado =
  | "activo"
  | "pendiente_alta"
  | "en_tramite"
  | "suspendido"
  | "baja";

export type SeguimientoTipo =
  | "whatsapp"
  | "llamada"
  | "email"
  | "reunion"
  | "documentacion"
  | "cotizacion"
  | "otro";

export type SeguimientoEstado = "pendiente" | "hecho" | "cancelado" | "vencido";

export type ActividadTipo =
  | "nota"
  | "cambio_estado"
  | "seguimiento"
  | "whatsapp"
  | "llamada"
  | "email"
  | "conversion"
  | "sistema";

export type Prioridad = "baja" | "media" | "alta" | "urgente";

export type Lead = {
  id: string;
  created_at: string;
  updated_at: string;
  nombre: string;
  dni: string | null;
  celular: string;
  email: string | null;
  edad: number | null;
  localidad: string | null;
  provincia: string | null;
  tipo_consulta: TipoConsulta;
  producto: ProductoInteres;
  plan_interes: string | null;
  coberturas: string | null;
  modalidad: ModalidadIngreso;
  origen: LeadOrigen;
  origen_detalle: string | null;
  estado: LeadEstado;
  prioridad: Prioridad;
  puntaje: number;
  tags: string[];
  proximo_contacto_at: string | null;
  ultimo_contacto_at: string | null;
  fecha_contacto: string | null;
  motivo_perdida: string | null;
  asignado_a: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  page_path: string | null;
  user_agent: string | null;
  notas_iniciales: string | null;
};

export type Afiliado = {
  id: string;
  created_at: string;
  updated_at: string;
  lead_id: string | null;
  nombre: string;
  dni: string | null;
  celular: string;
  email: string | null;
  edad: number | null;
  localidad: string | null;
  provincia: string | null;
  producto: ProductoInteres;
  plan: string | null;
  modalidad: ModalidadIngreso;
  estado: AfiliadoEstado;
  fecha_vigencia: string | null;
  fecha_alta: string | null;
  numero_afiliado: string | null;
  grupo_familiar: number | null;
  cuota_estimada: number | null;
  obra_social_convenio: string | null;
  cartilla_notas: string | null;
  docs_completos: boolean;
  docs_pendientes: string[];
  prioridad: Prioridad;
  tags: string[];
  proximo_contacto_at: string | null;
  ultimo_contacto_at: string | null;
  asignado_a: string | null;
  notas: string | null;
};

export type Seguimiento = {
  id: string;
  created_at: string;
  updated_at: string;
  lead_id: string | null;
  afiliado_id: string | null;
  titulo: string;
  descripcion: string | null;
  tipo: SeguimientoTipo;
  estado: SeguimientoEstado;
  prioridad: Prioridad;
  programado_para: string;
  completado_at: string | null;
  resultado: string | null;
  creado_por: string | null;
  leads?: Pick<Lead, "id" | "nombre" | "celular"> | null;
  afiliados?: Pick<Afiliado, "id" | "nombre" | "celular"> | null;
};

export type Actividad = {
  id: string;
  created_at: string;
  lead_id: string | null;
  afiliado_id: string | null;
  tipo: ActividadTipo;
  titulo: string;
  detalle: string | null;
  meta: Record<string, unknown>;
  autor: string | null;
};

export type CrmStats = {
  total_leads: number;
  leads_nuevos: number;
  leads_abiertos: number;
  leads_semana: number;
  total_afiliados: number;
  afiliados_activos: number;
  seguimientos_pendientes: number;
  seguimientos_vencidos: number;
  conversiones_mes: number;
};

export const LEAD_ESTADOS: { value: LeadEstado; label: string; color: string }[] = [
  { value: "nuevo", label: "Nuevo", color: "bg-sky/20 text-blue" },
  { value: "contactado", label: "Contactado", color: "bg-mist text-navy" },
  { value: "interesado", label: "Interesado", color: "bg-aqua text-teal" },
  { value: "documentacion", label: "Documentación", color: "bg-amber-100 text-amber-800" },
  { value: "cotizado", label: "Cotizado", color: "bg-violet-100 text-violet-800" },
  { value: "ganado", label: "Ganado", color: "bg-emerald-100 text-emerald-800" },
  { value: "perdido", label: "Perdido", color: "bg-rose-100 text-rose-800" },
];

export const AFILIADO_ESTADOS: { value: AfiliadoEstado; label: string; color: string }[] = [
  { value: "pendiente_alta", label: "Pendiente alta", color: "bg-amber-100 text-amber-800" },
  { value: "en_tramite", label: "En trámite", color: "bg-sky/20 text-blue" },
  { value: "activo", label: "Activo", color: "bg-emerald-100 text-emerald-800" },
  { value: "suspendido", label: "Suspendido", color: "bg-orange-100 text-orange-800" },
  { value: "baja", label: "Baja", color: "bg-rose-100 text-rose-800" },
];

export const PRODUCTOS: { value: ProductoInteres; label: string }[] = [
  { value: "salud", label: "Salud · Prepagas" },
  { value: "seguros", label: "Seguros" },
  { value: "viajero", label: "Viajero" },
  { value: "general", label: "General" },
];

export const MODALIDADES: { value: ModalidadIngreso; label: string }[] = [
  { value: "sin_definir", label: "Sin definir" },
  { value: "monotributo", label: "Monotributo" },
  { value: "relacion_dependencia", label: "Relación de dependencia" },
  { value: "particular", label: "Particular" },
  { value: "no_aplica", label: "No aplica" },
];

export const PRIORIDADES: { value: Prioridad; label: string }[] = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export const SEGUIMIENTO_TIPOS: { value: SeguimientoTipo; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "llamada", label: "Llamada" },
  { value: "email", label: "Email" },
  { value: "reunion", label: "Reunión" },
  { value: "documentacion", label: "Documentación" },
  { value: "cotizacion", label: "Cotización" },
  { value: "otro", label: "Otro" },
];

export function mapInteresToProducto(interes: string): ProductoInteres {
  const t = interes.toLowerCase();
  if (t.includes("salud") || t.includes("prevención") || t.includes("prepaga")) return "salud";
  if (t.includes("seguro")) return "seguros";
  if (t.includes("viajero") || t.includes("viaje")) return "viajero";
  return "general";
}

export function whatsappLink(celular: string, text?: string) {
  const digits = celular.replace(/\D/g, "");
  const phone = digits.startsWith("54") ? digits : `54${digits}`;
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${phone}${q}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatMoney(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}
