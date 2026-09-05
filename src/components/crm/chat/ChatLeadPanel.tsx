"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  addNota,
  cancelSeguimiento,
  completeSeguimiento,
  convertLeadQuiet,
  createSeguimiento,
  ensureLeadFromChat,
  snoozeSeguimiento,
  updateChatFicha,
  updateLead,
  updateLeadEstado,
} from "@/lib/crm/actions";
import {
  LEAD_ESTADOS,
  PRODUCTOS,
  formatDate,
  type Actividad,
  type Lead,
  type LeadEstado,
  type ProductoInteres,
  type Seguimiento,
} from "@/lib/crm/types";
import { fillTemplate, WA_TEMPLATES } from "@/lib/crm/templates";

type Payload = {
  lead: Lead | null;
  seguimientos: Seguimiento[];
  actividades: Actividad[];
};

const ESTADO_SHORT: Record<LeadEstado, string> = {
  nuevo: "Nuevo",
  contactado: "Contacto",
  interesado: "Interés",
  documentacion: "Docs",
  cotizado: "Cotizado",
  ganado: "Ganado",
  perdido: "Perdido",
};

function localDateTime(hoursAhead: number) {
  const d = new Date(Date.now() + hoursAhead * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function tomorrowTen() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`;
}

function FactInput({
  label,
  value,
  type = "text",
  placeholder,
  disabled,
  onCommit,
  onLive,
}: {
  label: string;
  value: string;
  type?: "text" | "email";
  placeholder?: string;
  disabled?: boolean;
  onCommit: (value: string) => void;
  onLive?: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <input
          className="crm-wa-lead__edit"
          type={type}
          value={draft}
          placeholder={placeholder || "—"}
          disabled={disabled}
          aria-label={label}
          onChange={(e) => {
            setDraft(e.target.value);
            onLive?.(e.target.value);
          }}
          onBlur={() => {
            if (draft.trim() !== value.trim()) onCommit(draft);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </dd>
    </div>
  );
}

export function ChatLeadPanel({
  phone,
  chatName,
  open,
  onClose,
  onUseMessage,
  onLeadChange,
  onChatNameChange,
}: {
  phone: string;
  chatName: string;
  open: boolean;
  onClose: () => void;
  onUseMessage: (text: string) => void;
  onLeadChange?: (lead: Lead | null) => void;
  onChatNameChange?: (name: string) => void;
}) {
  const [data, setData] = useState<Payload>({ lead: null, seguimientos: [], actividades: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nota, setNota] = useState("");
  const [titulo, setTitulo] = useState("Seguimiento WhatsApp");
  const [cuando, setCuando] = useState(localDateTime(2));
  const [pending, start] = useTransition();
  const lead = data.lead;
  const onLeadChangeRef = useRef(onLeadChange);
  onLeadChangeRef.current = onLeadChange;

  const load = useCallback(async () => {
    if (!phone) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/chat-lead?phone=${encodeURIComponent(phone)}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as Payload & { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) throw new Error(json.error || "No se pudo cargar");
      setData({
        lead: json.lead || null,
        seguimientos: json.seguimientos || [],
        actividades: json.actividades || [],
      });
      onLeadChangeRef.current?.(json.lead || null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!phone) return;
    const supabase = createClient();
    const refresh = () => {
      if (open) void load();
    };
    const channel = supabase
      .channel(`crm-chat-lead-${phone}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "seguimientos" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "actividades" }, refresh)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [phone, open, load]);

  function run(task: () => Promise<void>) {
    start(async () => {
      try {
        await task();
        await load();
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  function saveFicha(patch: {
    nombre?: string;
    email?: string;
    localidad?: string;
    producto?: ProductoInteres;
    plan_interes?: string;
  }) {
    if (patch.nombre !== undefined) {
      const nextName = patch.nombre.trim();
      if (nextName) onChatNameChange?.(nextName);
      if (lead) {
        setData((prev) =>
          prev.lead ? { ...prev, lead: { ...prev.lead, nombre: nextName || prev.lead.nombre } } : prev
        );
      }
    }
    if (lead) {
      setData((prev) =>
        prev.lead
          ? {
              ...prev,
              lead: {
                ...prev.lead,
                ...(patch.email !== undefined ? { email: patch.email.trim() || null } : {}),
                ...(patch.localidad !== undefined ? { localidad: patch.localidad.trim() || null } : {}),
                ...(patch.producto ? { producto: patch.producto } : {}),
                ...(patch.plan_interes !== undefined
                  ? { plan_interes: patch.plan_interes.trim() || null }
                  : {}),
              },
            }
          : prev
      );
    }
    run(async () => {
      await updateChatFicha(phone, patch);
    });
  }

  const templates = WA_TEMPLATES.filter(
    (item) => !lead?.producto || !item.producto || item.producto === lead.producto || item.producto === "general"
  ).slice(0, 5);

  if (!open) return null;

  return (
    <aside className="crm-wa-lead" aria-label="Ficha del lead">
      <header className="crm-wa-lead__head">
        <div>
          <p>Ficha</p>
          <strong>{lead?.nombre || chatName || "Sin nombre"}</strong>
        </div>
        <button type="button" className="crm-wa-lead__close" onClick={onClose} aria-label="Cerrar ficha">
          ×
        </button>
      </header>

      <div className="crm-wa-lead__body">
        {loading ? <p className="crm-wa-lead__muted">Cargando ficha…</p> : null}
        {error ? <p className="crm-wa-lead__error">{error}</p> : null}

        {!loading ? (
          <section>
            <dl className="crm-wa-lead__facts">
              <FactInput
                label="Nombre"
                value={lead?.nombre || chatName || ""}
                placeholder="Nombre del chat"
                disabled={pending}
                onLive={(value) => {
                  if (value.trim()) onChatNameChange?.(value.trim());
                }}
                onCommit={(value) => saveFicha({ nombre: value })}
              />
              <div>
                <dt>Celular</dt>
                <dd>{lead?.celular || phone}</dd>
              </div>
              <FactInput
                label="Email"
                type="email"
                value={lead?.email || ""}
                placeholder="mail@correo.com"
                disabled={pending}
                onCommit={(value) => saveFicha({ email: value })}
              />
              <FactInput
                label="Localidad"
                value={lead?.localidad || ""}
                placeholder="Ciudad o localidad"
                disabled={pending}
                onCommit={(value) => saveFicha({ localidad: value })}
              />
              <div>
                <dt>Producto</dt>
                <dd>
                  <select
                    className="crm-wa-lead__edit"
                    value={lead?.producto || "general"}
                    disabled={pending}
                    aria-label="Producto"
                    onChange={(e) => saveFicha({ producto: e.target.value as ProductoInteres })}
                  >
                    {PRODUCTOS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>
              <FactInput
                label="Plan"
                value={lead?.plan_interes || ""}
                placeholder="Plan o detalle"
                disabled={pending}
                onCommit={(value) => saveFicha({ plan_interes: value })}
              />
              {lead ? (
                <div>
                  <dt>Puntaje</dt>
                  <dd>{lead.puntaje || 0}</dd>
                </div>
              ) : null}
            </dl>
            {!lead ? (
              <div className="crm-wa-lead__empty">
                <p>Este chat todavía no tiene ficha en el CRM. Completá un dato o creala.</p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(async () => { await ensureLeadFromChat(phone, chatName); })}
                >
                  Crear ficha
                </button>
              </div>
            ) : null}
            {lead ? (
              <>
                {(lead.tags || []).length ? (
                  <p className="crm-wa-lead__tags">{lead.tags.map((tag) => `#${tag}`).join("  ")}</p>
                ) : null}
                {lead.notas_iniciales ? (
                  <p className="crm-wa-lead__notes">{lead.notas_iniciales}</p>
                ) : null}
                <Link className="crm-wa-lead__link" href={`/crm/leads/${lead.id}`}>
                  Abrir ficha completa
                </Link>
              </>
            ) : null}
          </section>
        ) : null}

        {lead ? (
          <>

            <section>
              <h3>Pipeline</h3>
              <div className="crm-wa-lead__estados">
                {LEAD_ESTADOS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={lead.estado === item.value ? "is-on" : ""}
                    disabled={pending}
                    onClick={() => run(async () => updateLeadEstado(lead.id, item.value))}
                  >
                    {ESTADO_SHORT[item.value]}
                  </button>
                ))}
              </div>
              <div className="crm-wa-lead__row">
                <select
                  value={lead.producto}
                  disabled={pending}
                  onChange={(e) =>
                    run(async () => updateLead(lead.id, { producto: e.target.value as ProductoInteres }))
                  }
                  aria-label="Producto"
                >
                  {PRODUCTOS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                {lead.estado !== "ganado" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(async () => { await convertLeadQuiet(lead.id); })}
                  >
                    Convertir
                  </button>
                ) : (
                  <Link href="/crm/afiliados">Afiliados</Link>
                )}
              </div>
            </section>

            <section>
              <h3>Plantillas</h3>
              <div className="crm-wa-lead__templates">
                {templates.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      onUseMessage(
                        fillTemplate(item.cuerpo, {
                          nombre: lead.nombre,
                          interes: lead.plan_interes || lead.producto,
                          localidad: lead.localidad || "",
                        })
                      )
                    }
                  >
                    {item.titulo}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3>Recordatorios</h3>
              <div className="crm-wa-lead__quick">
                {[
                  ["En 1 hora", localDateTime(1), "whatsapp"],
                  ["Mañana 10 hs", tomorrowTen(), "llamada"],
                  ["En 2 días", localDateTime(48), "cotizacion"],
                ].map(([label, when, tipo]) => (
                  <button
                    key={label}
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const form = new FormData();
                        form.set("lead_id", lead.id);
                        form.set("titulo", `${label} · ${lead.nombre}`);
                        form.set("programado_para", when);
                        form.set("tipo", tipo);
                        await createSeguimiento(form);
                      })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <form
                className="crm-wa-lead__form"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    const form = new FormData();
                    form.set("lead_id", lead.id);
                    form.set("titulo", titulo.trim() || "Seguimiento");
                    form.set("programado_para", cuando);
                    form.set("tipo", "whatsapp");
                    await createSeguimiento(form);
                  });
                }}
              >
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" />
                <input type="datetime-local" value={cuando} onChange={(e) => setCuando(e.target.value)} />
                <button type="submit" disabled={pending}>
                  Programar
                </button>
              </form>
              <ul className="crm-wa-lead__list">
                {data.seguimientos.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.titulo}</strong>
                      <span>
                        {item.tipo} · {formatDate(item.programado_para)} · {item.estado}
                      </span>
                    </div>
                    {item.estado === "pendiente" ? (
                      <div className="crm-wa-lead__mini">
                        <button type="button" disabled={pending} onClick={() => run(async () => completeSeguimiento(item.id))}>
                          Hecho
                        </button>
                        <button type="button" disabled={pending} onClick={() => run(async () => snoozeSeguimiento(item.id, 24))}>
                          +24h
                        </button>
                        <button type="button" disabled={pending} onClick={() => run(async () => cancelSeguimiento(item.id))}>
                          Cancelar
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3>Notas</h3>
              <form
                className="crm-wa-lead__form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!nota.trim()) return;
                  run(async () => {
                    const form = new FormData();
                    form.set("nota", nota.trim());
                    await addNota(lead.id, null, form);
                    setNota("");
                  });
                }}
              >
                <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Agregar nota…" />
                <button type="submit" disabled={pending || !nota.trim()}>
                  Guardar
                </button>
              </form>
              <ul className="crm-wa-lead__list">
                {data.actividades.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.titulo}</strong>
                      {item.detalle ? <span>{item.detalle}</span> : null}
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </aside>
  );
}

export function ChatLeadDock({
  phone,
  chatName,
  open,
  onToggle,
  onUseMessage,
  onChatNameChange,
}: {
  phone: string;
  chatName: string;
  open: boolean;
  onToggle: () => void;
  onUseMessage: (text: string) => void;
  onChatNameChange?: (name: string) => void;
}) {
  const [estado, setEstado] = useState<LeadEstado | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    async function peek() {
      const res = await fetch(`/api/crm/chat-lead?phone=${encodeURIComponent(phone)}`, { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as { lead?: Lead | null };
      if (!alive) return;
      setEstado(json.lead?.estado || null);
      setLeadId(json.lead?.id || null);
    }
    void peek();
    const supabase = createClient();
    const channel = supabase
      .channel(`crm-chat-dock-${phone}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        void peek();
      })
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [phone, open]);

  return (
    <>
      <ChatLeadBar
        estado={estado}
        disabled={pending || !leadId}
        onOpenFicha={onToggle}
        onEstado={(next) => {
          if (!leadId) {
            onToggle();
            return;
          }
          start(async () => {
            await updateLeadEstado(leadId, next);
            setEstado(next);
          });
        }}
      />
      <ChatLeadPanel
        phone={phone}
        chatName={chatName}
        open={open}
        onClose={onToggle}
        onChatNameChange={onChatNameChange}
        onLeadChange={(lead) => {
          setEstado(lead?.estado || null);
          setLeadId(lead?.id || null);
        }}
        onUseMessage={(text) => {
          onUseMessage(text);
          if (open) onToggle();
        }}
      />
    </>
  );
}

export function ChatLeadBar({
  estado,
  onOpenFicha,
  onEstado,
  disabled,
}: {
  estado: LeadEstado | null;
  onOpenFicha: () => void;
  onEstado: (estado: LeadEstado) => void;
  disabled?: boolean;
}) {
  return (
    <div className="crm-wa-leadbar">
      <button type="button" className="crm-wa-leadbar__ficha" onClick={onOpenFicha}>
        Ficha
      </button>
      <div className="crm-wa-leadbar__states" role="group" aria-label="Pipeline">
        {LEAD_ESTADOS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={estado === item.value ? "is-on" : ""}
            disabled={disabled || !estado}
            onClick={() => onEstado(item.value)}
          >
            {ESTADO_SHORT[item.value]}
          </button>
        ))}
      </div>
    </div>
  );
}
