-- =============================================================================
-- MARXEL CRM — Campañas de mailing + tracking Brevo
-- Ejecutar en: SQL Editor → New query → Run
-- Idempotente.
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

alter table public.mailing_campaigns add column if not exists tag text;
alter table public.mailing_campaigns add column if not exists preheader text;
alter table public.mailing_campaigns add column if not exists title text;
alter table public.mailing_campaigns add column if not exists body text;
alter table public.mailing_campaigns add column if not exists cta_label text;
alter table public.mailing_campaigns add column if not exists cta_url text;

create unique index if not exists mailing_campaigns_tag_uidx
  on public.mailing_campaigns (tag)
  where tag is not null;

create index if not exists mailing_campaigns_created_at_idx
  on public.mailing_campaigns (created_at desc);

create table if not exists public.mailing_recipients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  campaign_id uuid not null references public.mailing_campaigns (id) on delete cascade,
  email text not null,
  name text not null default '',
  message_id text,
  last_event text not null default 'queued',
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  bounce_type text,
  unsubscribed_at timestamptz,
  complained_at timestamptz,
  proxy_opened_at timestamptz,
  open_count integer not null default 0,
  click_count integer not null default 0,
  last_link text,
  unique (campaign_id, email)
);

create index if not exists mailing_recipients_campaign_idx
  on public.mailing_recipients (campaign_id);
create index if not exists mailing_recipients_email_idx
  on public.mailing_recipients (email);
create index if not exists mailing_recipients_message_id_idx
  on public.mailing_recipients (message_id)
  where message_id is not null;

create table if not exists public.mailing_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  campaign_id uuid references public.mailing_campaigns (id) on delete cascade,
  recipient_id uuid references public.mailing_recipients (id) on delete set null,
  email text not null,
  event text not null,
  message_id text,
  link text,
  reason text,
  user_agent text,
  device text,
  occurred_at timestamptz not null default now(),
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  unique (dedupe_key)
);

create index if not exists mailing_events_campaign_idx
  on public.mailing_events (campaign_id, occurred_at desc);
create index if not exists mailing_events_email_idx
  on public.mailing_events (email, occurred_at desc);

alter table public.mailing_campaigns enable row level security;
alter table public.mailing_recipients enable row level security;
alter table public.mailing_events enable row level security;

drop policy if exists "mailing_campaigns_anon_all" on public.mailing_campaigns;
create policy "mailing_campaigns_anon_all" on public.mailing_campaigns
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "mailing_recipients_anon_all" on public.mailing_recipients;
create policy "mailing_recipients_anon_all" on public.mailing_recipients
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "mailing_events_anon_all" on public.mailing_events;
create policy "mailing_events_anon_all" on public.mailing_events
  for all to anon, authenticated using (true) with check (true);

do $$
begin
  begin
    alter publication supabase_realtime add table public.mailing_recipients;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.mailing_events;
  exception when duplicate_object then null;
  end;
end $$;
