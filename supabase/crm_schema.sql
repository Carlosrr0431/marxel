-- =============================================================================
-- MARXEL CRM — Schema completo para Supabase
-- Ejecutar en: SQL Editor → New query → Run
-- Proyecto: https://vlezzeipzgyvehqndphs.supabase.co
-- =============================================================================

-- Extensiones
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type lead_estado as enum (
    'nuevo',
    'contactado',
    'interesado',
    'documentacion',
    'cotizado',
    'ganado',
    'perdido'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type lead_origen as enum (
    'web',
    'whatsapp',
    'referido',
    'llamada',
    'redes',
    'otro'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type producto_interes as enum (
    'seguros',
    'salud',
    'viajero',
    'general'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type modalidad_ingreso as enum (
    'monotributo',
    'relacion_dependencia',
    'particular',
    'no_aplica',
    'sin_definir'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type tipo_consulta as enum (
    'no_cliente',
    'ya_cliente'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type afiliado_estado as enum (
    'activo',
    'pendiente_alta',
    'en_tramite',
    'suspendido',
    'baja'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type seguimiento_tipo as enum (
    'whatsapp',
    'llamada',
    'email',
    'reunion',
    'documentacion',
    'cotizacion',
    'otro'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type seguimiento_estado as enum (
    'pendiente',
    'hecho',
    'cancelado',
    'vencido'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type actividad_tipo as enum (
    'nota',
    'cambio_estado',
    'seguimiento',
    'whatsapp',
    'llamada',
    'email',
    'conversion',
    'sistema'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type prioridad as enum (
    'baja',
    'media',
    'alta',
    'urgente'
  );
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- LEADS (prospectos — no son afiliados todavía)
-- -----------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Datos básicos (PDF + web)
  nombre text not null,
  dni text,
  celular text not null,
  email text,
  edad int check (edad is null or (edad >= 0 and edad <= 120)),
  localidad text,
  provincia text,

  -- Clasificación
  tipo_consulta tipo_consulta not null default 'no_cliente',
  producto producto_interes not null default 'general',
  plan_interes text,
  coberturas text,
  modalidad modalidad_ingreso not null default 'sin_definir',
  origen lead_origen not null default 'web',
  origen_detalle text,

  -- Pipeline CRM
  estado lead_estado not null default 'nuevo',
  prioridad prioridad not null default 'media',
  puntaje int not null default 0 check (puntaje >= 0 and puntaje <= 100),
  tags text[] not null default '{}',

  -- Seguimiento comercial
  proximo_contacto_at timestamptz,
  ultimo_contacto_at timestamptz,
  fecha_contacto date default current_date,
  motivo_perdida text,
  asignado_a text,

  -- Metadatos web
  utm_source text,
  utm_medium text,
  utm_campaign text,
  page_path text,
  user_agent text,
  notas_iniciales text
);

create index if not exists leads_estado_idx on public.leads (estado);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_proximo_contacto_idx on public.leads (proximo_contacto_at);
create index if not exists leads_celular_idx on public.leads (celular);
create index if not exists leads_producto_idx on public.leads (producto);

-- -----------------------------------------------------------------------------
-- AFILIADOS (clientes convertidos)
-- -----------------------------------------------------------------------------
create table if not exists public.afiliados (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lead_id uuid references public.leads (id) on delete set null,

  nombre text not null,
  dni text,
  celular text not null,
  email text,
  edad int,
  localidad text,
  provincia text,

  producto producto_interes not null default 'salud',
  plan text,
  modalidad modalidad_ingreso not null default 'sin_definir',
  estado afiliado_estado not null default 'pendiente_alta',

  -- Datos de cobertura
  fecha_vigencia date,
  fecha_alta date,
  numero_afiliado text,
  grupo_familiar int default 1,
  cuota_estimada numeric(12, 2),
  obra_social_convenio text,
  cartilla_notas text,

  -- Documentación
  docs_completos boolean not null default false,
  docs_pendientes text[] not null default '{}',

  prioridad prioridad not null default 'media',
  tags text[] not null default '{}',
  proximo_contacto_at timestamptz,
  ultimo_contacto_at timestamptz,
  asignado_a text,
  notas text
);

create index if not exists afiliados_estado_idx on public.afiliados (estado);
create index if not exists afiliados_created_at_idx on public.afiliados (created_at desc);
create index if not exists afiliados_celular_idx on public.afiliados (celular);

-- -----------------------------------------------------------------------------
-- SEGUIMIENTOS (tareas / follow-ups)
-- -----------------------------------------------------------------------------
create table if not exists public.seguimientos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  lead_id uuid references public.leads (id) on delete cascade,
  afiliado_id uuid references public.afiliados (id) on delete cascade,

  titulo text not null,
  descripcion text,
  tipo seguimiento_tipo not null default 'whatsapp',
  estado seguimiento_estado not null default 'pendiente',
  prioridad prioridad not null default 'media',

  programado_para timestamptz not null default now(),
  completado_at timestamptz,
  resultado text,
  creado_por text,

  constraint seguimientos_tiene_destino check (
    lead_id is not null or afiliado_id is not null
  )
);

create index if not exists seguimientos_estado_idx on public.seguimientos (estado);
create index if not exists seguimientos_programado_idx on public.seguimientos (programado_para);
create index if not exists seguimientos_lead_idx on public.seguimientos (lead_id);
create index if not exists seguimientos_afiliado_idx on public.seguimientos (afiliado_id);

-- -----------------------------------------------------------------------------
-- ACTIVIDADES (timeline / historial)
-- -----------------------------------------------------------------------------
create table if not exists public.actividades (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  lead_id uuid references public.leads (id) on delete cascade,
  afiliado_id uuid references public.afiliados (id) on delete cascade,

  tipo actividad_tipo not null default 'nota',
  titulo text not null,
  detalle text,
  meta jsonb not null default '{}'::jsonb,
  autor text default 'sistema',

  constraint actividades_tiene_destino check (
    lead_id is not null or afiliado_id is not null
  )
);

create index if not exists actividades_lead_idx on public.actividades (lead_id, created_at desc);
create index if not exists actividades_afiliado_idx on public.actividades (afiliado_id, created_at desc);

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

drop trigger if exists afiliados_set_updated_at on public.afiliados;
create trigger afiliados_set_updated_at
  before update on public.afiliados
  for each row execute function public.set_updated_at();

drop trigger if exists seguimientos_set_updated_at on public.seguimientos;
create trigger seguimientos_set_updated_at
  before update on public.seguimientos
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Auto-actividad al crear lead + seguimiento inicial (caso PDF: WA a los ~5 min)
-- -----------------------------------------------------------------------------
create or replace function public.on_lead_created()
returns trigger
language plpgsql
as $$
begin
  insert into public.actividades (lead_id, tipo, titulo, detalle, autor)
  values (
    new.id,
    'sistema',
    'Lead capturado',
    coalesce(new.notas_iniciales, 'Ingreso desde ' || new.origen::text),
    'sistema'
  );

  -- Seguimiento automático: WhatsApp de apertura (~5 minutos)
  insert into public.seguimientos (
    lead_id, titulo, descripcion, tipo, estado, prioridad, programado_para, creado_por
  ) values (
    new.id,
    'WhatsApp inicial de cotización',
    'Enviar información de planes consultados y abrir conversación personal.',
    'whatsapp',
    'pendiente',
    'alta',
    now() + interval '5 minutes',
    'sistema'
  );

  -- Segundo follow-up: si no responde, al día siguiente
  insert into public.seguimientos (
    lead_id, titulo, descripcion, tipo, estado, prioridad, programado_para, creado_por
  ) values (
    new.id,
    'Recontacto si no respondió',
    'Segundo mensaje de contacto inicial con info de planes y canales de contratación.',
    'whatsapp',
    'pendiente',
    'media',
    now() + interval '1 day',
    'sistema'
  );

  update public.leads
  set proximo_contacto_at = coalesce(proximo_contacto_at, now() + interval '5 minutes')
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists leads_on_created on public.leads;
create trigger leads_on_created
  after insert on public.leads
  for each row execute function public.on_lead_created();

-- -----------------------------------------------------------------------------
-- Convertir lead ganado → afiliado (helper SQL opcional vía RPC)
-- -----------------------------------------------------------------------------
create or replace function public.convertir_lead_a_afiliado(p_lead_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_lead public.leads%rowtype;
  v_afiliado_id uuid;
begin
  select * into v_lead from public.leads where id = p_lead_id;
  if not found then
    raise exception 'Lead no encontrado';
  end if;

  insert into public.afiliados (
    lead_id, nombre, dni, celular, email, edad, localidad, provincia,
    producto, plan, modalidad, estado, ultimo_contacto_at, asignado_a, notas
  ) values (
    v_lead.id, v_lead.nombre, v_lead.dni, v_lead.celular, v_lead.email, v_lead.edad,
    v_lead.localidad, v_lead.provincia, v_lead.producto, v_lead.plan_interes,
    v_lead.modalidad, 'pendiente_alta', now(), v_lead.asignado_a, v_lead.notas_iniciales
  )
  returning id into v_afiliado_id;

  update public.leads
  set estado = 'ganado', updated_at = now(), ultimo_contacto_at = now()
  where id = p_lead_id;

  insert into public.actividades (lead_id, afiliado_id, tipo, titulo, detalle, autor)
  values (
    p_lead_id, v_afiliado_id, 'conversion',
    'Lead convertido a afiliado',
    'Se creó el alta en CRM de afiliados.',
    'sistema'
  );

  insert into public.seguimientos (
    afiliado_id, titulo, descripcion, tipo, estado, prioridad, programado_para, creado_por
  ) values (
    v_afiliado_id,
    'Revisar documentación de alta',
    'Solicitar DNI, declaración jurada y comprobantes según modalidad.',
    'documentacion',
    'pendiente',
    'alta',
    now() + interval '2 hours',
    'sistema'
  );

  return v_afiliado_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Vista dashboard
-- -----------------------------------------------------------------------------
create or replace view public.crm_stats as
select
  (select count(*) from public.leads) as total_leads,
  (select count(*) from public.leads where estado = 'nuevo') as leads_nuevos,
  (select count(*) from public.leads where estado not in ('ganado', 'perdido')) as leads_abiertos,
  (select count(*) from public.leads where created_at >= date_trunc('week', now())) as leads_semana,
  (select count(*) from public.afiliados) as total_afiliados,
  (select count(*) from public.afiliados where estado = 'activo') as afiliados_activos,
  (select count(*) from public.seguimientos where estado = 'pendiente') as seguimientos_pendientes,
  (select count(*) from public.seguimientos
     where estado = 'pendiente' and programado_para <= now()) as seguimientos_vencidos,
  (select count(*) from public.leads
     where estado = 'ganado'
       and updated_at >= date_trunc('month', now())) as conversiones_mes;

-- -----------------------------------------------------------------------------
-- RLS
-- Nota: con publishable key (anon) habilitamos acceso para la app.
-- El panel /crm está protegido por contraseña de aplicación.
-- Cuando actives Auth de Supabase, restringí a authenticated.
-- -----------------------------------------------------------------------------
alter table public.leads enable row level security;
alter table public.afiliados enable row level security;
alter table public.seguimientos enable row level security;
alter table public.actividades enable row level security;

drop policy if exists "leads_anon_all" on public.leads;
create policy "leads_anon_all" on public.leads
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "afiliados_anon_all" on public.afiliados;
create policy "afiliados_anon_all" on public.afiliados
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "seguimientos_anon_all" on public.seguimientos;
create policy "seguimientos_anon_all" on public.seguimientos
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "actividades_anon_all" on public.actividades;
create policy "actividades_anon_all" on public.actividades
  for all to anon, authenticated using (true) with check (true);

-- Grant RPC
grant execute on function public.convertir_lead_a_afiliado(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Seed de ejemplo (opcional — comentar si no querés datos demo)
-- -----------------------------------------------------------------------------
insert into public.leads (
  nombre, celular, email, edad, provincia, localidad, producto, plan_interes,
  origen, estado, prioridad, modalidad, tipo_consulta, notas_iniciales
) values
(
  'María Gómez', '3875551001', 'maria.gomez@email.com', 32, 'Salta', 'Salta Capital',
  'salud', 'Plan A2', 'web', 'nuevo', 'alta', 'monotributo', 'no_cliente',
  'Consulta por prepaga desde la web'
),
(
  'Juan Pérez', '3875551002', 'juan.perez@email.com', 45, 'Salta', 'Cerrillos',
  'seguros', 'Autos', 'whatsapp', 'interesado', 'media', 'no_aplica', 'no_cliente',
  'Interesado en seguro de auto'
);
