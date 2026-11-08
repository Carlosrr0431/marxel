-- Visitas que confirmaron el aviso del sitio.
-- Guardamos la visita y, si dejan nombre o WhatsApp, el contacto para escribirles.
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.

create table if not exists public.cookie_visitas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  visitor_id text not null unique,
  consentimiento text not null default 'aceptado' check (consentimiento in ('aceptado', 'rechazado')),
  consented_at timestamptz,
  nombre text,
  celular text,
  email text,
  edad int check (edad is null or (edad >= 0 and edad <= 120)),
  patente text,
  interes text,
  page_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  user_agent text,
  lead_id uuid references public.leads (id) on delete set null
);

create index if not exists cookie_visitas_created_idx on public.cookie_visitas (created_at desc);
create index if not exists cookie_visitas_celular_idx on public.cookie_visitas (celular);
create index if not exists cookie_visitas_lead_idx on public.cookie_visitas (lead_id);

drop trigger if exists cookie_visitas_set_updated_at on public.cookie_visitas;
create trigger cookie_visitas_set_updated_at
  before update on public.cookie_visitas
  for each row execute function public.set_updated_at();

alter table public.cookie_visitas enable row level security;

drop policy if exists "cookie_visitas_anon_all" on public.cookie_visitas;
create policy "cookie_visitas_anon_all" on public.cookie_visitas
  for all to anon, authenticated
  using (true) with check (true);

grant select, insert, update, delete on table public.cookie_visitas
  to anon, authenticated, service_role;

alter table public.cookie_visitas add column if not exists landing_path text;
alter table public.cookie_visitas add column if not exists pages text;
alter table public.cookie_visitas add column if not exists last_seen_at timestamptz;
alter table public.cookie_visitas add column if not exists visitas_count int not null default 1;
alter table public.cookie_visitas add column if not exists recorrido text;
