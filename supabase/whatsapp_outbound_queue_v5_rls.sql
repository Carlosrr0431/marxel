-- =============================================================================
-- MARXEL WhatsApp — RLS de la cola (el CRM inserta con la clave anon)
-- Error típico: new row violates row-level security policy for table
--   "whatsapp_outbound_queue"
-- Idempotente. Correr en Supabase → SQL Editor → Run
-- =============================================================================

alter table public.whatsapp_outbound_queue enable row level security;
alter table public.whatsapp_send_throttle enable row level security;

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'whatsapp_outbound_queue'
  loop
    execute format('drop policy if exists %I on public.whatsapp_outbound_queue', r.policyname);
  end loop;

  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'whatsapp_send_throttle'
  loop
    execute format('drop policy if exists %I on public.whatsapp_send_throttle', r.policyname);
  end loop;
end $$;

create policy "whatsapp_outbound_queue_anon_all"
  on public.whatsapp_outbound_queue
  for all
  using (true)
  with check (true);

create policy "whatsapp_send_throttle_anon_all"
  on public.whatsapp_send_throttle
  for all
  using (true)
  with check (true);

grant select, insert, update, delete on table public.whatsapp_outbound_queue to anon, authenticated, service_role;
grant select, insert, update, delete on table public.whatsapp_send_throttle to anon, authenticated, service_role;
grant execute on function public.claim_whatsapp_outbound_message(text) to anon, authenticated, service_role;
grant execute on function public.release_stale_whatsapp_outbound(integer) to anon, authenticated, service_role;
