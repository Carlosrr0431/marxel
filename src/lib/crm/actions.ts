"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type {
  AfiliadoEstado,
  LeadEstado,
  ModalidadIngreso,
  Prioridad,
  ProductoInteres,
  SeguimientoEstado,
  SeguimientoTipo,
} from "@/lib/crm/types";
import { scoreLead } from "@/lib/crm/utils";
import { normalizeArPhone } from "@/lib/whatsmeow/config";
import { setCrmChatName } from "@/lib/whatsmeow/crm-chat";

const COOKIE = "marxel_crm_session";

export async function isCrmAuthenticated() {
  const store = await cookies();
  const value = store.get(COOKIE)?.value;
  const expected = process.env.CRM_PASSWORD;
  if (!expected) return false;
  return value === hashSession(expected);
}

function hashSession(password: string) {
  return Buffer.from(`marxel:${password}`).toString("base64url");
}

export async function loginCrm(formData: FormData) {
  const password = String(formData.get("password") || "");
  const expected = process.env.CRM_PASSWORD || "";
  if (!password || password !== expected) {
    redirect("/crm/login?error=1");
  }
  const store = await cookies();
  store.set(COOKIE, hashSession(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  redirect("/crm");
}

export async function logoutCrm() {
  const store = await cookies();
  store.delete(COOKIE);
  redirect("/crm/login");
}

async function requireCrm() {
  if (!(await isCrmAuthenticated())) {
    redirect("/crm/login");
  }
}

function revalidateCrm() {
  revalidatePath("/crm");
  revalidatePath("/crm/leads");
  revalidatePath("/crm/pipeline");
  revalidatePath("/crm/afiliados");
  revalidatePath("/crm/seguimientos");
  revalidatePath("/crm/inbox");
  revalidatePath("/crm/chats");
}

export async function updateLeadEstado(leadId: string, estado: LeadEstado, motivo?: string) {
  await requireCrm();
  const supabase = createServiceClient();
  const patch: Record<string, unknown> = {
    estado,
    ultimo_contacto_at: new Date().toISOString(),
  };
  if (estado === "perdido" && motivo) patch.motivo_perdida = motivo;

  const { error } = await supabase.from("leads").update(patch).eq("id", leadId);
  if (error) throw new Error(error.message);

  await supabase.from("actividades").insert({
    lead_id: leadId,
    tipo: "cambio_estado",
    titulo: `Estado → ${estado}`,
    detalle: motivo || null,
    autor: "asesor",
  });
  revalidateCrm();
}

export async function updateLead(leadId: string, data: Record<string, unknown>) {
  await requireCrm();
  const supabase = createServiceClient();
  const { data: current } = await supabase.from("leads").select("*").eq("id", leadId).single();
  const merged = { ...(current || {}), ...data };
  data.puntaje = scoreLead(merged);
  const { error } = await supabase.from("leads").update(data).eq("id", leadId);
  if (error) throw new Error(error.message);
  revalidateCrm();
}

export async function createLeadManual(formData: FormData) {
  await requireCrm();
  const supabase = createServiceClient();
  const payload = {
    nombre: String(formData.get("nombre") || "").trim(),
    celular: String(formData.get("celular") || "").trim(),
    email: String(formData.get("email") || "") || null,
    dni: String(formData.get("dni") || "") || null,
    edad: formData.get("edad") ? Number(formData.get("edad")) : null,
    provincia: String(formData.get("provincia") || "") || null,
    localidad: String(formData.get("localidad") || "") || null,
    producto: String(formData.get("producto") || "general") as ProductoInteres,
    plan_interes: String(formData.get("plan_interes") || "") || null,
    modalidad: String(formData.get("modalidad") || "sin_definir") as ModalidadIngreso,
    origen: "otro" as const,
    prioridad: String(formData.get("prioridad") || "media") as Prioridad,
    notas_iniciales: String(formData.get("notas") || "") || null,
    tags: String(formData.get("tags") || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };
  if (!payload.nombre || !payload.celular) {
    throw new Error("Nombre y celular son obligatorios");
  }
  const puntaje = scoreLead(payload);
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...payload, puntaje })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidateCrm();
  redirect(`/crm/leads/${data.id}`);
}

export async function addNota(leadId: string | null, afiliadoId: string | null, formData: FormData) {
  await requireCrm();
  const detalle = String(formData.get("nota") || "").trim();
  if (!detalle) return;
  const supabase = createServiceClient();
  await supabase.from("actividades").insert({
    lead_id: leadId,
    afiliado_id: afiliadoId,
    tipo: "nota",
    titulo: "Nota",
    detalle,
    autor: "asesor",
  });
  revalidateCrm();
}

export async function createSeguimiento(formData: FormData) {
  await requireCrm();
  const supabase = createServiceClient();
  const leadId = String(formData.get("lead_id") || "") || null;
  const afiliadoId = String(formData.get("afiliado_id") || "") || null;
  let programado = String(formData.get("programado_para") || "");
  if (programado && !programado.includes("Z") && programado.length === 16) {
    programado = new Date(programado).toISOString();
  }
  const payload = {
    lead_id: leadId,
    afiliado_id: afiliadoId,
    titulo: String(formData.get("titulo") || "").trim(),
    descripcion: String(formData.get("descripcion") || "") || null,
    tipo: String(formData.get("tipo") || "whatsapp") as SeguimientoTipo,
    prioridad: String(formData.get("prioridad") || "media") as Prioridad,
    programado_para: programado || new Date().toISOString(),
    estado: "pendiente" as SeguimientoEstado,
    creado_por: "asesor",
  };
  if (!payload.titulo || (!leadId && !afiliadoId)) {
    throw new Error("Datos incompletos");
  }
  const { error } = await supabase.from("seguimientos").insert(payload);
  if (error) throw new Error(error.message);
  revalidateCrm();
}

export async function completeSeguimiento(id: string, resultado?: string) {
  await requireCrm();
  const supabase = createServiceClient();
  const { data: seg } = await supabase.from("seguimientos").select("*").eq("id", id).single();

  const { error } = await supabase
    .from("seguimientos")
    .update({
      estado: "hecho",
      completado_at: new Date().toISOString(),
      resultado: resultado || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (seg) {
    await supabase.from("actividades").insert({
      lead_id: seg.lead_id,
      afiliado_id: seg.afiliado_id,
      tipo: "seguimiento",
      titulo: `Seguimiento completado: ${seg.titulo}`,
      detalle: resultado || null,
      autor: "asesor",
    });
    if (seg.lead_id) {
      await supabase
        .from("leads")
        .update({ ultimo_contacto_at: new Date().toISOString() })
        .eq("id", seg.lead_id);
    }
  }
  revalidateCrm();
}

export async function cancelSeguimiento(id: string) {
  await requireCrm();
  const supabase = createServiceClient();
  await supabase.from("seguimientos").update({ estado: "cancelado" }).eq("id", id);
  revalidateCrm();
}

export async function snoozeSeguimiento(id: string, hours = 24) {
  await requireCrm();
  const supabase = createServiceClient();
  const when = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  await supabase
    .from("seguimientos")
    .update({ programado_para: when, estado: "pendiente" })
    .eq("id", id);
  revalidateCrm();
}

export async function convertLeadQuiet(leadId: string) {
  await requireCrm();
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("convertir_lead_a_afiliado", {
    p_lead_id: leadId,
  });
  if (error) throw new Error(error.message);
  revalidateCrm();
  return String(data || "");
}

export async function convertLead(leadId: string) {
  const afiliadoId = await convertLeadQuiet(leadId);
  redirect(`/crm/afiliados/${afiliadoId}`);
}

export async function updateChatFicha(
  phone: string,
  patch: {
    nombre?: string;
    email?: string;
    localidad?: string;
    producto?: ProductoInteres;
    plan_interes?: string;
  }
) {
  await requireCrm();
  const celular = normalizeArPhone(phone);
  if (!celular) throw new Error("Celular inválido");

  const nombre = typeof patch.nombre === "string" ? patch.nombre.trim() : "";
  if (nombre) {
    const renamed = await setCrmChatName(celular, nombre);
    if (!renamed.ok) throw new Error(renamed.error);
  }

  const leadPatch: Record<string, unknown> = {};
  if (nombre) leadPatch.nombre = nombre;
  if ("email" in patch) leadPatch.email = String(patch.email || "").trim() || null;
  if ("localidad" in patch) leadPatch.localidad = String(patch.localidad || "").trim() || null;
  if (patch.producto) leadPatch.producto = patch.producto;
  if ("plan_interes" in patch) {
    leadPatch.plan_interes = String(patch.plan_interes || "").trim() || null;
  }

  const touchesLead =
    Boolean(leadPatch.email) ||
    Boolean(leadPatch.localidad) ||
    Boolean(leadPatch.producto) ||
    "plan_interes" in patch ||
    "email" in patch ||
    "localidad" in patch;

  if (!nombre && !touchesLead) return null;

  const supabase = createServiceClient();
  const last8 = celular.slice(-8);
  const { data: rows } = await supabase
    .from("leads")
    .select("id,celular")
    .or(
      [`celular.eq.${celular}`, celular.startsWith("549") ? `celular.eq.${celular.slice(3)}` : "", last8 ? `celular.ilike.%${last8}` : ""]
        .filter(Boolean)
        .join(",")
    )
    .order("updated_at", { ascending: false })
    .limit(8);
  const found = (rows || []).find((row) => {
    const other = normalizeArPhone(String(row.celular || ""));
    return other === celular || other.slice(-8) === last8;
  });

  if (!found?.id && !touchesLead && nombre) return null;

  const leadId = found?.id
    ? String(found.id)
    : await ensureLeadFromChat(celular, nombre || "WhatsApp");
  if (Object.keys(leadPatch).length) {
    await updateLead(leadId, leadPatch);
  }
  return leadId;
}

export async function ensureLeadFromChat(phone: string, name: string) {
  await requireCrm();
  const celular = normalizeArPhone(phone);
  if (!celular) throw new Error("Celular inválido");
  const supabase = createServiceClient();
  const last8 = celular.slice(-8);
  const { data: rows } = await supabase
    .from("leads")
    .select("id,celular")
    .or(
      [`celular.eq.${celular}`, celular.startsWith("549") ? `celular.eq.${celular.slice(3)}` : "", last8 ? `celular.ilike.%${last8}` : ""]
        .filter(Boolean)
        .join(",")
    )
    .order("updated_at", { ascending: false })
    .limit(8);
  const found = (rows || []).find((row) => {
    const other = normalizeArPhone(String(row.celular || ""));
    return other === celular || other.slice(-8) === last8;
  });
  if (found?.id) return found.id as string;

  const payload = {
    nombre: String(name || "").trim() || "WhatsApp",
    celular,
    origen: "whatsapp" as const,
    origen_detalle: "chat crm",
    estado: "contactado" as const,
    producto: "general" as const,
    prioridad: "media" as const,
    tags: ["whatsapp", "chat"],
    notas_iniciales: "Ficha creada desde el chat de WhatsApp.",
    ultimo_contacto_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...payload, puntaje: scoreLead(payload) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("actividades").insert({
    lead_id: data.id,
    tipo: "sistema",
    titulo: "Lead creado desde el chat",
    autor: "asesor",
  });
  revalidateCrm();
  return data.id as string;
}

export async function updateAfiliado(id: string, data: Record<string, unknown>) {
  await requireCrm();
  const supabase = createServiceClient();
  const { error } = await supabase.from("afiliados").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateCrm();
}

export async function updateAfiliadoEstado(id: string, estado: AfiliadoEstado) {
  await requireCrm();
  const supabase = createServiceClient();
  await supabase.from("afiliados").update({ estado }).eq("id", id);
  await supabase.from("actividades").insert({
    afiliado_id: id,
    tipo: "cambio_estado",
    titulo: `Estado afiliado → ${estado}`,
    autor: "asesor",
  });
  revalidateCrm();
}

export async function logWhatsApp(
  leadId: string | null,
  afiliadoId: string | null,
  detalle?: string
) {
  await requireCrm();
  const supabase = createServiceClient();
  await supabase.from("actividades").insert({
    lead_id: leadId,
    afiliado_id: afiliadoId,
    tipo: "whatsapp",
    titulo: "WhatsApp abierto",
    detalle: detalle || "Se abrió conversación por WhatsApp desde el CRM.",
    autor: "asesor",
  });
  if (leadId) {
    const { data: lead } = await supabase.from("leads").select("estado").eq("id", leadId).single();
    const patch: Record<string, unknown> = {
      ultimo_contacto_at: new Date().toISOString(),
    };
    if (lead?.estado === "nuevo") patch.estado = "contactado";
    await supabase.from("leads").update(patch).eq("id", leadId);
  }
  revalidateCrm();
}

export async function bulkUpdateLeadEstado(ids: string[], estado: LeadEstado) {
  await requireCrm();
  if (!ids.length) return;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("leads")
    .update({ estado, ultimo_contacto_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw new Error(error.message);
  await supabase.from("actividades").insert(
    ids.map((lead_id) => ({
      lead_id,
      tipo: "cambio_estado" as const,
      titulo: `Estado masivo → ${estado}`,
      autor: "asesor",
    }))
  );
  revalidateCrm();
}

export async function addLeadTag(leadId: string, tag: string) {
  await requireCrm();
  const clean = tag.trim().toLowerCase();
  if (!clean) return;
  const supabase = createServiceClient();
  const { data } = await supabase.from("leads").select("tags").eq("id", leadId).single();
  const tags = Array.from(new Set([...(data?.tags || []), clean]));
  await supabase.from("leads").update({ tags }).eq("id", leadId);
  revalidateCrm();
}

export async function recalculateLeadScore(leadId: string) {
  await requireCrm();
  const supabase = createServiceClient();
  const { data } = await supabase.from("leads").select("*").eq("id", leadId).single();
  if (!data) return;
  await supabase.from("leads").update({ puntaje: scoreLead(data) }).eq("id", leadId);
  revalidateCrm();
}
