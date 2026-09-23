import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { connectionCookie, exchangeGoogleCode, signOAuthState } from "@/lib/crm/google-calendar";
import { SITE_URL } from "@/lib/seo";

function same(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: NextRequest) {
  const back = `${SITE_URL}/crm/calendario`;
  const error = request.nextUrl.searchParams.get("error");
  if (error) return NextResponse.redirect(`${back}?google=denegado`);

  const code = request.nextUrl.searchParams.get("code") || "";
  const state = request.nextUrl.searchParams.get("state") || "";
  const cookie = request.cookies.get("marxel_google_oauth")?.value || "";
  const [saved, signature] = cookie.split(".");
  if (!code || !state || !saved || !signature || !same(saved, state) || !same(signature, signOAuthState(saved))) {
    return NextResponse.redirect(`${back}?google=estado`);
  }

  try {
    const account = await exchangeGoogleCode(code);
    const stored = connectionCookie(account.email, account.refreshToken);
    const response = NextResponse.redirect(`${back}?google=ok`);
    response.cookies.set(stored.name, stored.value, stored.options);
    response.cookies.delete("marxel_google_oauth");
    return response;
  } catch {
    return NextResponse.redirect(`${back}?google=error`);
  }
}
