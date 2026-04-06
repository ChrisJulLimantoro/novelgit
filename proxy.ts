import { NextRequest, NextResponse } from "next/server";
import { isValidAuthCookie } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  if (!isValidAuthCookie(token)) {
    const from = request.nextUrl.pathname + request.nextUrl.search;
    const url = new URL("/", request.url);
    url.searchParams.set("from", from);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/library",
    "/library/:path*",
    "/edit/:path*",
    "/admin/:path*",
    "/api/export/:path*",
  ],
};
