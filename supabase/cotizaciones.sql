-- Cotizaciones de auto hechas en el CRM.
-- Se guarda el pedido y el resultado para abrirlas después sin cotizar de nuevo.
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.

create table if not exists public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  estado text not null default 'guardada' check (estado in ('guardada', 'enviada', 'elegida', 'emitida')),
  nombre text not null,
  celular text,
  dni text,
  email text,
  edad int check (edad is null or (edad >= 0 and edad <= 120)),
  patente text,
  anio int,
  cero_km boolean not null default false,
  marca text,
  modelo text,
  version text,
  localidad text,
  codigo_postal text,
  gnc boolean not null default false,
  vehiculo text,
  resumen text,
  premio_api int,
  premio_sitio int,
  premio_smg int,
  pedido jsonb not null default '{}'::jsonb,
  resultado jsonb not null default '{}'::jsonb
);

create index if not exists cotizaciones_created_idx on public.cotizaciones (created_at desc);
create index if not exists cotizaciones_estado_idx on public.cotizaciones (estado, created_at desc);
create index if not exists cotizaciones_patente_idx on public.cotizaciones (patente);
create index if not exists cotizaciones_dni_idx on public.cotizaciones (dni);
create index if not exists cotizaciones_celular_idx on public.cotizaciones (celular);

drop trigger if exists cotizaciones_set_updated_at on public.cotizaciones;
create trigger cotizaciones_set_updated_at
  before update on public.cotizaciones
  for each row execute function public.set_updated_at();

alter table public.cotizaciones enable row level security;

drop policy if exists "cotizaciones_anon_all" on public.cotizaciones;
create policy "cotizaciones_anon_all" on public.cotizaciones
  for all to anon, authenticated
  using (true) with check (true);

grant select, insert, update, delete on table public.cotizaciones
  to anon, authenticated, service_role;
