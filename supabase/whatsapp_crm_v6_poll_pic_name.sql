-- =============================================================================
-- MARXEL CRM — v6: foto de perfil + name no sobrescrito por push_name
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- Idempotente: se puede correr más de una vez.
-- =============================================================================

-- 1. Columna profile_pic_url en whatsapp_chats
alter table public.whatsapp_chats
  add column if not exists profile_pic_url text;

-- 2. Columna poll_options para guardar opciones de encuestas enviadas
alter table public.whatsapp_chat_messages
  add column if not exists poll_options text[];

-- 3. Corregir la función save_whatsapp_crm_message:
--    el name solo se setea si aún no tiene nombre (push_name no sobreescribe
--    un nombre existente).
create or replace function public.save_whatsapp_crm_message(
  p_phone           text,
  p_direction       text,
  p_body            text       default '',
  p_message_type    text       default 'text',
  p_media_url       text       default null,
  p_media_mime      text       default null,
  p_file_name       text       default null,
  p_wa_message_id   text       default null,
  p_from_me         boolean    default false,
  p_push_name       text       default null,
  p_source          text       default 'webhook',
  p_delivery_status text       default 'sent',
  p_queue_id        uuid       default null,
  p_poll_options    text[]     default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_phone   text;
  v_chat_id uuid;
  v_msg_id  uuid;
  v_status  text;
  v_preview text;
  v_is_inbound boolean;
begin
  v_phone := btrim(coalesce(p_phone, ''));
  if v_phone = '' then
    return null;
  end if;

  -- Mapeo de delivery_status
  v_status := case
    when p_delivery_status in ('pending','sending','sent','failed') then p_delivery_status
    else 'sent'
  end;

  -- Preview del chat (último mensaje)
  v_preview := case coalesce(p_message_type, 'text')
    when 'image'    then '📷 Imagen'
    when 'video'    then '🎥 Video'
    when 'audio'    then '🎵 Audio'
    when 'ptt'      then '🎤 Audio'
    when 'sticker'  then '🎨 Sticker'
    when 'document' then coalesce(nullif(p_file_name, ''), 'Archivo')
    when 'poll'     then coalesce(nullif(p_body, ''), '📊 Encuesta')
    else coalesce(nullif(p_body, ''), '…')
  end;

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
    -- FIX: name solo se actualiza si todavía es null
    --      push_name NUNCA sobreescribe un nombre que ya existe
    name = coalesce(
      public.whatsapp_chats.name,
      nullif(btrim(coalesce(excluded.name, '')), '')
    ),
    last_message    = excluded.last_message,
    last_message_at = excluded.last_message_at,
    unread_count    = public.whatsapp_chats.unread_count + case when v_is_inbound then 1 else 0 end,
    updated_at      = now()
  returning id into v_chat_id;

  begin
    insert into public.whatsapp_chat_messages (
      chat_id, phone, direction, body, message_type, media_url, media_mime,
      file_name, wa_message_id, from_me, source, delivery_status, queue_id, poll_options
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
      p_queue_id,
      p_poll_options
    )
    returning id into v_msg_id;
  exception
    when unique_violation then
      select id into v_msg_id
      from public.whatsapp_chat_messages
      where wa_message_id = p_wa_message_id
        and phone = v_phone
      limit 1;
  end;

  return v_msg_id;
end;
$$;

-- 4. RLS: permitir anon/authenticated acceder a whatsapp_chats para leer profile_pic_url
--    (las políticas existentes ya cubren esto, no se necesita nada adicional)
