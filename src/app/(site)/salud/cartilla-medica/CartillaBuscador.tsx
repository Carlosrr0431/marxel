"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useCallback } from "react";
import {
  PRESTADORES,
  FARMACIAS,
  TIPO_LABEL,
  TIPO_COLOR,
  type TipoPrestador,
} from "@/data/cartilla-prestadores";

const CartillaMap = dynamic(
  () => import("./CartillaMap").then((m) => ({ default: m.CartillaMap })),
  { ssr: false, loading: () => <div className="cartilla-map-container cartilla-map-loading" aria-hidden /> }
);

const TIPOS: TipoPrestador[] = [
  "clinica","sanatorio","policonsultorio","diagnostico",
  "laboratorio","rehabilitacion","vacunacion","maternidad",
];

const MAX_TAGS = 3;

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function CartillaBuscador() {
  const [query, setQuery]       = useState("");
  const [planFiltro, setPlanFiltro] = useState<"A2" | "A4" | "todos">("todos");
  const [tipoFiltro, setTipoFiltro] = useState<TipoPrestador | "todos">("todos");
  const [tab, setTab]           = useState<"prestadores" | "farmacias">("prestadores");
  const [selected, setSelected] = useState<string | null>(null);
  const [showAllSpecs, setShowAllSpecs] = useState<Record<string, boolean>>({});

  const q = normalize(query);

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
        return normalize(f.nombre).includes(q) || normalize(f.direccion).includes(q);
      }),
    [q, planFiltro]
  );

  const handleSelect = useCallback((id: string) => {
    setSelected((prev) => (prev === id ? null : id));
    if (tab !== "prestadores") setTab("prestadores");
    // Espera el re-render antes de hacer scroll para que el card esté en el DOM
    setTimeout(() => {
      const card = document.getElementById(`card-${id}`);
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }, [tab]);

  const toggleSpecs = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAllSpecs((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <div className="cartilla-layout">
      {/* ── Panel izquierdo: controles + listado ── */}
      <div className="cartilla-panel-left">
        {/* Buscador */}
        <div className="cartilla-search-row">
          <div className="cartilla-search-input-wrap">
            <svg className="cartilla-search-icon" viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M13.5 13.5 18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <input
              type="search"
              className="cartilla-search-input"
              placeholder="Buscar por nombre, especialidad o dirección…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
            {query && (
              <button onClick={() => setQuery("")} className="cartilla-search-clear" aria-label="Limpiar">
                <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12" aria-hidden><path d="M1 1l14 14M15 1 1 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* Filtros plan */}
        <div className="cartilla-filter-bar">
          <div className="cartilla-filter-group">
            <span className="cartilla-filter-label">Plan</span>
            {(["todos","A2","A4"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlanFiltro(p)}
                className={`cartilla-pill${planFiltro === p ? " active" : ""}`}
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
                className={`cartilla-pill${tipoFiltro === "todos" ? " active" : ""}`}
              >
                Todos
              </button>
              {TIPOS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTipoFiltro(t)}
                  className={`cartilla-pill${tipoFiltro === t ? " active" : ""}`}
                >
                  {TIPO_LABEL[t]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="cartilla-tabs">
          <button
            onClick={() => setTab("prestadores")}
            className={`cartilla-tab${tab === "prestadores" ? " active" : ""}`}
          >
            Clínicas y centros
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

        {/* Lista de prestadores */}
        {tab === "prestadores" && (
          <div className="cartilla-list">
            {prestadoresFiltrados.length === 0 ? (
              <p className="cartilla-empty">No se encontraron prestadores con esos filtros.</p>
            ) : (
              prestadoresFiltrados.map((p) => {
                const isOpen   = !!showAllSpecs[p.id];
                const visibles = isOpen ? p.especialidades : p.especialidades.slice(0, MAX_TAGS);
                const extra    = p.especialidades.length - MAX_TAGS;
                const isActive = selected === p.id;

                return (
                  <article
                    key={p.id}
                    id={`card-${p.id}`}
                    className={`cartilla-card${isActive ? " is-selected" : ""}`}
                    onClick={() => handleSelect(p.id)}
                  >
                    {/* Header */}
                    <div className="cartilla-card-head">
                      <div className="cartilla-card-head-info">
                        <h3 className="cartilla-card-name">{p.nombre}</h3>
                        <span className={`cartilla-tipo-badge ${TIPO_COLOR[p.tipo]}`}>
                          {TIPO_LABEL[p.tipo]}
                        </span>
                      </div>
                      <div className="cartilla-plan-chips">
                        {p.planes.map((pl) => (
                          <span key={pl} className="cartilla-plan-chip">{pl}</span>
                        ))}
                      </div>
                    </div>

                    {/* Contacto */}
                    <div className="cartilla-card-meta">
                      {p.direccion && (
                        <span className="cartilla-meta-item">
                          <svg viewBox="0 0 16 20" fill="currentColor" width="10" height="12" aria-hidden>
                            <path d="M8 0C4.7 0 2 2.7 2 6c0 4.5 6 14 6 14s6-9.5 6-14c0-3.3-2.7-6-6-6zm0 8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
                          </svg>
                          {p.direccion}
                        </span>
                      )}
                      {p.telefono && (
                        <span className="cartilla-meta-item">
                          <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10" aria-hidden>
                            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                          </svg>
                          {p.telefono}
                        </span>
                      )}
                      {p.whatsapp && (
                        <a
                          href={`https://wa.me/549${p.whatsapp.replace(/\D/g,"")}`}
                          target="_blank" rel="noopener noreferrer"
                          className="cartilla-meta-item cartilla-meta-wa"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10" aria-hidden>
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          WhatsApp turnos
                        </a>
                      )}
                    </div>

                    {/* Especialidades compactas */}
                    {p.especialidades.length > 0 && (
                      <div className="cartilla-specs">
                        {visibles.map((e) => (
                          <span key={e} className="cartilla-spec">{e}</span>
                        ))}
                        {!isOpen && extra > 0 && (
                          <button className="cartilla-spec cartilla-spec-more" onClick={(e) => toggleSpecs(p.id, e)}>
                            +{extra} más
                          </button>
                        )}
                        {isOpen && (
                          <button className="cartilla-spec cartilla-spec-more" onClick={(e) => toggleSpecs(p.id, e)}>
                            Ver menos
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        )}

        {/* Lista de farmacias */}
        {tab === "farmacias" && (
          <div className="cartilla-farm-list">
            {farmaciasFiltradas.length === 0 ? (
              <p className="cartilla-empty">No se encontraron farmacias con esos filtros.</p>
            ) : (
              farmaciasFiltradas.map((f) => (
                <article key={f.id} className="cartilla-farm-row">
                  <div className="cartilla-farm-icon" aria-hidden>💊</div>
                  <div className="cartilla-farm-body">
                    <span className="cartilla-farm-name">{f.nombre}</span>
                    <span className="cartilla-farm-addr">{f.direccion}, Salta Capital</span>
                    {f.telefono && <span className="cartilla-farm-tel">{f.telefono}</span>}
                  </div>
                  {f.planes.map((pl) => (
                    <span key={pl} className="cartilla-plan-chip">{pl}</span>
                  ))}
                </article>
              ))
            )}
            <p className="cartilla-farm-note">
              Farmacias habilitadas en Salta Capital al 11/07/2026. Para nuevas incorporaciones, consultá con tu asesor MARXEN.
            </p>
          </div>
        )}
      </div>

      {/* ── Panel derecho: mapa ── */}
      <div className="cartilla-panel-right">
        <CartillaMap
          prestadores={prestadoresFiltrados}
          selected={selected}
          onSelect={handleSelect}
        />
        <p className="cartilla-map-hint">
          Clic en un marcador para ver detalles · Solo prestadores con dirección georeferenciada
        </p>
      </div>
    </div>
  );
}
