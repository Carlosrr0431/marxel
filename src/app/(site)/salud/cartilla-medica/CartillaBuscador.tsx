"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  PRESTADORES,
  FARMACIAS,
  TIPO_LABEL,
  TIPO_COLOR,
  type TipoPrestador,
} from "@/data/cartilla-prestadores";

const TIPOS: TipoPrestador[] = [
  "clinica","sanatorio","policonsultorio","diagnostico",
  "laboratorio","rehabilitacion","vacunacion","maternidad",
];

export function CartillaBuscador() {
  const [query, setQuery] = useState("");
  const [planFiltro, setPlanFiltro] = useState<"A2" | "A4" | "todos">("todos");
  const [tipoFiltro, setTipoFiltro] = useState<TipoPrestador | "todos">("todos");
  const [tab, setTab] = useState<"prestadores" | "farmacias">("prestadores");

  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const prestadoresFiltrados = useMemo(
    () =>
      PRESTADORES.filter((p) => {
        if (planFiltro !== "todos" && !p.planes.includes(planFiltro)) return false;
        if (tipoFiltro !== "todos" && p.tipo !== tipoFiltro) return false;
        if (!q) return true;
        return (
          normalize(p.nombre).includes(q) ||
          normalize(p.direccion).includes(q) ||
          p.especialidades.some((e) => normalize(e).includes(q))
        );
      }),
    [q, planFiltro, tipoFiltro]
  );

  const farmaciasFiltradas = useMemo(
    () =>
      FARMACIAS.filter((f) => {
        if (planFiltro !== "todos" && !f.planes.includes(planFiltro)) return false;
        if (!q) return true;
        return (
          normalize(f.nombre).includes(q) ||
          normalize(f.direccion).includes(q)
        );
      }),
    [q, planFiltro]
  );

  return (
    <div>
      {/* ── Barra de búsqueda ── */}
      <div className="cartilla-buscador-wrap">
        <div className="cartilla-search-row">
          <div className="cartilla-search-input-wrap">
            <svg className="cartilla-search-icon" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M13.5 13.5 18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <input
              type="search"
              className="cartilla-search-input"
              placeholder="Buscar por nombre, especialidad o dirección…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="cartilla-search-clear"
                aria-label="Limpiar"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Filtros ── */}
        <div className="cartilla-filters">
          <div className="cartilla-filter-group">
            <span className="cartilla-filter-label">Plan</span>
            {(["todos","A2","A4"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlanFiltro(p)}
                className={`cartilla-filter-btn${planFiltro === p ? " active" : ""}`}
              >
                {p === "todos" ? "Todos" : `Plan ${p}`}
              </button>
            ))}
          </div>

          {tab === "prestadores" && (
            <div className="cartilla-filter-group">
              <span className="cartilla-filter-label">Tipo</span>
              <button
                onClick={() => setTipoFiltro("todos")}
                className={`cartilla-filter-btn${tipoFiltro === "todos" ? " active" : ""}`}
              >
                Todos
              </button>
              {TIPOS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTipoFiltro(t)}
                  className={`cartilla-filter-btn${tipoFiltro === t ? " active" : ""}`}
                >
                  {TIPO_LABEL[t]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="cartilla-tabs">
          <button
            onClick={() => setTab("prestadores")}
            className={`cartilla-tab${tab === "prestadores" ? " active" : ""}`}
          >
            Clínicas y sanatorios
            <span className="cartilla-tab-count">{prestadoresFiltrados.length}</span>
          </button>
          <button
            onClick={() => setTab("farmacias")}
            className={`cartilla-tab${tab === "farmacias" ? " active" : ""}`}
          >
            Farmacias
            <span className="cartilla-tab-count">{farmaciasFiltradas.length}</span>
          </button>
        </div>
      </div>

      {/* ── Lista de prestadores ── */}
      {tab === "prestadores" && (
        <div className="cartilla-grid-full">
          {prestadoresFiltrados.length === 0 ? (
            <p className="cartilla-empty">No se encontraron prestadores con esos filtros.</p>
          ) : (
            prestadoresFiltrados.map((p) => (
              <article key={p.id} className="cartilla-card-full">
                <div className="cartilla-card-header">
                  <div>
                    <h3 className="cartilla-card-name">{p.nombre}</h3>
                    <span className={`cartilla-badge ${TIPO_COLOR[p.tipo]}`}>
                      {TIPO_LABEL[p.tipo]}
                    </span>
                  </div>
                  <div className="cartilla-card-plans">
                    {p.planes.map((pl) => (
                      <span key={pl} className="cartilla-plan-badge">{pl}</span>
                    ))}
                  </div>
                </div>

                <div className="cartilla-card-body-full">
                  <div className="cartilla-card-info">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="cartilla-info-icon">
                      <path d="M8 1a5 5 0 1 0 0 10A5 5 0 0 0 8 1zM7 13v2h2v-2H7z"/>
                    </svg>
                    <span>{p.direccion}</span>
                  </div>
                  {p.telefono && (
                    <div className="cartilla-card-info">
                      <svg viewBox="0 0 16 16" fill="currentColor" className="cartilla-info-icon">
                        <path d="M3.9 1.6C3.4.6 2.2.2 1.3.8L.5 1.4C-.6 2.3-.1 4.2 1 5.9c1.3 2 3.2 4 5.2 5.5 1.7 1.2 3.7 2 4.9 1.2l.6-.5c.8-.7.7-2-.2-2.7L10 8.1c-.7-.5-1.7-.4-2.3.2l-.4.4C6.5 8 5.5 7 4.8 6.2l.3-.4c.6-.6.6-1.6.1-2.2L3.9 1.6z"/>
                      </svg>
                      <span>{p.telefono}</span>
                    </div>
                  )}
                  {p.whatsapp && (
                    <a
                      href={`https://wa.me/549${p.whatsapp.replace(/\D/g,'')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cartilla-card-wa"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="cartilla-info-icon text-green-600">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp para turnos
                    </a>
                  )}
                </div>

                {p.especialidades.length > 0 && (
                  <div className="cartilla-specs-wrap">
                    {p.especialidades.map((e) => (
                      <span key={e} className="cartilla-spec-tag">{e}</span>
                    ))}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      )}

      {/* ── Lista de farmacias ── */}
      {tab === "farmacias" && (
        <div className="cartilla-farm-grid">
          {farmaciasFiltradas.length === 0 ? (
            <p className="cartilla-empty">No se encontraron farmacias con esos filtros.</p>
          ) : (
            farmaciasFiltradas.map((f) => (
              <article key={f.id} className="cartilla-farm-card">
                <div className="cartilla-farm-icon">💊</div>
                <div>
                  <h3 className="cartilla-farm-name">{f.nombre}</h3>
                  <p className="cartilla-farm-addr">{f.direccion}, Salta Capital</p>
                  {f.telefono && (
                    <p className="cartilla-farm-tel">{f.telefono}</p>
                  )}
                </div>
              </article>
            ))
          )}
          <p className="cartilla-farm-note col-span-full">
            Listado de farmacias habilitadas en Salta Capital al 11/07/2026.
            Para verificar la incorporación de nuevas farmacias, consultá con tu asesor MARXEN.
          </p>
        </div>
      )}
    </div>
  );
}
