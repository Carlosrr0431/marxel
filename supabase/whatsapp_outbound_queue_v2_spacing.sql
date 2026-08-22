-- Espaciado anti-bloqueo WhatsApp (Meta).
-- Idempotente. Ejecutar en el SQL Editor de Supabase después de whatsapp_outbound_queue.sql.
-- 1 mensaje cada 30s en toda la línea, y no dos al mismo destino más rápido que eso.

update public.whatsapp_send_throttle
set interval_ms = 30000, updated_at = now()
where id = 1
  and interval_ms < 30000;

alter table public.whatsapp_send_throttle
  drop constraint if exists whatsapp_send_throttle_interval_ms_check;

alter table public.whatsapp_send_throttle
  add constraint whatsapp_send_throttle_interval_ms_check
  check (interval_ms >= 1000);

create or replace function public.claim_whatsapp_outbound_message(p_claimer text default 'worker')
returns setof public.whatsapp_outbound_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_interval_ms integer;
  v_last timestamptz;
  v_row public.whatsapp_outbound_queue%rowtype;
  v_dest_digits text;
begin
  insert into public.whatsapp_send_throttle (id, last_sent_at, interval_ms)
  values (1, null, 30000)
  on conflict (id) do nothing;

  select interval_ms, last_sent_at
  into v_interval_ms, v_last
  from public.whatsapp_send_throttle
  where id = 1
  for update;

  v_interval_ms := greatest(coalesce(v_interval_ms, 30000), 1000);

  if v_last is not null
     and (extract(epoch from (v_now - v_last)) * 1000) < v_interval_ms then
    return;
  end if;

  for v_row in
    select q.*
    from public.whatsapp_outbound_queue q
    where q.status = 'pending'
      and q.available_at <= v_now
      and q.attempts < q.max_attempts
    order by q.priority desc, q.created_at asc
    for update skip locked
  loop
    v_dest_digits := regexp_replace(coalesce(v_row.dest, ''), '\D', '', 'g');

    if v_dest_digits <> '' and exists (
      select 1
      from public.whatsapp_outbound_queue recent
      where recent.id <> v_row.id
        and recent.status in ('sending', 'sent')
        and regexp_replace(coalesce(recent.dest, ''), '\D', '', 'g') = v_dest_digits
        and coalesce(recent.sent_at, recent.claimed_at) is not null
        and (extract(epoch from (v_now - coalesce(recent.sent_at, recent.claimed_at))) * 1000) < v_interval_ms
    ) then
      continue;
    end if;

    update public.whatsapp_outbound_queue
    set
      status = 'sending',
      claimed_at = v_now,
      claimed_by = nullif(trim(p_claimer), ''),
      attempts = attempts + 1
    where id = v_row.id
    returning * into v_row;

    update public.whatsapp_send_throttle
    set last_sent_at = v_now, updated_at = v_now
    where id = 1;

    return next v_row;
    return;
  end loop;
end;
$$;
