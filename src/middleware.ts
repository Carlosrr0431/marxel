import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "marxel_crm_session";

function expectedSession() {
  const password = process.env.CRM_PASSWORD || "";
  if (!password) return null;
  return Buffer.from(`marxel:${password}`).toString("base64url");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/crm")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/crm/login")) {
    return NextResponse.next();
  }

  const expected = expectedSession();
  const session = request.cookies.get(COOKIE)?.value;

  if (!expected || session !== expected) {
    const url = request.nextUrl.clone();
    url.pathname = "/crm/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/crm/:path*"],
};
