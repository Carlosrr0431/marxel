-- =============================================================================
-- MARXEL CRM — v7: fix nombre "Yo" en chats
-- Problema: los mensajes salientes (from_me=true) traen push_name="Yo"
--           y ese valor se guardaba como nombre del chat, impidiendo
--           que el nombre real del contacto aparezca.
-- Solución: solo usar p_push_name como nombre cuando el mensaje es
--           ENTRANTE (from_me = false).
-- Además limpia registros existentes con nombre "Yo".
--
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- Idempotente: se puede correr más de una vez.
-- =============================================================================

-- 1. Limpiar chats que quedaron con nombre "Yo" por el bug anterior
update public.whatsapp_chats
set name = null
where trim(lower(name)) in ('yo', 'me', 'mí');

-- 2. Recrear la función con el fix
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
  v_phone     text;
  v_chat_id   uuid;
  v_msg_id    uuid;
  v_preview   text;
  v_status    text;
  v_is_inbound boolean;
  -- nombre a usar: SOLO si el mensaje es del contacto (no nuestro)
  v_contact_name text;
begin
  v_phone := regexp_replace(btrim(coalesce(p_phone, '')), '[^0-9]', '', 'g');
  if length(v_phone) < 7 then return null; end if;

  v_status := case
    when p_delivery_status in ('pending','sent','delivered','read','failed')
      then p_delivery_status
    else 'sent'
  end;

  v_preview := case p_message_type
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

  -- FIX v7: el nombre del contacto sólo viene de mensajes ENTRANTES
  --         (cuando el contacto nos escribe). Mensajes salientes (from_me=true)
  --         tienen push_name = nuestro propio nombre de cuenta ("Yo"), nunca
  --         deben sobreescribir ni inicializar el nombre del chat.
  v_contact_name := case
    when not coalesce(p_from_me, false)
      then nullif(btrim(coalesce(p_push_name, '')), '')
    else null
  end;

  insert into public.whatsapp_chats (phone, name, last_message, last_message_at, unread_count, updated_at)
  values (
    v_phone,
    v_contact_name,          -- null para mensajes salientes
    v_preview,
    now(),
    case when v_is_inbound then 1 else 0 end,
    now()
  )
  on conflict (phone) do update set
    -- El nombre solo se actualiza si el chat aún no tiene nombre
    -- y el nuevo valor viene de un mensaje entrante del contacto
    name = coalesce(
      public.whatsapp_chats.name,
      v_contact_name
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
  exception when others then
    null;
  end;

  return v_msg_id;
end;
$$;

-- Permisos
grant execute on function public.save_whatsapp_crm_message(
  text, text, text, text, text, text, text, text,
  boolean, text, text, text, uuid, text[]
) to anon, authenticated, service_role;
