-- Conversaciones del chatbot WhatsApp (whatsmeow).
-- Ejecutar en SQL Editor de Supabase.

create table if not exists public.whatsapp_conversations (
  phone text primary key,
  quote_state jsonb not null default '{}'::jsonb,
  history jsonb not null default '[]'::jsonb,
  pending_poll jsonb,
  last_message_id text,
  last_event text,
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_conversations enable row level security;

drop policy if exists "whatsapp_conversations_anon_all" on public.whatsapp_conversations;
create policy "whatsapp_conversations_anon_all" on public.whatsapp_conversations
  for all to anon, authenticated using (true) with check (true);
