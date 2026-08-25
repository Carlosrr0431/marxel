-- =============================================================================
-- MARXEL CRM — Historial de chats WhatsApp (inbox en tiempo real)
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- Proyecto: https://vlezzeipzgyvehqndphs.supabase.co
-- Idempotente: se puede correr más de una vez.
--
-- NO toca whatsapp_conversations ni la cola del chatbot.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------
create table if not exists public.whatsapp_chats (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text,
  last_message text,
  last_message_at timestamptz,
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.whatsapp_chats(id) on delete cascade,
  phone text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text not null default '',
  message_type text not null default 'text',
  media_url text,
  media_mime text,
  file_name text,
  wa_message_id text,
  from_me boolean not null default false,
  source text not null default 'webhook',
  delivery_status text not null default 'sent'
    check (delivery_status in ('pending', 'sending', 'sent', 'failed')),
  queue_id uuid,
  created_at timestamptz not null default now()
);

alter table public.whatsapp_chat_messages
  add column if not exists delivery_status text not null default 'sent';

alter table public.whatsapp_chat_messages
  add column if not exists queue_id uuid;

alter table public.whatsapp_chat_messages
  drop constraint if exists whatsapp_chat_messages_delivery_status_check;

alter table public.whatsapp_chat_messages
  add constraint whatsapp_chat_messages_delivery_status_check
  check (delivery_status in ('pending', 'sending', 'sent', 'failed'));

create index if not exists whatsapp_chats_last_message_at_idx
  on public.whatsapp_chats (last_message_at desc nulls last);

create index if not exists whatsapp_chat_messages_chat_id_created_idx
  on public.whatsapp_chat_messages (chat_id, created_at);

create index if not exists whatsapp_chat_messages_phone_created_idx
  on public.whatsapp_chat_messages (phone, created_at);

create unique index if not exists whatsapp_chat_messages_wa_id_uidx
  on public.whatsapp_chat_messages (wa_message_id)
  where wa_message_id is not null;

create index if not exists whatsapp_chat_messages_queue_id_idx
  on public.whatsapp_chat_messages (queue_id)
  where queue_id is not null;

alter table public.whatsapp_chats replica identity full;
alter table public.whatsapp_chat_messages replica identity full;

-- -----------------------------------------------------------------------------
-- RLS (mismo patrón permisivo del resto del CRM Marxel)
-- -----------------------------------------------------------------------------
alter table public.whatsapp_chats enable row level security;
alter table public.whatsapp_chat_messages enable row level security;

drop policy if exists "whatsapp_chats_anon_all" on public.whatsapp_chats;
create policy "whatsapp_chats_anon_all"
  on public.whatsapp_chats
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "whatsapp_chat_messages_anon_all" on public.whatsapp_chat_messages;
create policy "whatsapp_chat_messages_anon_all"
  on public.whatsapp_chat_messages
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on table public.whatsapp_chats to anon, authenticated, service_role;
grant select, insert, update, delete on table public.whatsapp_chat_messages to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'whatsapp_chats'
  ) then
    execute 'alter publication supabase_realtime add table public.whatsapp_chats';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'whatsapp_chat_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.whatsapp_chat_messages';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- RPC: upsert chat + insert mensaje (idempotente por wa_message_id / queue_id)
-- -----------------------------------------------------------------------------
drop function if exists public.save_whatsapp_crm_message(text, text, text, text, text, text, text, text, boolean, text, text);
drop function if exists public.save_whatsapp_crm_message(text, text, text, text, text, text, text, text, boolean, text, text, text, uuid);

create or replace function public.save_whatsapp_crm_message(
  p_phone text,
  p_direction text,
  p_body text default '',
  p_message_type text default 'text',
  p_media_url text default null,
  p_media_mime text default null,
  p_file_name text default null,
  p_wa_message_id text default null,
  p_from_me boolean default false,
  p_push_name text default null,
  p_source text default 'webhook',
  p_delivery_status text default 'sent',
  p_queue_id uuid default null
)
returns uuid
language plpgsql
as $$
declare
  v_chat_id uuid;
  v_msg_id uuid;
  v_preview text;
  v_phone text;
  v_is_inbound boolean;
  v_status text;
begin
  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if v_phone = '' then
    raise exception 'phone required';
  end if;

  if p_direction not in ('inbound', 'outbound') then
    raise exception 'direction inválida';
  end if;

  v_status := coalesce(nullif(btrim(p_delivery_status), ''), 'sent');
  if v_status not in ('pending', 'sending', 'sent', 'failed') then
    v_status := 'sent';
  end if;

  if p_wa_message_id is not null and btrim(p_wa_message_id) <> '' then
    select id into v_msg_id
    from public.whatsapp_chat_messages
    where wa_message_id = p_wa_message_id
    limit 1;
    if v_msg_id is not null then
      return v_msg_id;
    end if;
  end if;

  if p_queue_id is not null then
    select id into v_msg_id
    from public.whatsapp_chat_messages
    where queue_id = p_queue_id
    limit 1;
    if v_msg_id is not null then
      return v_msg_id;
    end if;
  end if;

  v_preview := left(nullif(btrim(coalesce(p_body, '')), ''), 180);
  if v_preview is null then
    v_preview := case coalesce(p_message_type, 'text')
      when 'image' then 'Imagen'
      when 'video' then 'Video'
      when 'audio' then 'Audio'
      when 'ptt' then 'Audio'
      when 'document' then coalesce(nullif(p_file_name, ''), 'Archivo')
      when 'sticker' then 'Sticker'
      else 'Mensaje'
    end;
  end if;

  v_is_inbound := p_direction = 'inbound' and not coalesce(p_from_me, false);

  insert into public.whatsapp_chats (phone, name, last_message, last_message_at, unread_count, updated_at)
  values (
    v_phone,
    nullif(btrim(coalesce(p_push_name, '')), ''),
    v_preview,
    now(),
    case when v_is_inbound then 1 else 0 end,
    now()
  )
  on conflict (phone) do update set
    name = coalesce(
      nullif(btrim(coalesce(excluded.name, '')), ''),
      public.whatsapp_chats.name
    ),
    last_message = excluded.last_message,
    last_message_at = excluded.last_message_at,
    unread_count = public.whatsapp_chats.unread_count + case when v_is_inbound then 1 else 0 end,
    updated_at = now()
  returning id into v_chat_id;

  begin
    insert into public.whatsapp_chat_messages (
      chat_id, phone, direction, body, message_type, media_url, media_mime,
      file_name, wa_message_id, from_me, source, delivery_status, queue_id
    ) values (
      v_chat_id,
      v_phone,
      p_direction,
      coalesce(p_body, ''),
      coalesce(nullif(p_message_type, ''), 'text'),
      p_media_url,
      p_media_mime,
      p_file_name,
      nullif(btrim(coalesce(p_wa_message_id, '')), ''),
      coalesce(p_from_me, false),
      coalesce(nullif(p_source, ''), 'webhook'),
      v_status,
      p_queue_id
    )
    returning id into v_msg_id;
  exception
    when unique_violation then
      select id into v_msg_id
      from public.whatsapp_chat_messages
      where wa_message_id = p_wa_message_id
         or (p_queue_id is not null and queue_id = p_queue_id)
      limit 1;
  end;

  return v_msg_id;
end;
$$;

grant execute on function public.save_whatsapp_crm_message(
  text, text, text, text, text, text, text, text, boolean, text, text, text, uuid
) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Storage: archivos de WhatsApp
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('whatsapp-media', 'whatsapp-media', true)
on conflict (id) do update set public = true;

drop policy if exists "whatsapp_media_public_read" on storage.objects;
create policy "whatsapp_media_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'whatsapp-media');

drop policy if exists "whatsapp_media_anon_insert" on storage.objects;
create policy "whatsapp_media_anon_insert"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'whatsapp-media');

drop policy if exists "whatsapp_media_anon_update" on storage.objects;
create policy "whatsapp_media_anon_update"
  on storage.objects
  for update
  to anon, authenticated
  using (bucket_id = 'whatsapp-media')
  with check (bucket_id = 'whatsapp-media');
