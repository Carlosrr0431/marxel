/**
 * Vacía los datos operativos del CRM en Supabase.
 * Requiere WIPE_CRM=YES y las keys de .env.local.
 *
 * Conserva schema, login, conocimiento del chatbot y la fila __agent__.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

if (process.env.WIPE_CRM !== "YES") {
  console.error("Abortado: definí WIPE_CRM=YES para confirmar.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const TABLES = [
  "actividades",
  "seguimientos",
  "whatsapp_chat_messages",
  "whatsapp_chats",
  "whatsapp_outbound_queue",
  "afiliados",
  "leads",
];

async function countAll(table, extra = (q) => q) {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  query = extra(query);
  const { count, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function deleteAll(table, extra = (q) => q) {
  let remaining = await countAll(table, extra);
  let deleted = 0;
  while (remaining > 0) {
    let query = supabase.from(table).delete({ count: "exact" });
    query = extra(query);
    const { error, count } = await query;
    if (error) throw new Error(`delete ${table}: ${error.message}`);
    const n = count ?? 0;
    if (n === 0) break;
    deleted += n;
    remaining = await countAll(table, extra);
  }
  return deleted;
}

const before = {};
for (const table of TABLES) {
  before[table] = await countAll(table);
}
before.whatsapp_conversations = await countAll("whatsapp_conversations", (q) =>
  q.neq("phone", "__agent__")
);

console.log("Antes:", before);

for (const table of TABLES) {
  const n = await deleteAll(table, (q) => q.not("id", "is", null));
  console.log(`Vacío ${table}: ${n} filas`);
}

const convDeleted = await deleteAll("whatsapp_conversations", (q) =>
  q.neq("phone", "__agent__")
);
console.log(`Vacío whatsapp_conversations (sin __agent__): ${convDeleted} filas`);

const { error: throttleErr } = await supabase
  .from("whatsapp_send_throttle")
  .update({ last_sent_at: null })
  .eq("id", 1);
if (throttleErr) {
  console.warn("Throttle no actualizado:", throttleErr.message);
}

try {
  const { data: objects, error: listErr } = await supabase.storage
    .from("whatsapp-media")
    .list("", { limit: 1000 });
  if (listErr) {
    console.warn("Storage no listado:", listErr.message);
  } else if (objects?.length) {
    const paths = objects.map((o) => o.name);
    const { error: rmErr } = await supabase.storage.from("whatsapp-media").remove(paths);
    if (rmErr) console.warn("Storage no vaciado:", rmErr.message);
    else console.log(`Storage whatsapp-media: ${paths.length} objetos`);
  }
} catch (err) {
  console.warn("Storage omitido:", err instanceof Error ? err.message : err);
}

const after = {};
for (const table of TABLES) {
  after[table] = await countAll(table);
}
after.whatsapp_conversations = await countAll("whatsapp_conversations", (q) =>
  q.neq("phone", "__agent__")
);

console.log("Después:", after);

const leftover = Object.entries(after).filter(([, n]) => n > 0);
if (leftover.length) {
  console.error("Quedaron filas:", Object.fromEntries(leftover));
  process.exit(1);
}

console.log("CRM vacío.");
