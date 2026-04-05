import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  if (token !== process.env.AUTH_SECRET) {
    const from = request.nextUrl.pathname + request.nextUrl.search;
    return NextResponse.redirect(new URL(`/login?from=${encodeURIComponent(from)}`, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/edit/:path*", "/admin/:path*"],
};
