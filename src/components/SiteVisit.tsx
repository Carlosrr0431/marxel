"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  CHOICE_COOKIE,
  VISITOR_COOKIE,
  closeTrail,
  postCookieVisit,
  readCookie,
  savedContact,
  touchTrail,
  writeCookie,
} from "@/lib/cookies/visitor";

function visitorId() {
  let id = readCookie(VISITOR_COOKIE);
  if (!id) {
    id = crypto.randomUUID();
    writeCookie(VISITOR_COOKIE, id);
  }
  return id;
}

function syncTrail(trail: NonNullable<ReturnType<typeof closeTrail>>, keepalive = false) {
  const contact = savedContact();
  if (readCookie(CHOICE_COOKIE) !== "1" && !contact) return;
  postCookieVisit(visitorId(), trail, contact || undefined, keepalive);
}

export function SiteVisit() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/crm")) return;
    syncTrail(touchTrail(pathname));
  }, [pathname]);

  useEffect(() => {
    function leave() {
      const trail = closeTrail();
      if (trail) syncTrail(trail, true);
    }
    function onVisible() {
      if (document.visibilityState === "hidden") leave();
      else if (!window.location.pathname.startsWith("/crm")) touchTrail(window.location.pathname);
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", leave);
    };
  }, []);

  return null;
}
