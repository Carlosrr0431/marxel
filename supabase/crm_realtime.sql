-- Tiempo real del CRM: leads, seguimientos, actividades y afiliados.
-- Ejecutar en Supabase → SQL Editor. Idempotente.

alter table if exists public.leads replica identity full;
alter table if exists public.seguimientos replica identity full;
alter table if exists public.actividades replica identity full;
alter table if exists public.afiliados replica identity full;

do $$
declare
  t text;
begin
  foreach t in array array['leads', 'seguimientos', 'actividades', 'afiliados']
  loop
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
