-- Permisos de la cola de salida. Sin esto Vercel cae a envío directo y dispara 3 mensajes.
-- Idempotente.

grant select, insert, update, delete on table public.whatsapp_outbound_queue to anon, authenticated, service_role;
grant select, insert, update, delete on table public.whatsapp_send_throttle to anon, authenticated, service_role;
grant execute on function public.claim_whatsapp_outbound_message(text) to anon, authenticated, service_role;
grant execute on function public.release_stale_whatsapp_outbound(integer) to anon, authenticated, service_role;
