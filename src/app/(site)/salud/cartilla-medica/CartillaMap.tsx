"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Prestador } from "@/data/cartilla-prestadores";

interface Props {
  prestadores: Prestador[];
  selected: string | null;
  onSelect: (id: string) => void;
}

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

export function CartillaMap({ prestadores, selected, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef     = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());

  // Inicializar mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: TILE_STYLE,
      center: SALTA_CENTER,
      zoom: 13,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-left"
    );

    mapRef.current = map;

    map.on("load", () => {
      const withCoords = prestadores.filter(
        (p) => p.lat != null && p.lng != null
      );

      withCoords.forEach((p) => {
        const el = document.createElement("div");
        el.className = "cartilla-marker";
        el.style.setProperty("--mc", TIPO_COLOR[p.tipo] ?? "#0ea5e9");

        const popup = new maplibregl.Popup({
          offset: 14,
          closeButton: false,
          maxWidth: "240px",
        }).setHTML(`
          <div class="cartilla-popup">
            <strong>${p.nombre}</strong>
            <span>${p.direccion}</span>
            ${p.telefono ? `<span>📞 ${p.telefono}</span>` : ""}
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([p.lng!, p.lat!])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener("click", () => onSelect(p.id));
        markersRef.current.set(p.id, { marker, el });
      });
    });

    return () => {
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Highlight marcador seleccionado
  useEffect(() => {
    markersRef.current.forEach(({ el }, id) => {
      el.classList.toggle("is-selected", id === selected);
    });
    if (selected) {
      const entry = markersRef.current.get(selected);
      if (entry) {
        mapRef.current?.flyTo({
          center: entry.marker.getLngLat(),
          zoom: 15,
          speed: 1.4,
        });
        entry.marker.togglePopup();
      }
    }
  }, [selected]);

  return (
    <>
      {/* Next.js App Router hoist este link al <head> automáticamente */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/maplibre-gl/dist/maplibre-gl.css"
        precedence="default"
      />
      <div
        ref={containerRef}
        className="cartilla-map-container"
        aria-label="Mapa de prestadores en Salta Capital"
      />
    </>
  );
}
