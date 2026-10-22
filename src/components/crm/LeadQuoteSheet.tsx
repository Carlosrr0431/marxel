"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HomeAutoQuote } from "@/components/HomeAutoQuote";

function phoneLabel(phone: string) {
  const raw = String(phone || "");
  if (raw.startsWith("549") && raw.length >= 12) return `+${raw.slice(0, 2)} ${raw.slice(2, 3)} ${raw.slice(3)}`;
  if (raw.startsWith("54")) return `+${raw}`;
  return raw;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "•";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
}

export function LeadQuoteSheet({
  nombre,
  celular,
  className,
}: {
  nombre: string;
  celular: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const frame = window.requestAnimationFrame(() => setShown(true));
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setShown(false);
    window.setTimeout(() => setOpen(false), 240);
  }

  return (
    <>
      <button type="button" className={className || "crm-btn"} onClick={() => setOpen(true)}>
        Cotizar
      </button>
      {open
        ? createPortal(
            <div className={`lead-quote-root${shown ? " is-in" : ""}`}>
              <section className="lead-quote" role="dialog" aria-label="Cotizar sin salir de la conversación">
                <header className="lead-quote__bar">
                  <span className="lead-quote__avatar" aria-hidden="true">{initials(nombre)}</span>
                  <div className="lead-quote__who">
                    <strong>{nombre || "Lead"}</strong>
                    <p>{phoneLabel(celular)}</p>
                  </div>
                  <span className="lead-quote__live"><i />En vivo</span>
                  <button type="button" className="lead-quote__close" onClick={close}>
                    Volver
                  </button>
                </header>
                <div className="lead-quote__body">
                  <HomeAutoQuote variant="crm" preset={{ nombre, celular }} />
                </div>
              </section>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
