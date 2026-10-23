import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, decodeSession } from "@/lib/auth/session";
import { applySecurityHeaders } from "@/lib/security/http";

const PUBLIC = ["/giris", "/api/v1", "/api/paket", "/onay/posta", "/indir"];

function withSecurity(response: NextResponse, pathname: string) {
  applySecurityHeaders(response.headers);
  if (pathname === "/indir" || pathname.startsWith("/indir/") || pathname === "/api/paket") {
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return withSecurity(NextResponse.next(), pathname);
  }

  const session = await decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (!session && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    url.search = "";
    return withSecurity(NextResponse.redirect(url), pathname);
  }

  if (session && pathname === "/giris") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return withSecurity(NextResponse.redirect(url), pathname);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  if (session && pathname.startsWith("/ayarlar") && session.role !== "SUPER_ADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = "/yetkisiz";
    url.search = "";
    return withSecurity(NextResponse.redirect(url), pathname);
  }

  return withSecurity(NextResponse.next({ request: { headers: requestHeaders } }), pathname);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
