-- Permite guardar entregado y leído en los mensajes del chat.
-- Idempotente. Correr en Supabase → SQL Editor → Run.

alter table public.whatsapp_chat_messages
  drop constraint if exists whatsapp_chat_messages_delivery_status_check;

alter table public.whatsapp_chat_messages
  add constraint whatsapp_chat_messages_delivery_status_check
  check (delivery_status in ('pending', 'sending', 'sent', 'delivered', 'read', 'failed'));
