-- =============================================================================
-- MARXEL CRM — Historial de campañas de mailing (Brevo)
-- Ejecutar en: SQL Editor → New query → Run
-- =============================================================================

create table if not exists public.mailing_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  subject text not null,
  template_id text,
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  status text not null default 'sent',
  error text,
  brevo_message_ids text[] not null default '{}',
  created_by text default 'crm'
);

create index if not exists mailing_campaigns_created_at_idx
  on public.mailing_campaigns (created_at desc);

alter table public.mailing_campaigns enable row level security;

drop policy if exists "mailing_campaigns_anon_all" on public.mailing_campaigns;
create policy "mailing_campaigns_anon_all" on public.mailing_campaigns
  for all to anon, authenticated using (true) with check (true);
