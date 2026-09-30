-- Opcional: guarda el id del evento de Google para poder moverlo después.
alter table public.seguimientos
  add column if not exists google_event_id text;

alter table public.seguimientos
  drop constraint if exists seguimientos_tiene_destino;
