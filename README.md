# MARXEN

Sitio web + CRM de **MARXEN**: seguros, prepagas (Prevención Salud) y asistencia al viajero.

## Desarrollo

```bash
cd marxel
cp .env.example .env.local   # completar variables
npm install
npm run dev
```

- Sitio: [http://localhost:3000](http://localhost:3000)
- CRM: [http://localhost:3000/crm](http://localhost:3000/crm)

## Supabase

1. Abrí el SQL Editor del proyecto.
2. Ejecutá el archivo [`supabase/crm_schema.sql`](supabase/crm_schema.sql).
3. Variables en `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
CRM_PASSWORD=tu-clave
```

## CRM

| Ruta | Función |
|------|---------|
| `/crm` | Dashboard (KPIs, agenda, últimos leads) |
| `/crm/pipeline` | Kanban de estados |
| `/crm/leads` | Listado + filtros |
| `/crm/leads/[id]` | Ficha, timeline, seguimientos, conversión |
| `/crm/afiliados` | Clientes convertidos |
| `/crm/seguimientos` | Agenda de follow-ups |

Las cotizaciones de la web se guardan como leads y disparan seguimientos automáticos (WhatsApp ~5 min + recontacto al día siguiente).

## Stack

Next.js 16 · TypeScript · Tailwind 4 · Supabase · Syne + Manrope
