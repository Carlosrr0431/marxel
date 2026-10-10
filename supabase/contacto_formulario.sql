-- Consultas del formulario "Dejanos tu teléfono".
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.

create index if not exists leads_origen_detalle_idx
  on public.leads (origen_detalle);

create index if not exists leads_celular_idx
  on public.leads (celular);

grant select, insert, update, delete on table public.leads
  to anon, authenticated, service_role;

grant select, insert, update, delete on table public.actividades
  to anon, authenticated, service_role;

alter table public.leads enable row level security;
alter table public.actividades enable row level security;

drop policy if exists "leads_anon_all" on public.leads;
create policy "leads_anon_all" on public.leads
  for all to anon, authenticated
  using (true) with check (true);

drop policy if exists "actividades_anon_all" on public.actividades;
create policy "actividades_anon_all" on public.actividades
  for all to anon, authenticated
  using (true) with check (true);
