import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidEmail, normalizeEmail, type MailRecipient } from "@/lib/mailing/recipients";

type NorteRow = { e: string; n: string };

const POOL_FILE = join(process.cwd(), "data/mailing/personas-norte.json.gz");
const PAGE = 1000;

let poolCache: NorteRow[] | null = null;

export function loadNortePool(): NorteRow[] {
  if (poolCache) return poolCache;
  const raw = gunzipSync(readFileSync(POOL_FILE)).toString("utf8");
  poolCache = JSON.parse(raw) as NorteRow[];
  return poolCache;
}

export async function loadSentEmailSet(supabase: SupabaseClient) {
  const statusByCampaign = new Map<string, string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("mailing_campaigns")
      .select("id,status")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data || [];
    for (const row of rows) {
      statusByCampaign.set(String(row.id), String(row.status || ""));
    }
    if (rows.length < PAGE) break;
  }

  const sent = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("mailing_recipients")
      .select("email,last_event,campaign_id")
      .neq("last_event", "queued")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data || [];
    for (const row of rows) {
      const status = statusByCampaign.get(String(row.campaign_id || ""));
      if (status === "test" || status === "failed") continue;
      const email = normalizeEmail(String(row.email || ""));
      if (email) sent.add(email);
    }
    if (rows.length < PAGE) break;
  }
  return sent;
}

export function takeUnusedFromPool(input: {
  count: number;
  sent: Set<string>;
  exclude: Set<string>;
}) {
  const count = Math.max(0, Math.floor(input.count));
  const taken: MailRecipient[] = [];
  if (!count) return taken;
  for (const row of loadNortePool()) {
    if (taken.length >= count) break;
    const email = normalizeEmail(row.e);
    if (!isValidEmail(email)) continue;
    if (input.sent.has(email) || input.exclude.has(email)) continue;
    taken.push({ email, name: String(row.n || "").trim() });
  }
  return taken;
}

export function poolStats(sent: Set<string>) {
  const total = loadNortePool().length;
  let remaining = 0;
  for (const row of loadNortePool()) {
    if (!sent.has(normalizeEmail(row.e))) remaining += 1;
  }
  return { total, remaining, sent: sent.size };
}

export function splitUnsent(
  list: MailRecipient[],
  sent: Set<string>,
  allowRepeat?: Set<string>
) {
  const kept: MailRecipient[] = [];
  const skipped: string[] = [];
  for (const row of list) {
    const email = normalizeEmail(row.email);
    if (!isValidEmail(email)) continue;
    if (sent.has(email) && !allowRepeat?.has(email)) {
      skipped.push(email);
      continue;
    }
    kept.push({ email, name: String(row.name || "").trim() });
  }
  return { kept, skipped };
}
