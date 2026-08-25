-- =============================================================================
-- MARXEL WhatsApp — cola CRM + 1 mensaje cada 15s (anti-bloqueo Meta)
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- Proyecto: https://vlezzeipzgyvehqndphs.supabase.co
-- Idempotente. Correr DESPUÉS de:
--   whatsapp_outbound_queue.sql
--   whatsapp_outbound_queue_v2_spacing.sql
--   whatsapp_outbound_queue_v3_grants.sql
--   whatsapp_crm_chat.sql
-- =============================================================================

-- 15s en toda la línea. No pisa una pausa anti-ban (> 60s).
insert into public.whatsapp_send_throttle (id, last_sent_at, interval_ms)
values (1, null, 15000)
on conflict (id) do nothing;

update public.whatsapp_send_throttle
set interval_ms = 15000, updated_at = now()
where id = 1
  and interval_ms <= 30000;

alter table public.whatsapp_outbound_queue
  drop constraint if exists whatsapp_outbound_queue_kind_check;

alter table public.whatsapp_outbound_queue
  add constraint whatsapp_outbound_queue_kind_check
  check (kind in ('text', 'poll', 'media'));

alter table public.whatsapp_chat_messages
  add column if not exists delivery_status text not null default 'sent';

alter table public.whatsapp_chat_messages
  add column if not exists queue_id uuid;

alter table public.whatsapp_chat_messages
  drop constraint if exists whatsapp_chat_messages_delivery_status_check;

alter table public.whatsapp_chat_messages
  add constraint whatsapp_chat_messages_delivery_status_check
  check (delivery_status in ('pending', 'sending', 'sent', 'failed'));

create index if not exists whatsapp_chat_messages_queue_id_idx
  on public.whatsapp_chat_messages (queue_id)
  where queue_id is not null;

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

grant select, insert, update, delete on table public.whatsapp_outbound_queue to anon, authenticated, service_role;
grant select, insert, update, delete on table public.whatsapp_send_throttle to anon, authenticated, service_role;
grant execute on function public.claim_whatsapp_outbound_message(text) to anon, authenticated, service_role;
grant execute on function public.release_stale_whatsapp_outbound(integer) to anon, authenticated, service_role;
