-- =============================================================================
-- MARXEL CRM — Vaciar datos operativos (NO borra schema ni login)
-- Proyecto: https://vlezzeipzgyvehqndphs.supabase.co
-- Ejecutar en: SQL Editor → New query → Run
--
-- Borra: leads, afiliados, seguimientos, actividades, chats WhatsApp,
--        cola de salida y estado del chatbot por teléfono.
-- Conserva: tablas, RLS, enums, vista crm_stats, fila __agent__ (on/off del bot),
--           fila de throttle (solo resetea last_sent_at).
-- =============================================================================

truncate table
  public.actividades,
  public.seguimientos,
  public.whatsapp_chat_messages,
  public.whatsapp_chats,
  public.whatsapp_outbound_queue,
  public.afiliados,
  public.leads
restart identity cascade;

delete from public.whatsapp_conversations
where phone is distinct from '__agent__';

update public.whatsapp_send_throttle
set last_sent_at = null, updated_at = now()
where id = 1;

-- Media de WhatsApp en Storage (si el bucket existe)
delete from storage.objects
where bucket_id = 'whatsapp-media';
