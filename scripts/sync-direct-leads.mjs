import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const raw = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of raw.split("\n")) {
  const clean = line.trim();
  if (!clean || clean.startsWith("#")) continue;
  const idx = clean.indexOf("=");
  if (idx === -1) continue;
  const k = clean.slice(0, idx).trim();
  let v = clean.slice(idx + 1).trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  env[k] = v;
}

const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, key);

function normalizeArPhone(phone) {
  let clean = String(phone || "").replace(/\D/g, "");
  if (clean.startsWith("0")) clean = clean.replace(/^0+/, "");
  if (clean.startsWith("549")) return clean;
  if (clean.startsWith("54") && clean.length >= 12) return `549${clean.slice(2)}`;
  if (clean.length >= 10) return `549${clean}`;
  if (clean.length >= 8) return `549387${clean.slice(-7)}`;
  return clean;
}

async function syncDirectLeads() {
  console.log("=== Sincronizando chats directos de WhatsApp a la tabla Leads ===");

  const { data: chats, error: cErr } = await sb.from("whatsapp_chats").select("*");
  if (cErr) {
    console.error("Error al leer whatsapp_chats:", cErr);
    return;
  }

  const { data: leads, error: lErr } = await sb.from("leads").select("id, nombre, celular");
  if (lErr) {
    console.error("Error al leer leads:", lErr);
    return;
  }

  const { data: afiliados, error: aErr } = await sb.from("afiliados").select("id, nombre, celular");
  if (aErr) {
    console.error("Error al leer afiliados:", aErr);
    return;
  }

  const knownPhones = new Set();
  for (const l of leads || []) {
    const n = normalizeArPhone(l.celular);
    if (n) {
      knownPhones.add(n);
      knownPhones.add(n.slice(-8));
    }
  }
  for (const a of afiliados || []) {
    const n = normalizeArPhone(a.celular);
    if (n) {
      knownPhones.add(n);
      knownPhones.add(n.slice(-8));
    }
  }

  let createdCount = 0;

  for (const chat of chats || []) {
    const norm = normalizeArPhone(chat.phone);
    if (!norm) continue;
    const last8 = norm.slice(-8);

    if (knownPhones.has(norm) || knownPhones.has(last8)) {
      console.log(`[EXISTE] Chat ${chat.phone} (${chat.name || "Sin nombre"}) ya está registrado en CRM.`);
      continue;
    }

    console.log(`[CREANDO LEAD] Chat ${chat.phone} (${chat.name || "Contacto WhatsApp"}) no estaba en leads. Creando...`);

    const payload = {
      nombre: chat.name?.trim() || "Contacto WhatsApp",
      celular: norm,
      origen: "whatsapp",
      origen_detalle: "whatsapp_directo",
      tags: ["whatsapp_directo"],
      estado: "nuevo",
      producto: "general",
      prioridad: "media",
      puntaje: 45,
      notas_iniciales: `Lead sincronizado automáticamente desde chat de WhatsApp directo.\nÚltimo mensaje recibido: "${chat.last_message || ""}"`,
      ultimo_contacto_at: chat.last_message_at || chat.updated_at || new Date().toISOString(),
    };

    const { data: newLead, error: insertErr } = await sb
      .from("leads")
      .insert(payload)
      .select("id")
      .single();

    if (insertErr) {
      console.error(`Error al crear lead para ${chat.phone}:`, insertErr.message);
      continue;
    }

    await sb.from("actividades").insert({
      lead_id: newLead.id,
      tipo: "sistema",
      titulo: "Lead incorporado desde WhatsApp directo",
      detalle: `Contacto original: ${chat.name || "Sin nombre"} (${chat.phone})`,
      autor: "sistema",
    });

    knownPhones.add(norm);
    knownPhones.add(last8);
    createdCount++;
    console.log(`✓ Creado lead ID ${newLead.id} para ${chat.name || "Contacto WhatsApp"}`);
  }

  console.log(`=== Sincronización finalizada. Leads creados: ${createdCount} ===`);
}

syncDirectLeads();
