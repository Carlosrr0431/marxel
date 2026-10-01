"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  cancelSeguimiento,
  completeSeguimiento,
  createSeguimiento,
  deleteGoogleCalendarEvent,
  saveCalendarNotify,
  snoozeSeguimiento,
  updateGoogleCalendarEvent,
  updateSeguimiento,
} from "@/lib/crm/actions";
import type { CalendarNotify } from "@/lib/crm/calendar-notify";
import {
  PRIORIDADES,
  SEGUIMIENTO_TIPOS,
  type Prioridad,
  type SeguimientoEstado,
  type SeguimientoTipo,
} from "@/lib/crm/types";

const TIPO_STYLE: Record<SeguimientoTipo, { label: string; chip: string; bar: string }> = {
  whatsapp: { label: "WhatsApp", chip: "bg-emerald-100 text-emerald-700", bar: "#059669" },
  llamada: { label: "Llamada", chip: "bg-sky-100 text-sky-700", bar: "#0284c7" },
  email: { label: "Email", chip: "bg-indigo-100 text-indigo-700", bar: "#4f46e5" },
  reunion: { label: "Reunión", chip: "bg-violet-100 text-violet-700", bar: "#7c3aed" },
  documentacion: { label: "Documentación", chip: "bg-amber-100 text-amber-700", bar: "#d97706" },
  cotizacion: { label: "Cotización", chip: "bg-teal-100 text-teal-700", bar: "#0f766e" },
  otro: { label: "Seguimiento", chip: "bg-slate-100 text-slate-600", bar: "#64748b" },
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  tipo: SeguimientoTipo;
  estado: SeguimientoEstado;
  person: string;
  phone: string | null;
  descripcion: string | null;
  prioridad: Prioridad;
  href: string;
  leadId: string | null;
  afiliadoId: string | null;
  source?: "crm" | "google";
};

export type CalendarPerson = {
  id: string;
  kind: "lead" | "afiliado";
  nombre: string;
  celular: string;
};

type Filter = "" | "hecho" | "pendiente" | "vencido";

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

const NOTIFY_OPTIONS = [
  { value: 0, label: "Sin aviso" },
  { value: 10, label: "10 minutos antes" },
  { value: 30, label: "30 minutos antes" },
  { value: 60, label: "1 hora antes" },
  { value: 1440, label: "1 día antes" },
];

const timeLabel = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
const dayName = new Intl.DateTimeFormat("es-AR", { weekday: "long" });
const rangeLabel = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });
const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });

export function CrmCalendar({
  events,
  people,
  googleEmail,
  googleStatus,
  notify,
}: {
  events: CalendarEvent[];
  people: CalendarPerson[];
  googleEmail: string | null;
  googleStatus?: string;
  notify: CalendarNotify;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [anchor, setAnchor] = useState(() => new Date());
  const [filter, setFilter] = useState<Filter>("");
  const [sheet, setSheet] = useState<{ mode: "create"; at: string } | { mode: "edit"; id: string } | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [error, setError] = useState("");

  const today = new Date();
  const weekStart = startOfWeek(anchor);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const locked = !googleEmail;
  const selected = sheet?.mode === "edit" ? events.find((event) => event.id === sheet.id) || null : null;

  const visible = useMemo(() => {
    const now = Date.now();
    return events.filter((event) => {
      if (filter === "hecho") return event.estado === "hecho";
      if (filter === "pendiente") return event.estado === "pendiente" && event.source !== "google";
      if (filter === "vencido") return event.estado === "pendiente" && new Date(event.start).getTime() < now && event.source !== "google";
      return true;
    });
  }, [events, filter]);

  const weekEnd = addDays(weekStart, 7);
  const weekVisible = visible.filter((event) => {
    const start = new Date(event.start).getTime();
    return start >= weekStart.getTime() && start < weekEnd.getTime();
  });
  const todayCount = weekVisible.filter((event) => sameDay(new Date(event.start), today)).length;
  const overdueCount = events.filter(
    (event) => event.estado === "pendiente" && event.source !== "google" && new Date(event.start).getTime() < Date.now(),
  ).length;

  function openCreate(date: Date) {
    setError("");
    setNotifyOpen(false);
    setSheet({ mode: "create", at: toLocalInput(date) });
  }

  function run(task: () => Promise<void>) {
    start(async () => {
      setError("");
      try {
        await task();
        setSheet(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-white/80 bg-white shadow-[0_20px_50px_rgba(26,16,56,0.08)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-line/70 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)] px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-1">
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-navy hover:bg-mist" onClick={() => setAnchor(addDays(weekStart, -7))} aria-label="Semana anterior">
            ‹
          </button>
          <div className="min-w-[132px] px-1 text-center">
            <h3 className="font-display text-[15px] font-semibold capitalize leading-tight text-navy">{monthLabel.format(weekStart)}</h3>
            <p className="text-[10px] leading-tight text-muted">
              {rangeLabel.format(weekStart)} – {rangeLabel.format(addDays(weekStart, 6))}
            </p>
          </div>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-navy hover:bg-mist" onClick={() => setAnchor(addDays(weekStart, 7))} aria-label="Semana siguiente">
            ›
          </button>
          <button
            type="button"
            onClick={() => setAnchor(new Date())}
            className={`ml-1 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
              sameDay(weekStart, startOfWeek(today)) ? "bg-aqua text-navy" : "bg-navy text-white"
            }`}
          >
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-0.5 overflow-x-auto rounded-full bg-mist/80 p-0.5">
          {(
            [
              { key: "", label: "Todas" },
              { key: "hecho", label: "Realizadas" },
              { key: "pendiente", label: "Pendientes" },
              { key: "vencido", label: "Vencidas" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                filter === item.key
                  ? item.key === "hecho"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : item.key === "vencido"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-navy text-white shadow-sm"
                  : "text-muted hover:text-navy"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <Stat label="Semana" value={weekVisible.length} tone="blue" />
          <Stat label="Hoy" value={todayCount} tone="green" />
          <Stat label="Vencidos" value={overdueCount} tone="red" />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {googleEmail ? (
            <a href="/api/crm/google/disconnect" className="hidden max-w-[11rem] truncate rounded-full bg-mist px-2.5 py-1 text-[10px] font-semibold text-teal hover:underline lg:inline" title={`Salir de ${googleEmail}`}>
              {googleEmail}
            </a>
          ) : null}
          <button type="button" disabled={locked} onClick={() => openCreate(new Date())} className="rounded-full bg-navy px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(53,40,114,0.22)] hover:bg-navy-deep disabled:opacity-50">
            + Seguimiento
          </button>
          <button type="button" disabled={locked} onClick={() => { setSheet(null); setNotifyOpen(true); }} className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-navy hover:bg-mist disabled:opacity-50">
            Avisos
          </button>
          <button type="button" onClick={() => router.refresh()} className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted hover:bg-mist hover:text-navy" title="Actualizar" aria-label="Actualizar">
            ↻
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div className={`flex h-full overflow-x-auto ${locked ? "pointer-events-none select-none blur-[1.5px]" : ""}`}>
          {weekDays.map((day) => {
            const items = visible
              .filter((event) => sameDay(new Date(event.start), day))
              .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
            const isToday = sameDay(day, today);
            const isPast = day < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isSunday = day.getDay() === 0;
            return (
              <section
                key={day.toISOString()}
                className={`flex min-w-[168px] flex-1 flex-col border-r border-line/60 last:border-r-0 ${isToday ? "bg-[linear-gradient(180deg,rgba(58,180,217,0.14)_0%,rgba(255,255,255,0.4)_28%)]" : "bg-white"}`}
              >
                <div className={`border-b ${isToday ? "border-sky/30 bg-white/50" : "border-line/60 bg-[#f8fafc]"}`}>
                  <div className="flex flex-col items-center gap-1 py-2">
                    <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${isSunday ? "text-rose-400" : isToday ? "text-teal" : isPast ? "text-muted/60" : "text-muted"}`}>
                      {dayName.format(day)}
                    </span>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-semibold ${isToday ? "bg-navy text-white shadow-[0_8px_18px_rgba(53,40,114,0.28)]" : isSunday ? "text-rose-500" : isPast ? "text-muted/50" : "text-navy"}`}>
                      {day.getDate()}
                    </div>
                    <div className="flex h-5 items-center gap-1.5">
                      {isToday ? <span className="rounded-full bg-teal px-2 py-0.5 text-[9px] font-bold leading-none text-white">HOY</span> : null}
                      {items.length > 0 ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${isToday ? "bg-white text-navy" : "bg-mist text-muted"}`}>
                          {items.length}
                        </span>
                      ) : !isToday ? (
                        <span className="text-[10px] text-muted/40">libre</span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      const at = new Date(day);
                      at.setHours(9, 0, 0, 0);
                      openCreate(at);
                    }}
                    className={`flex w-full items-center justify-center border-t py-1.5 text-[10px] font-semibold ${isToday ? "border-sky/30 text-teal hover:bg-white" : "border-line/70 text-muted hover:bg-white hover:text-navy"}`}
                  >
                    + Agregar
                  </button>
                </div>
                <div className="flex-1 space-y-2.5 overflow-y-auto p-2.5">
                  {items.length === 0 ? (
                    <p className="py-10 text-center text-[11px] text-muted/50">Sin seguimientos</p>
                  ) : (
                    items.map((event) => {
                      const done = event.estado === "hecho";
                      const overdue = !done && event.source !== "google" && new Date(event.start).getTime() < Date.now();
                      const style = event.source === "google"
                        ? { label: "Google", chip: "bg-blue-100 text-blue-700", bar: "#2563eb" }
                        : TIPO_STYLE[event.tipo];
                      return (
                        <article
                          key={event.id}
                          className={`overflow-hidden rounded-xl border border-line/70 shadow-[0_6px_16px_rgba(26,16,56,0.05)] ${done ? "bg-cloud/80 opacity-70" : "bg-white"}`}
                          style={{ borderLeftWidth: 3, borderLeftColor: done ? "#dddce6" : overdue ? "#e11d48" : style.bar }}
                        >
                          <button type="button" className="w-full px-3 py-2.5 text-left" onClick={() => { setError(""); setSheet({ mode: "edit", id: event.id }); }}>
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <span className={`text-sm font-semibold tabular-nums ${done ? "text-muted" : overdue ? "text-rose-600" : "text-navy"}`}>
                                {timeLabel.format(new Date(event.start))}
                              </span>
                              {overdue ? <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[8px] font-bold text-rose-600">VENCIDA</span> : null}
                            </div>
                            <p className={`line-clamp-2 text-[13px] font-semibold leading-snug ${done ? "text-muted line-through" : "text-navy"}`}>
                              {event.title}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-muted">{event.person}</p>
                            <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${style.chip}`}>{style.label}</span>
                          </button>
                          <div className="px-3 pb-2.5">
                            {done ? (
                              <p className="rounded-full bg-emerald-50 py-1 text-center text-[10px] font-semibold text-emerald-700">Realizada</p>
                            ) : event.source === "google" ? null : (
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => run(() => completeSeguimiento(event.id))}
                                className={`w-full rounded-full py-1.5 text-[11px] font-semibold ${overdue ? "bg-rose-50 text-rose-700 hover:bg-rose-100" : "bg-mist text-navy hover:bg-aqua"}`}
                              >
                                Completar
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {locked ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#1a1038]/25 p-6 backdrop-blur-[3px]">
            <div className="w-full max-w-sm overflow-hidden rounded-[1.6rem] border border-white/70 bg-white text-center shadow-[0_30px_80px_rgba(26,16,56,0.22)]">
              <div className="bg-[linear-gradient(135deg,#352872_0%,#3ab4d9_160%)] px-6 py-5 text-white">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Agenda</p>
                <h2 className="mt-1 font-display text-2xl font-semibold">Google Calendar</h2>
              </div>
              <div className="space-y-4 px-6 py-5">
                <p className="text-sm leading-relaxed text-muted">Entrá con Gmail para ver y editar los seguimientos desde acá.</p>
                {googleStatus === "denegado" ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">No se aceptó el permiso de Google Calendar.</p> : null}
                {googleStatus === "config" || googleStatus === "error" || googleStatus === "estado" ? (
                  <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">No se pudo conectar con Google. Intentá de nuevo.</p>
                ) : null}
                <a href="/api/crm/google/start" className="inline-flex rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(53,40,114,0.28)] hover:bg-navy-deep">
                  Entrar con Gmail
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {notifyOpen && !locked ? (
        <ModalFrame title="Avisos" kicker="Notificaciones" onClose={() => setNotifyOpen(false)}>
          <NotifyForm
            notify={notify}
            pending={pending}
            onSave={(formData) => {
              start(async () => {
                await saveCalendarNotify(formData);
                setNotifyOpen(false);
                router.refresh();
              });
            }}
          />
        </ModalFrame>
      ) : null}

      {sheet && !locked ? (
        <EventModal
          key={sheet.mode === "edit" ? sheet.id : sheet.at}
          mode={sheet.mode}
          at={sheet.mode === "create" ? sheet.at : toLocalInput(new Date(selected?.start || Date.now()))}
          event={selected}
          people={people}
          pending={pending}
          error={error}
          onClose={() => setSheet(null)}
          onCreate={(formData) => run(() => createSeguimiento(formData))}
          onUpdate={(formData) => run(() => updateSeguimiento(formData))}
          onUpdateGoogle={(formData) => run(() => updateGoogleCalendarEvent(formData))}
          onDone={(id) => run(() => completeSeguimiento(id))}
          onSnooze={(id) => run(() => snoozeSeguimiento(id, 24))}
          onDelete={(id) => run(() => cancelSeguimiento(id))}
          onDeleteGoogle={(id) => run(() => deleteGoogleCalendarEvent(id))}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "blue" | "green" | "red" }) {
  const toneClass = tone === "green" ? "bg-emerald-50 text-emerald-800" : tone === "red" ? "bg-rose-50 text-rose-800" : "bg-aqua text-navy";
  const labelClass = tone === "green" ? "text-emerald-600" : tone === "red" ? "text-rose-500" : "text-teal";
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${toneClass}`}>
      <span className={`text-[10px] font-semibold ${labelClass}`}>{label}</span>
      <span className="text-xs font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function ModalFrame({
  title,
  kicker,
  onClose,
  children,
}: {
  title: string;
  kicker: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1a1038]/45 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[1.6rem] border border-white/70 bg-white shadow-[0_30px_80px_rgba(26,16,56,0.28)]"
        onClick={(click) => click.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 bg-[linear-gradient(135deg,#352872_0%,#2a4f8f_55%,#3ab4d9_160%)] px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">{kicker}</p>
            <h2 className="font-display text-xl font-semibold">{title}</h2>
          </div>
          <button type="button" aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg leading-none text-white hover:bg-white/25" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NotifyForm({
  notify,
  pending,
  onSave,
}: {
  notify: CalendarNotify;
  pending: boolean;
  onSave: (formData: FormData) => void;
}) {
  const [minutes, setMinutes] = useState(notify.googleMinutes);
  return (
    <form className="flex flex-col gap-4 overflow-y-auto px-5 py-4" action={onSave}>
      <input type="hidden" name="google_minutes" value={minutes} />
      <p className="text-sm leading-relaxed text-muted">Google avisa en el calendario y por mail. El WhatsApp llega al crear el seguimiento.</p>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Aviso de Google</p>
        <div className="flex flex-wrap gap-2">
          {NOTIFY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMinutes(option.value as CalendarNotify["googleMinutes"])}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${minutes === option.value ? "bg-navy text-white shadow-sm" : "bg-mist text-navy hover:bg-aqua"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-[#f7f8fc] px-3 py-3">
        <span>
          <span className="block text-sm font-semibold text-navy">WhatsApp</span>
          <span className="block text-xs text-muted">Avisarme al crear el seguimiento</span>
        </span>
        <input type="checkbox" name="whatsapp" value="1" defaultChecked={notify.whatsapp} className="h-4 w-4 accent-[#352872]" />
      </label>
      <button type="submit" disabled={pending} className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(53,40,114,0.22)] disabled:opacity-60">
        {pending ? "Guardando…" : "Guardar avisos"}
      </button>
    </form>
  );
}

function EventModal({
  mode,
  at,
  event,
  people,
  pending,
  error,
  onClose,
  onCreate,
  onUpdate,
  onUpdateGoogle,
  onDone,
  onSnooze,
  onDelete,
  onDeleteGoogle,
}: {
  mode: "create" | "edit";
  at: string;
  event: CalendarEvent | null;
  people: CalendarPerson[];
  pending: boolean;
  error: string;
  onClose: () => void;
  onCreate: (formData: FormData) => void;
  onUpdate: (formData: FormData) => void;
  onUpdateGoogle: (formData: FormData) => void;
  onDone: (id: string) => void;
  onSnooze: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteGoogle: (id: string) => void;
}) {
  const initialPerson = event?.leadId ? `lead:${event.leadId}` : event?.afiliadoId ? `afiliado:${event.afiliadoId}` : "";
  const [personId, setPersonId] = useState(initialPerson);
  const [query, setQuery] = useState("");
  const [openList, setOpenList] = useState(false);
  const [tipo, setTipo] = useState<SeguimientoTipo>(event?.tipo || "whatsapp");
  const [prioridad, setPrioridad] = useState<Prioridad>(event?.prioridad || "media");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [when, setWhen] = useState(at);
  const [date, time] = when.split("T");
  const text = query.trim().toLowerCase();
  const matches = text.length < 2
    ? []
    : people
        .filter((person) => person.nombre.toLowerCase().includes(text) || person.celular.includes(text))
        .slice(0, 8);
  const chosen = people.find((person) => `${person.kind}:${person.id}` === personId) || null;
  const googleOnly = event?.source === "google";

  const title = googleOnly || mode === "edit" ? "Editar evento" : "Nuevo seguimiento";

  return (
    <ModalFrame title={title} kicker={googleOnly ? "Google Calendar" : "Agenda"} onClose={onClose}>
      <form
        className="flex min-h-0 flex-1 flex-col"
        action={(formData) => {
          if (googleOnly) onUpdateGoogle(formData);
          else if (mode === "edit") onUpdate(formData);
          else onCreate(formData);
        }}
      >
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          {googleOnly && event ? <input type="hidden" name="google_event_id" value={event.id.replace(/^google:/, "")} /> : null}
          {event && !googleOnly ? <input type="hidden" name="id" value={event.id} /> : null}
          <input type="hidden" name="tipo" value={tipo} />
          <input type="hidden" name="prioridad" value={prioridad} />
          <input type="hidden" name="programado_para" value={when} />
          <input type="hidden" name="lead_id" value={personId.startsWith("lead:") ? personId.slice(5) : ""} />
          <input type="hidden" name="afiliado_id" value={personId.startsWith("afiliado:") ? personId.slice(9) : ""} />
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Título</span>
            <input name="titulo" required defaultValue={event?.title || ""} className="crm-input" placeholder="Llamar, cotizar, pedir docs…" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Día</span>
              <input type="date" required value={date || ""} onChange={(input) => setWhen(`${input.target.value}T${time || "09:00"}`)} className="crm-input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Hora</span>
              <input type="time" required value={(time || "09:00").slice(0, 5)} onChange={(input) => setWhen(`${date}T${input.target.value}`)} className="crm-input" />
            </label>
          </div>
          {googleOnly ? null : (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Tipo</p>
              <div className="flex flex-wrap gap-2">
                {SEGUIMIENTO_TIPOS.map((item) => (
                  <button key={item.value} type="button" onClick={() => setTipo(item.value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tipo === item.value ? "bg-navy text-white shadow-sm" : "bg-mist text-navy hover:bg-aqua"}`}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {googleOnly ? null : (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Prioridad</p>
              <div className="flex flex-wrap gap-2">
                {PRIORIDADES.map((item) => (
                  <button key={item.value} type="button" onClick={() => setPrioridad(item.value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${prioridad === item.value ? "bg-navy text-white shadow-sm" : "bg-mist text-navy hover:bg-aqua"}`}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {googleOnly ? null : (
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Contacto (opcional)</span>
                <input
                  value={query}
                  onChange={(input) => {
                    setQuery(input.target.value);
                    setOpenList(true);
                  }}
                  onFocus={() => setOpenList(true)}
                  placeholder="Buscar por nombre o celular"
                  className="crm-input"
                  autoComplete="off"
                />
              </label>
              {chosen ? (
                <div className="flex items-center justify-between gap-2 rounded-2xl bg-aqua px-3 py-2 text-sm text-navy">
                  <span>
                    {chosen.nombre} · {chosen.kind === "lead" ? "lead" : "afiliado"}
                    {chosen.celular ? ` · ${chosen.celular}` : ""}
                  </span>
                  <button type="button" className="text-xs font-semibold text-muted" onClick={() => setPersonId("")}>
                    Quitar
                  </button>
                </div>
              ) : null}
              {openList && text.length >= 2 ? (
                <div className="max-h-44 overflow-y-auto rounded-2xl border border-line bg-white shadow-sm">
                  {matches.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted">Ningún contacto con ese dato.</p>
                  ) : (
                    matches.map((person) => (
                      <button
                        key={`${person.kind}:${person.id}`}
                        type="button"
                        onClick={() => {
                          setPersonId(`${person.kind}:${person.id}`);
                          setQuery("");
                          setOpenList(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-navy hover:bg-mist"
                      >
                        <span className="font-semibold">{person.nombre}</span>
                        <span className="text-muted"> · {person.kind === "lead" ? "lead" : "afiliado"} · {person.celular}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          )}
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Nota</span>
            <textarea name="descripcion" rows={3} defaultValue={event?.descripcion || ""} className="crm-input" placeholder="Qué hay que hacer" />
          </label>
          {error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line/80 bg-[#f7f8fc] px-5 py-3">
          <button type="submit" disabled={pending} className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(53,40,114,0.22)] disabled:opacity-60">
            {pending ? "Guardando…" : mode === "edit" || googleOnly ? "Guardar" : "Agendar"}
          </button>
          {event && !googleOnly && event.estado === "pendiente" ? (
            <>
              <button type="button" disabled={pending} className="rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold text-navy" onClick={() => onDone(event.id)}>Hecho</button>
              <button type="button" disabled={pending} className="rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold text-navy" onClick={() => onSnooze(event.id)}>+24 h</button>
            </>
          ) : null}
          {event?.leadId || event?.afiliadoId ? <Link href={event.href} className="rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold text-navy">Ficha</Link> : null}
          {event ? (
            <button type="button" disabled={pending} className="ml-auto rounded-full border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700" onClick={() => setConfirmDelete(true)}>
              Eliminar
            </button>
          ) : null}
        </div>
      </form>
      {confirmDelete && event ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1a1038]/40 p-5 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-[1.4rem] bg-white p-5 shadow-[0_24px_60px_rgba(26,16,56,0.28)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-500">Confirmar</p>
            <h3 className="mt-1 font-display text-lg font-semibold text-navy">Eliminar este evento</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {googleOnly ? "Se borra de Google Calendar." : "Se cancela el seguimiento y también el evento de Google, si existe."}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-navy" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => (googleOnly ? onDeleteGoogle(event.id.replace(/^google:/, "")) : onDelete(event.id))}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ModalFrame>
  );
}
