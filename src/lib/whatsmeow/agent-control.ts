import { emptyQuoteState } from "@/lib/chatbot/quote-flow";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeArPhone } from "@/lib/whatsmeow/config";

export const WHATSAPP_TEST_PHONE = "3878630173";
export const WHATSAPP_AGENT_ALLOWLIST = [WHATSAPP_TEST_PHONE];

const SETTINGS_PHONE = "__agent__";
const ON = "agent:on";
const OFF = "agent:off";

export function isWhatsappAgentAllowedPhone(phone: string) {
  if (WHATSAPP_AGENT_ALLOWLIST.length === 0) return true;
  const normalized = normalizeArPhone(phone);
  if (!normalized) return false;
  return WHATSAPP_AGENT_ALLOWLIST.some((raw) => normalizeArPhone(raw) === normalized);
}

export async function isWhatsappAgentEnabled() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("whatsapp_conversations")
      .select("last_event")
      .eq("phone", SETTINGS_PHONE)
      .maybeSingle();
    if (error || !data) return true;
    return data.last_event !== OFF;
  } catch {
    return true;
  }
}

export async function setWhatsappAgentEnabled(enabled: boolean) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("whatsapp_conversations").upsert(
    {
      phone: SETTINGS_PHONE,
      quote_state: emptyQuoteState(),
      history: [],
      pending_poll: null,
      last_message_id: null,
      last_event: enabled ? ON : OFF,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone" }
  );
  if (error) throw new Error(error.message);
}

export async function whatsappAgentGate(phone: string) {
  const enabled = await isWhatsappAgentEnabled();
  if (!enabled) return { ok: false as const, reason: "agent_disabled" as const };
  if (!isWhatsappAgentAllowedPhone(phone)) {
    return { ok: false as const, reason: "not_allowlisted" as const };
  }
  return { ok: true as const };
}
