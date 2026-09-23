import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { googleAuthUrl, googleConfigured, signOAuthState } from "@/lib/crm/google-calendar";
import { SITE_URL } from "@/lib/seo";

export async function GET() {
  if (!(await requireCrmSession())) {
    return NextResponse.redirect(`${SITE_URL}/crm/login?next=/crm/calendario`);
  }
  if (!googleConfigured()) {
    return NextResponse.redirect(`${SITE_URL}/crm/calendario?google=config`);
  }
  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(googleAuthUrl(state));
  response.cookies.set("marxel_google_oauth", `${state}.${signOAuthState(state)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 600,
  });
  return response;
}
