"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  CHOICE_COOKIE,
  VISITOR_COOKIE,
  postCookieVisit,
  readCookie,
  touchTrail,
  writeCookie,
} from "@/lib/cookies/visitor";

export function SiteVisit() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/crm")) return;
    const trail = touchTrail(pathname);
    if (readCookie(CHOICE_COOKIE) !== "1") return;
    let visitorId = readCookie(VISITOR_COOKIE);
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      writeCookie(VISITOR_COOKIE, visitorId);
    }
    postCookieVisit(visitorId, trail);
  }, [pathname]);

  return null;
}
