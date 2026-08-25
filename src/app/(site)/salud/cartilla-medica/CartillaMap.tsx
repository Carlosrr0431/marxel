"use client";

import { useEffect, useRef } from "react";
import type { Prestador } from "@/data/cartilla-prestadores";

const ML_VER = "4.7.1";
const ML_JS  = `https://unpkg.com/maplibre-gl@${ML_VER}/dist/maplibre-gl.js`;
const ML_CSS = `https://unpkg.com/maplibre-gl@${ML_VER}/dist/maplibre-gl.css`;

const SALTA_CENTER: [number, number] = [-65.4232, -24.7829];
const TILE_STYLE = "https://tiles.openfreemap.org/styles/positron";

const TIPO_COLOR: Record<string, string> = {
  clinica:         "#0ea5e9",
  sanatorio:       "#8b5cf6",
  policonsultorio: "#10b981",
  diagnostico:     "#f59e0b",
  laboratorio:     "#ef4444",
  rehabilitacion:  "#06b6d4",
  vacunacion:      "#84cc16",
  maternidad:      "#ec4899",
  farmacia:        "#6366f1",
};

/** Carga maplibre-gl desde CDN como script clásico (no ES-module).
 *  Evita que Turbopack intente bundlearlo y falle con MIME text/html. */
function loadMapLibre(): Promise<typeof import("maplibre-gl")> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.maplibregl) return Promise.resolve(w.maplibregl);

  if (!document.querySelector("link[data-ml-css]")) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = ML_CSS;
    link.setAttribute("data-ml-css", "1");
    document.head.appendChild(link);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-ml-js]");
    if (existing) {
      existing.addEventListener("load", () => resolve(w.maplibregl));
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = ML_JS;
    script.setAttribute("data-ml-js", "1");
    script.onload  = () => resolve(w.maplibregl);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

interface Props {
  prestadores: Prestador[];
  selected: string | null;
  onSelect: (id: string) => void;
}

/** Genera una etiqueta corta para el marcador del mapa (máx. 16 chars) */
function shortLabel(nombre: string): string {
  const stopWords = new Set(["de", "del", "la", "el", "los", "las", "y", "e", "sa", "srl", "s.a.", "s.r.l."]);
  const words = nombre.split(/\s+/).filter((w) => !stopWords.has(w.toLowerCase()));
  const first = words.slice(0, 2).join(" ");
  return first.length > 18 ? first.slice(0, 16) + "…" : first;
}

export function CartillaMap({ prestadores, selected, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef     = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    loadMapLibre()
      .then((ml) => {
        if (cancelled || !containerRef.current) return;

        const map = new ml.Map({
          container: containerRef.current,
          style: TILE_STYLE,
          center: SALTA_CENTER,
          zoom: 13,
          attributionControl: false,
        });
        map.addControl(new ml.AttributionControl({ compact: true }), "bottom-left");
        mapRef.current = map;

        map.on("load", () => {
          if (cancelled) return;
          prestadores
            .filter((p) => p.lat != null && p.lng != null)
            .forEach((p) => {
              const color = TIPO_COLOR[p.tipo] ?? "#0ea5e9";
              const shortName = shortLabel(p.nombre);

              // Wrapper: pin + label — el MapLibre ancla al centro del wrapper
              const wrap = document.createElement("div");
              wrap.className = "cartilla-marker-wrap";
              wrap.style.setProperty("--mc", color);

              const pin = document.createElement("div");
              pin.className = "cartilla-marker";

              const label = document.createElement("div");
              label.className = "cartilla-marker-label";
              label.textContent = shortName;
              label.style.borderColor = color;

              wrap.appendChild(pin);
              wrap.appendChild(label);

              const popup = new ml.Popup({ offset: 14, closeButton: false, maxWidth: "240px" })
                .setHTML(`<div class="cartilla-popup">
                  <strong>${p.nombre}</strong>
                  <span>${p.direccion}</span>
                  ${p.telefono ? `<span>📞 ${p.telefono}</span>` : ""}
                </div>`);

              new ml.Marker({ element: wrap })
                .setLngLat([p.lng!, p.lat!])
                .setPopup(popup)
                .addTo(map);

              wrap.addEventListener("click", () => onSelect(p.id));
              markersRef.current.set(p.id, { el: wrap, getLngLat: () => [p.lng!, p.lat!] });
            });
        });
      })
      .catch((e) => console.error("[CartillaMap] failed to load maplibre", e));

    return () => {
      cancelled = true;
      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    markersRef.current.forEach(({ el }, id) => {
      el.classList.toggle("is-selected", id === selected);
    });
    if (selected) {
      const entry = markersRef.current.get(selected);
      if (entry && mapRef.current) {
        mapRef.current.flyTo({ center: entry.getLngLat(), zoom: 15, speed: 1.4 });
      }
    }
  }, [selected]);

  return (
    <div
      ref={containerRef}
      className="cartilla-map-container"
      aria-label="Mapa de prestadores en Salta Capital"
    />
  );
}
