import { NextResponse } from "next/server";
import { requireCrmSession } from "@/lib/crm/auth";
import { SITE_URL } from "@/lib/seo";

export async function GET() {
  if (!(await requireCrmSession())) {
    return NextResponse.redirect(`${SITE_URL}/crm/login?next=/crm/calendario`);
  }
  const response = NextResponse.redirect(`${SITE_URL}/crm/calendario?google=off`);
  response.cookies.delete("marxel_google_cal");
  return response;
}
