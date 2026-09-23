"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  cancelSeguimiento,
  completeSeguimiento,
  createSeguimiento,
  rescheduleSeguimiento,
  snoozeSeguimiento,
} from "@/lib/crm/actions";
import { SEGUIMIENTO_TIPOS, type SeguimientoEstado, type SeguimientoTipo } from "@/lib/crm/types";

const START_HOUR = 8;
const END_HOUR = 21;
const HOUR_PX = 52;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index);
const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

const TIPO_CLASS: Record<SeguimientoTipo, string> = {
  whatsapp: "border-emerald-300 bg-emerald-100 text-emerald-950",
  llamada: "border-sky-300 bg-sky-100 text-sky-950",
  email: "border-indigo-300 bg-indigo-100 text-indigo-950",
  reunion: "border-violet-300 bg-violet-100 text-violet-950",
  documentacion: "border-amber-300 bg-amber-100 text-amber-950",
  cotizacion: "border-teal-300 bg-teal-100 text-teal-950",
  otro: "border-slate-300 bg-slate-100 text-slate-800",
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  tipo: SeguimientoTipo;
  estado: SeguimientoEstado;
  person: string;
  phone: string | null;
  href: string;
  leadId: string | null;
  afiliadoId: string | null;
};

export type CalendarPerson = {
  id: string;
  kind: "lead" | "afiliado";
  nombre: string;
  celular: string;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const offset = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - offset);
  next.setHours(0, 0, 0, 0);
  return next;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toLocalInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function monthCells(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

const dayLabel = new Intl.DateTimeFormat("es-AR", { day: "numeric" });
const monthTitle = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
const weekTitle = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });
const timeLabel = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });

export function CrmCalendar({
  events,
  people,
  feedUrl,
}: {
  events: CalendarEvent[];
  people: CalendarPerson[];
  feedUrl: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [view, setView] = useState<"semana" | "mes">("semana");
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftAt, setDraftAt] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [personId, setPersonId] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);

  const selected = events.find((event) => event.id === selectedId) || null;
  const weekStart = startOfWeek(anchor);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const cells = monthCells(anchor);
  const today = new Date();

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const date = new Date(event.start);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const list = map.get(key) || [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  function dayEvents(date: Date) {
    return byDay.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`) || [];
  }

  function shift(direction: number) {
    const next = new Date(anchor);
    if (view === "mes") next.setMonth(next.getMonth() + direction);
    else next.setDate(next.getDate() + direction * 7);
    setAnchor(next);
  }

  function openCreate(date: Date) {
    setSelectedId(null);
    setError("");
    setQuery("");
    setPersonId("");
    setDraftAt(toLocalInput(date));
  }

  function onWeekClick(day: Date, event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-event]")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const minutesFromStart = ((event.clientY - rect.top) / HOUR_PX) * 60;
    const snapped = Math.round(minutesFromStart / 30) * 30;
    const total = START_HOUR * 60 + Math.max(0, Math.min(snapped, (END_HOUR - START_HOUR) * 60 - 30));
    const at = new Date(day);
    at.setHours(Math.floor(total / 60), total % 60, 0, 0);
    openCreate(at);
  }

  const matches = people
    .filter((person) => {
      const text = query.trim().toLowerCase();
      if (!text) return true;
      return person.nombre.toLowerCase().includes(text) || person.celular.includes(text);
    })
    .slice(0, 8);

  const googleHref = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(feedUrl)}`;
  const heading = view === "mes" ? monthTitle.format(anchor) : `${weekTitle.format(weekStart)} – ${weekTitle.format(addDays(weekStart, 6))}`;

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-teal">Agenda</p>
          <h1 className="font-display text-[1.65rem] font-semibold capitalize tracking-tight text-navy sm:text-[2rem]">
            {heading}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">
            Seguimientos del CRM. Conectalo a Google Calendar para verlos en el celular.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="crm-btn crm-btn-ghost" onClick={() => setAnchor(new Date())}>
            Hoy
          </button>
          <button type="button" className="crm-btn crm-btn-ghost" onClick={() => shift(-1)} aria-label="Anterior">
            ←
          </button>
          <button type="button" className="crm-btn crm-btn-ghost" onClick={() => shift(1)} aria-label="Siguiente">
            →
          </button>
          <div className="flex rounded-xl border border-line bg-white p-1">
            {(["semana", "mes"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize ${
                  view === item ? "bg-navy text-white" : "text-navy"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <button type="button" className="crm-btn crm-btn-primary" onClick={() => setGoogleOpen((open) => !open)}>
            Google Calendar
          </button>
          <button
            type="button"
            className="crm-btn crm-btn-primary"
            onClick={() => openCreate(new Date())}
          >
            + Turno
          </button>
        </div>
      </header>

      {googleOpen ? (
        <section className="crm-card space-y-3 p-4">
          <p className="text-sm text-navy">
            En Google Calendar: <strong>Otros calendarios → + → Desde URL</strong> y pegá este enlace.
            Google lo actualiza solo; puede tardar unas horas.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input readOnly value={feedUrl} className="crm-input min-w-0 flex-1 font-mono text-xs" />
            <button
              type="button"
              className="crm-btn crm-btn-ghost shrink-0"
              onClick={() => {
                void navigator.clipboard.writeText(feedUrl).then(() => setCopied(true));
              }}
            >
              {copied ? "Copiado" : "Copiar enlace"}
            </button>
            <a href={googleHref} target="_blank" rel="noopener noreferrer" className="crm-btn crm-btn-primary shrink-0">
              Abrir Google Calendar
            </a>
          </div>
        </section>
      ) : null}

      {view === "semana" ? (
        <div className="crm-card overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-line">
              <div />
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="border-l border-line px-2 py-2 text-center">
                  <p className="text-[11px] uppercase text-muted">{WEEKDAYS[(day.getDay() + 6) % 7]}</p>
                  <p
                    className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      sameDay(day, today) ? "bg-navy text-white" : "text-navy"
                    }`}
                  >
                    {dayLabel.format(day)}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
              <div className="relative" style={{ height: HOURS.length * HOUR_PX }}>
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute right-2 -translate-y-2 text-[11px] text-muted"
                    style={{ top: (hour - START_HOUR) * HOUR_PX }}
                  >
                    {String(hour).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className="relative border-l border-line"
                  style={{ height: HOURS.length * HOUR_PX }}
                  onClick={(event) => onWeekClick(day, event)}
                >
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0 border-t border-line/70"
                      style={{ top: (hour - START_HOUR) * HOUR_PX }}
                    />
                  ))}
                  {sameDay(day, today) && today.getHours() >= START_HOUR && today.getHours() < END_HOUR ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-rose-500"
                      style={{
                        top:
                          ((today.getHours() * 60 + today.getMinutes() - START_HOUR * 60) / 60) * HOUR_PX,
                      }}
                    />
                  ) : null}
                  {dayEvents(day).map((event) => {
                    const date = new Date(event.start);
                    const minutes = date.getHours() * 60 + date.getMinutes();
                    const clamped = Math.min(Math.max(minutes, START_HOUR * 60), END_HOUR * 60 - 28);
                    return (
                      <button
                        key={event.id}
                        type="button"
                        data-event
                        onClick={() => {
                          setDraftAt(null);
                          setSelectedId(event.id);
                          setError("");
                        }}
                        className={`absolute inset-x-1 z-20 overflow-hidden rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight ${TIPO_CLASS[event.tipo]} ${
                          event.estado === "hecho" ? "opacity-55" : ""
                        }`}
                        style={{ top: ((clamped - START_HOUR * 60) / 60) * HOUR_PX, height: 36 }}
                      >
                        <span className="block truncate font-semibold">
                          {timeLabel.format(date)} {event.person}
                        </span>
                        <span className="block truncate">{event.title}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="crm-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line text-center text-[11px] uppercase text-muted">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-2 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day) => {
              const items = dayEvents(day);
              const inMonth = day.getMonth() === anchor.getMonth();
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-24 border-b border-r border-line p-1.5 text-left align-top ${
                    inMonth ? "bg-white" : "bg-mist/40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const at = new Date(day);
                      at.setHours(10, 0, 0, 0);
                      openCreate(at);
                    }}
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      sameDay(day, today) ? "bg-navy text-white" : "text-navy"
                    }`}
                  >
                    {dayLabel.format(day)}
                  </button>
                  <div className="mt-1 space-y-1">
                    {items.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => {
                          setDraftAt(null);
                          setSelectedId(event.id);
                        }}
                        className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium ${TIPO_CLASS[event.tipo]}`}
                      >
                        {timeLabel.format(new Date(event.start))} {event.person}
                      </button>
                    ))}
                    {items.length > 3 ? (
                      <span className="block text-[10px] text-muted">+{items.length - 3}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {draftAt ? (
        <form
          className="crm-card space-y-3 p-4"
          action={(formData) => {
            start(async () => {
              setError("");
              try {
                await createSeguimiento(formData);
                setDraftAt(null);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "No se pudo agendar");
              }
            });
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-navy">Nuevo turno</h2>
            <button type="button" className="text-sm text-muted" onClick={() => setDraftAt(null)}>
              Cerrar
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Título</span>
              <input name="titulo" required className="crm-input" placeholder="Recontacto, cotización…" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Cuándo</span>
              <input
                name="programado_para"
                type="datetime-local"
                required
                value={draftAt}
                onChange={(event) => setDraftAt(event.target.value)}
                className="crm-input"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Tipo</span>
              <select name="tipo" className="crm-input" defaultValue="whatsapp">
                {SEGUIMIENTO_TIPOS.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Lead o afiliado</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar nombre o celular"
                className="crm-input"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {matches.map((person) => {
              const active = personId === `${person.kind}:${person.id}`;
              return (
                <button
                  key={`${person.kind}:${person.id}`}
                  type="button"
                  onClick={() => setPersonId(`${person.kind}:${person.id}`)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    active ? "border-navy bg-navy text-white" : "border-line bg-white text-navy"
                  }`}
                >
                  {person.nombre} · {person.kind === "lead" ? "lead" : "afiliado"}
                </button>
              );
            })}
          </div>
          <input type="hidden" name="lead_id" value={personId.startsWith("lead:") ? personId.slice(5) : ""} />
          <input
            type="hidden"
            name="afiliado_id"
            value={personId.startsWith("afiliado:") ? personId.slice(9) : ""}
          />
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          <button type="submit" disabled={pending || !personId} className="crm-btn crm-btn-primary disabled:opacity-60">
            {pending ? "Guardando…" : "Agendar"}
          </button>
        </form>
      ) : null}

      {selected ? (
        <section className="crm-card space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{selected.tipo}</p>
              <h2 className="font-display text-lg font-semibold text-navy">{selected.title}</h2>
              <p className="text-sm text-muted">
                {selected.person}
                {selected.phone ? ` · ${selected.phone}` : ""} · {selected.estado}
              </p>
            </div>
            <button type="button" className="text-sm text-muted" onClick={() => setSelectedId(null)}>
              Cerrar
            </button>
          </div>
          <form
            className="flex flex-wrap items-end gap-2"
            action={(formData) => {
              start(async () => {
                setError("");
                try {
                  await rescheduleSeguimiento(selected.id, String(formData.get("programado_para") || ""));
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "No se pudo mover");
                }
              });
            }}
          >
            <label className="text-sm">
              <span className="mb-1 block font-medium">Mover</span>
              <input
                name="programado_para"
                type="datetime-local"
                required
                defaultValue={toLocalInput(new Date(selected.start))}
                className="crm-input"
              />
            </label>
            <button type="submit" disabled={pending} className="crm-btn crm-btn-ghost">
              Guardar horario
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            <Link href={selected.href} className="crm-btn crm-btn-ghost">
              Abrir ficha
            </Link>
            {selected.estado === "pendiente" ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  className="crm-btn crm-btn-primary"
                  onClick={() => start(async () => completeSeguimiento(selected.id).then(() => router.refresh()))}
                >
                  Hecho
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="crm-btn crm-btn-ghost"
                  onClick={() => start(async () => snoozeSeguimiento(selected.id, 24).then(() => router.refresh()))}
                >
                  +24h
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="crm-btn crm-btn-ghost"
                  onClick={() => start(async () => cancelSeguimiento(selected.id).then(() => router.refresh()))}
                >
                  Cancelar
                </button>
              </>
            ) : null}
          </div>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
