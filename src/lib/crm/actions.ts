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
import { SITE_URL } from "@/lib/seo";
import { normalizeArPhone } from "@/lib/whatsmeow/config";
import { setCrmChatName } from "@/lib/whatsmeow/crm-chat";
import { deleteGoogleEvent, findGoogleEventIdByMarker, listGoogleEvents, upsertGoogleEvent } from "@/lib/crm/google-calendar";
import { eventColor, packEventColor, readEventSeries, repeatDates, stripEventMeta, withEventSeries } from "@/lib/crm/event-meta";
import { cancelCalendarReminderPrefix, cancelCalendarReminders, syncCalendarReminders } from "@/lib/crm/calendar-reminders";
import {
  CALENDAR_NOTIFY_COOKIE,
  NOTIFY_MINUTES,
  readCalendarNotify,
  type CalendarNotify,
} from "@/lib/crm/calendar-notify";

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

async function mirrorSeguimientoToGoogle(id: string) {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("seguimientos")
      .select("id,titulo,descripcion,programado_para")
      .eq("id", id)
      .maybeSingle();
    if (!data) return;
    const linked = await supabase
      .from("seguimientos")
      .select("google_event_id")
      .eq("id", id)
      .maybeSingle();
    const currentId = linked.error
      ? await findGoogleEventIdByMarker(id)
      : ((linked.data?.google_event_id as string | null) || (await findGoogleEventIdByMarker(id)));
    const notify = await readCalendarNotify();
    const note = data.descripcion ? String(data.descripcion) : "";
    const googleId = await upsertGoogleEvent({
      eventId: currentId,
      title: String(data.titulo),
      description: [note, `[MARXEN:${id}]`].filter(Boolean).join("\n"),
      start: String(data.programado_para),
      reminderMinutes: notify.googleMinutes,
      colorId: eventColor(note.match(/\[MARXEN-COLOR:(naranja|amarillo|verde|azul|violeta)\]/)?.[1])?.googleId,
    });
    if (googleId && googleId !== currentId && !linked.error) {
      await supabase.from("seguimientos").update({ google_event_id: googleId }).eq("id", id);
    }
  } catch {
    // La conexión de Gmail es opcional.
  }
}

function revalidateCrm() {
  revalidatePath("/crm");
  revalidatePath("/crm/leads");
  revalidatePath("/crm/pipeline");
  revalidatePath("/crm/afiliados");
  revalidatePath("/crm/seguimientos");
  revalidatePath("/crm/calendario");
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
  const color = String(formData.get("color") || "");
  const everyDays = Math.min(365, Math.max(0, Math.floor(Number(formData.get("cada_dias") || 0) || 0)));
  const descripcion = packEventColor(String(formData.get("descripcion") || ""), color);
  const payload = {
    lead_id: leadId,
    afiliado_id: afiliadoId,
    titulo: String(formData.get("titulo") || "").trim(),
    descripcion,
    tipo: String(formData.get("tipo") || "whatsapp") as SeguimientoTipo,
    prioridad: String(formData.get("prioridad") || "media") as Prioridad,
    programado_para: programado || new Date().toISOString(),
    estado: "pendiente" as SeguimientoEstado,
    creado_por: "asesor",
  };
  if (!payload.titulo) {
    throw new Error("El título es obligatorio");
  }
  const dates = repeatDates(payload.programado_para, everyDays);
  if (dates.length > 1) payload.descripcion = withEventSeries(descripcion, crypto.randomUUID());
  if (!leadId && !afiliadoId) {
    const notify = await readCalendarNotify();
    const googleId = await upsertGoogleEvent({
      title: payload.titulo,
      description: descripcion,
      start: payload.programado_para,
      reminderMinutes: notify.googleMinutes,
      colorId: eventColor(color)?.googleId,
      everyDays,
    });
    if (!googleId) throw new Error("Conectá Gmail para agendar sin contacto");
    await syncGoogleEventReminders(googleId, payload.titulo, payload.programado_para, descripcion);
    revalidateCrm();
    return;
  }
  let firstId = "";
  const queued: { key: string; title: string; start: string }[] = [];
  for (const start of dates) {
    const { data, error } = await supabase
      .from("seguimientos")
      .insert({ ...payload, programado_para: start })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (!firstId && data?.id) firstId = String(data.id);
    if (data?.id) {
      queued.push({
        key: `crm:${data.id}`,
        title: payload.titulo,
        start,
      });
    }
  }
  if (firstId) await mirrorSeguimientoToGoogle(firstId);
  const link = leadId ? `${SITE_URL}/crm/leads/${leadId}` : `${SITE_URL}/crm/calendario`;
  await syncCalendarReminders(
    queued.map((item) => ({ ...item, note: stripEventMeta(payload.descripcion), link })),
  ).catch(() => null);
  await notifySeguimientoWhatsapp({
    titulo: payload.titulo,
    fecha: payload.programado_para,
    leadId,
    afiliadoId,
    notas: stripEventMeta(descripcion),
  });
  revalidateCrm();
}

function localDateTime(value: string) {
  if (value && !value.includes("Z") && value.length === 16) return new Date(value).toISOString();
  return value;
}

export async function updateSeguimiento(formData: FormData) {
  await requireCrm();
  const id = String(formData.get("id") || "");
  const leadId = String(formData.get("lead_id") || "") || null;
  const afiliadoId = String(formData.get("afiliado_id") || "") || null;
  const titulo = String(formData.get("titulo") || "").trim();
  const programado = localDateTime(String(formData.get("programado_para") || ""));
  if (!id || !titulo || !programado) {
    throw new Error("Datos incompletos");
  }
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("seguimientos")
    .update({
      lead_id: leadId,
      afiliado_id: afiliadoId,
      titulo,
      descripcion: packEventColor(String(formData.get("descripcion") || ""), String(formData.get("color") || "")),
      tipo: String(formData.get("tipo") || "whatsapp") as SeguimientoTipo,
      prioridad: String(formData.get("prioridad") || "media") as Prioridad,
      programado_para: programado,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await mirrorSeguimientoToGoogle(id);
  await remindCrmById(id);
  revalidateCrm();
}

async function remindCrmById(id: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("seguimientos")
    .select("id,titulo,descripcion,programado_para,lead_id,estado")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.estado === "hecho" || data.estado === "cancelado") return;
  await syncCalendarReminders([
    {
      key: `crm:${data.id}`,
      title: String(data.titulo),
      start: String(data.programado_para),
      note: stripEventMeta(data.descripcion) || null,
      link: data.lead_id ? `${SITE_URL}/crm/leads/${data.lead_id}` : `${SITE_URL}/crm/calendario`,
    },
  ]).catch(() => null);
}

export async function updateGoogleCalendarEvent(formData: FormData) {
  await requireCrm();
  const id = String(formData.get("google_event_id") || "");
  const titulo = String(formData.get("titulo") || "").trim();
  const programado = localDateTime(String(formData.get("programado_para") || ""));
  if (!id || !titulo || !programado) throw new Error("Datos incompletos");
  const notify = await readCalendarNotify();
  const color = String(formData.get("color") || "");
  const googleId = await upsertGoogleEvent({
    eventId: id,
    title: titulo,
    description: packEventColor(String(formData.get("descripcion") || ""), color),
    start: programado,
    reminderMinutes: notify.googleMinutes,
    colorId: eventColor(color)?.googleId,
  });
  if (!googleId) throw new Error("No se pudo guardar en Google Calendar");
  await syncGoogleEventReminders(googleId, titulo, programado, String(formData.get("descripcion") || ""));
  revalidateCrm();
}

async function syncGoogleEventReminders(googleId: string, title: string, start: string, note: string | null) {
  const from = new Date();
  const until = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const items = await listGoogleEvents(from, until).catch(() => []);
  const related = items.filter((item) => item.id === googleId || item.recurringEventId === googleId);
  const events = related.length
    ? related.map((item) => ({
        key: `google:${item.id}`,
        title: item.title || title,
        start: item.start,
        note: stripEventMeta(item.description) || null,
      }))
    : [{ key: `google:${googleId}`, title, start, note: stripEventMeta(note) || null }];
  await syncCalendarReminders(events).catch(() => null);
}

export async function deleteGoogleCalendarEvent(id: string, series = false) {
  await requireCrm();
  if (!id) throw new Error("Evento inválido");
  await deleteGoogleEvent(id);
  if (series) await cancelCalendarReminderPrefix(`google:${id}`);
  else await cancelCalendarReminders(`google:${id}`);
  revalidateCrm();
}

export async function saveCalendarNotify(formData: FormData) {
  await requireCrm();
  const minutes = Number(formData.get("google_minutes"));
  const prefs: CalendarNotify = {
    googleMinutes: NOTIFY_MINUTES.includes(minutes as CalendarNotify["googleMinutes"])
      ? (minutes as CalendarNotify["googleMinutes"])
      : 30,
    whatsapp: formData.get("whatsapp") === "1",
  };
  const store = await cookies();
  store.set(CALENDAR_NOTIFY_COOKIE, JSON.stringify(prefs), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/crm/calendario");
}

async function notifySeguimientoWhatsapp(input: {
  titulo: string;
  fecha: string;
  leadId: string | null;
  afiliadoId: string | null;
  notas: string | null;
}) {
  const prefs = await readCalendarNotify();
  if (!prefs.whatsapp) return;
  const supabase = createServiceClient();
  const person = input.leadId
    ? await supabase.from("leads").select("nombre,celular").eq("id", input.leadId).maybeSingle()
    : input.afiliadoId
      ? await supabase.from("afiliados").select("nombre,celular").eq("id", input.afiliadoId).maybeSingle()
      : { data: null };
  await notificarSeguimientoAgente({
    titulo: input.titulo,
    nombre: person.data?.nombre,
    celular: person.data?.celular,
    fecha: input.fecha,
    leadId: input.leadId,
    notas: input.notas,
  });
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
  await cancelCalendarReminders(`crm:${id}`);

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

export async function cancelSeguimientoSerie(id: string) {
  await requireCrm();
  const supabase = createServiceClient();
  const current = await supabase.from("seguimientos").select("id,descripcion").eq("id", id).maybeSingle();
  const serie = readEventSeries(current.data?.descripcion);
  if (!serie) {
    await cancelSeguimiento(id);
    return;
  }
  const { data } = await supabase
    .from("seguimientos")
    .select("id,google_event_id")
    .ilike("descripcion", `%[MARXEN-SERIE:${serie}]%`)
    .neq("estado", "cancelado")
    .limit(80);
  for (const row of data || []) {
    await supabase.from("seguimientos").update({ estado: "cancelado" }).eq("id", row.id);
    await cancelCalendarReminders(`crm:${row.id}`);
    const googleId = (row.google_event_id as string | null) || (await findGoogleEventIdByMarker(row.id));
    if (googleId) await deleteGoogleEvent(googleId).catch(() => null);
  }
  revalidateCrm();
}

export async function cancelSeguimiento(id: string) {
  await requireCrm();
  const supabase = createServiceClient();
  const linked = await supabase.from("seguimientos").select("google_event_id").eq("id", id).maybeSingle();
  await supabase.from("seguimientos").update({ estado: "cancelado" }).eq("id", id);
  await cancelCalendarReminders(`crm:${id}`);
  const googleId = linked.error
    ? await findGoogleEventIdByMarker(id)
    : ((linked.data?.google_event_id as string | null) || (await findGoogleEventIdByMarker(id)));
  if (googleId) await deleteGoogleEvent(googleId).catch(() => null);
  revalidateCrm();
}

export async function rescheduleSeguimiento(id: string, programadoPara: string) {
  await requireCrm();
  const when = new Date(programadoPara);
  if (Number.isNaN(when.getTime())) throw new Error("Fecha inválida");
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("seguimientos")
    .update({ programado_para: when.toISOString(), estado: "pendiente" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await mirrorSeguimientoToGoogle(id);
  await remindCrmById(id);
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
  await mirrorSeguimientoToGoogle(id);
  await remindCrmById(id);
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

export async function revertirAfiliadoALead(afiliadoId: string) {
  await requireCrm();
  const supabase = createServiceClient();
  const { data: af } = await supabase
    .from("afiliados")
    .select("*")
    .eq("id", afiliadoId)
    .single();
  if (!af) throw new Error("Afiliado no encontrado");

  if (af.lead_id) {
    await supabase
      .from("leads")
      .update({ estado: "interesado", updated_at: new Date().toISOString() })
      .eq("id", af.lead_id);

    await supabase.from("actividades").insert({
      lead_id: af.lead_id,
      afiliado_id: afiliadoId,
      tipo: "cambio_estado",
      titulo: "Revertido de Afiliado a Lead",
      detalle: "Se canceló la conversión a afiliado y volvió al pipeline de leads.",
      autor: "asesor",
    });

    await supabase.from("afiliados").delete().eq("id", afiliadoId);
    revalidateCrm();
    redirect(`/crm/leads/${af.lead_id}`);
  } else {
    const payload = {
      nombre: af.nombre,
      celular: af.celular,
      email: af.email,
      dni: af.dni,
      edad: af.edad,
      localidad: af.localidad,
      provincia: af.provincia,
      producto: af.producto,
      plan_interes: af.plan,
      modalidad: af.modalidad,
      estado: "interesado" as const,
      origen: "otro" as const,
      notas_iniciales: af.notas,
    };
    const { data: newLead, error } = await supabase
      .from("leads")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("afiliados").delete().eq("id", afiliadoId);
    revalidateCrm();
    redirect(`/crm/leads/${newLead.id}`);
  }
}

export async function notificarSeguimientoAgente(seguimiento: {
  titulo: string;
  nombre?: string | null;
  celular?: string | null;
  fecha: string;
  leadId?: string | null;
  notas?: string | null;
}) {
  const { getProducerWhatsapp } = await import("@/lib/whatsmeow/producer-notify");
  const { sendWhatsmeowText } = await import("@/lib/whatsmeow/client");
  const { getWhatsmeowAgentCode } = await import("@/lib/whatsmeow/config");
  const producer = getProducerWhatsapp();
  if (!producer) return;
  const agent = getWhatsmeowAgentCode();
  const crmLink = seguimiento.leadId
    ? `\nCRM: https://www.marxen.com.ar/crm/leads/${seguimiento.leadId}`
    : "";
  const text = [
    "📅 *Recordatorio Agendado para Asesor*",
    `Tarea: ${seguimiento.titulo}`,
    seguimiento.nombre ? `Contacto: ${seguimiento.nombre}` : null,
    seguimiento.celular ? `Tel: ${seguimiento.celular}` : null,
    `Fecha/Hora: ${new Date(seguimiento.fecha).toLocaleString("es-AR")}`,
    seguimiento.notas ? `Notas: ${seguimiento.notas}` : null,
    crmLink,
  ]
    .filter(Boolean)
    .join("\n");

  await sendWhatsmeowText(agent, producer, text, { wake: true }).catch(() => null);
}

export async function activarSeguimientoIA(
  seguimientoId: string,
  leadId?: string | null,
  phone?: string | null,
  instructions?: string
) {
  await requireCrm();
  const supabase = createServiceClient();
  const { normalizeArPhone } = await import("@/lib/whatsmeow/config");
  const key = phone ? normalizeArPhone(phone) : null;
  if (key) {
    const { setChatAgentEnabled } = await import("@/lib/whatsmeow/agent-control");
    await setChatAgentEnabled(key, true);

    try {
      const { loadConversation } = await import("@/lib/whatsmeow/conversations");
      const { runChatTurn } = await import("@/lib/chatbot/run-turn");
      const { sendWhatsmeowText } = await import("@/lib/whatsmeow/client");
      const { getWhatsmeowAgentCode } = await import("@/lib/whatsmeow/config");
      const { saveCrmWhatsappMessage } = await import("@/lib/whatsmeow/crm-chat");

      const conv = await loadConversation(key);
      const prompt =
        instructions ||
        "Hola, te escribo para retomar el contacto desde Marxen Seguros. ¿Pudiste revisar las opciones o te gustaría consultar algo?";
      const turn = await runChatTurn({
        message: prompt,
        history: conv.history,
        quoteState: conv.quote_state,
        channel: "whatsapp",
        knownPhone: key,
      });

      if (turn.answer) {
        const agent = getWhatsmeowAgentCode();
        const sent = await sendWhatsmeowText(agent, key, turn.answer, { wake: true });
        if (sent.success && "messageId" in sent && sent.messageId) {
          await saveCrmWhatsappMessage({
            phone: key,
            direction: "outbound",
            body: turn.answer,
            fromMe: true,
            waMessageId: sent.messageId,
            source: "ai_followup",
          });
        }
      }
    } catch (err) {
      console.warn("[ia-followup]", err);
    }
  }

  await supabase
    .from("seguimientos")
    .update({
      estado: "hecho",
      completado_at: new Date().toISOString(),
      resultado: "Retomado automáticamente por Agente IA",
    })
    .eq("id", seguimientoId);

  if (leadId) {
    await supabase.from("actividades").insert({
      lead_id: leadId,
      tipo: "sistema",
      titulo: "Seguimiento retomado por IA",
      detalle:
        instructions ||
        "Agente IA reactivado para continuar el seguimiento automático del contacto.",
      autor: "sistema",
    });
  }
  revalidateCrm();
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
