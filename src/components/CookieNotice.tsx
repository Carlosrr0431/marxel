"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CHOICE_COOKIE,
  VISITOR_COOKIE,
  postCookieVisit,
  readCookie,
  touchTrail,
  writeCookie,
} from "@/lib/cookies/visitor";

export function CookieNotice() {
  const [phase, setPhase] = useState<"ask" | "done" | "hidden">("hidden");

  useEffect(() => {
    if (!readCookie(CHOICE_COOKIE)) setPhase("ask");
  }, []);

  function accept() {
    const current = readCookie(VISITOR_COOKIE);
    const visitorId = current || crypto.randomUUID();
    writeCookie(VISITOR_COOKIE, visitorId);
    writeCookie(CHOICE_COOKIE, "1");
    window.dispatchEvent(new Event("mx-cookies-accepted"));
    setPhase("done");
    postCookieVisit(visitorId, touchTrail(window.location.pathname));
    window.setTimeout(() => setPhase("hidden"), 1400);
  }

  function later() {
    writeCookie(CHOICE_COOKIE, "0");
    setPhase("hidden");
  }

  if (phase === "hidden") return null;

  return (
    <aside className="cookie-note" role="dialog" aria-label="Aviso para contactarte">
      {phase === "done" ? (
        <p className="cookie-note__done">Listo. Si dejás tu WhatsApp, te escribimos.</p>
      ) : (
        <>
          <p className="cookie-note__kicker">Un detalle</p>
          <p className="cookie-note__title">Te escribimos con la cotización</p>
          <p className="cookie-note__text">
            Confirmá y guardamos esta visita. Si dejás tu WhatsApp, te contactamos nosotros. Sin spam.
          </p>
          <div className="cookie-note__actions">
            <button type="button" className="btn btn-primary" onClick={accept}>
              Confirmar
            </button>
            <button type="button" className="cookie-note__later" onClick={later}>
              Ahora no
            </button>
            <Link href="/privacidad" className="cookie-note__later">
              Privacidad
            </Link>
          </div>
        </>
      )}
    </aside>
  );
}

export function CookieVisitorField() {
  const [id, setId] = useState("");

  useEffect(() => {
    setId(readCookie(VISITOR_COOKIE));
  }, []);

  if (!id) return null;
  return <input type="hidden" name="visitor_id" value={id} />;
}
