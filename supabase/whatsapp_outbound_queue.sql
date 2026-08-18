-- Cola global de salida WhatsApp (1 mensaje cada 15s en toda la línea MARXEN).
-- Evita bloqueos por spam. Ejecutar en el SQL Editor de Supabase
-- (proyecto vlezzeipzgyvehqndphs), después de whatsapp_conversations.sql.

create extension if not exists pgcrypto;

create table if not exists public.whatsapp_send_throttle (
  id smallint primary key default 1 check (id = 1),
  last_sent_at timestamptz,
  interval_ms integer not null default 15000 check (interval_ms >= 1000),
  updated_at timestamptz not null default now()
);

insert into public.whatsapp_send_throttle (id, last_sent_at, interval_ms)
values (1, null, 15000)
on conflict (id) do nothing;

create table if not exists public.whatsapp_outbound_queue (
  id uuid primary key default gen_random_uuid(),
  agent_code text not null,
  dest text not null,
  kind text not null check (kind in ('text', 'poll')),
  payload jsonb not null default '{}'::jsonb,
  priority integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts >= 1),
  available_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by text,
  sent_at timestamptz,
  message_id text,
  last_error text,
  meta jsonb not null default '{}'::jsonb,
  dedup_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_outbound_queue_ready
  on public.whatsapp_outbound_queue (status, available_at, priority desc, created_at asc);

create unique index if not exists idx_whatsapp_outbound_pending_dedup
  on public.whatsapp_outbound_queue (agent_code, dedup_key)
  where status in ('pending', 'sending') and dedup_key is not null;

create or replace function public.set_whatsapp_outbound_queue_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_whatsapp_outbound_queue_updated_at on public.whatsapp_outbound_queue;
create trigger trg_whatsapp_outbound_queue_updated_at
before update on public.whatsapp_outbound_queue
for each row
execute function public.set_whatsapp_outbound_queue_updated_at();

create or replace function public.release_stale_whatsapp_outbound(p_stale_after_seconds integer default 120)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.whatsapp_outbound_queue
  set
    status = 'pending',
    claimed_at = null,
    claimed_by = null,
    last_error = coalesce(last_error, 'stale_sending_released'),
    available_at = now()
  where status = 'sending'
    and claimed_at is not null
    and claimed_at < now() - make_interval(secs => greatest(30, p_stale_after_seconds));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Claim atómico: un solo mensaje global si pasaron interval_ms desde el último envío.
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
begin
  insert into public.whatsapp_send_throttle (id, last_sent_at, interval_ms)
  values (1, null, 15000)
  on conflict (id) do nothing;

  select interval_ms, last_sent_at
  into v_interval_ms, v_last
  from public.whatsapp_send_throttle
  where id = 1
  for update;

  if v_last is not null
     and (extract(epoch from (v_now - v_last)) * 1000) < coalesce(v_interval_ms, 15000) then
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

alter table public.whatsapp_outbound_queue enable row level security;
alter table public.whatsapp_send_throttle enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'whatsapp_outbound_queue'
      and policyname = 'whatsapp_outbound_queue_anon_all'
  ) then
    create policy "whatsapp_outbound_queue_anon_all"
      on public.whatsapp_outbound_queue
      for all
      to anon, authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'whatsapp_send_throttle'
      and policyname = 'whatsapp_send_throttle_anon_all'
  ) then
    create policy "whatsapp_send_throttle_anon_all"
      on public.whatsapp_send_throttle
      for all
      to anon, authenticated
      using (true)
      with check (true);
  end if;
end $$;

grant execute on function public.claim_whatsapp_outbound_message(text) to anon, authenticated, service_role;
grant execute on function public.release_stale_whatsapp_outbound(integer) to anon, authenticated, service_role;
