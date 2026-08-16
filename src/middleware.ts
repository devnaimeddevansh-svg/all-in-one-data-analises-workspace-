import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auto-create guest session for dashboard routes
  if (pathname.startsWith("/dashboard") && !request.cookies.get("nexusos_guest")) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/guest/init";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Root → dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Old auth pages → dashboard
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login", "/register", "/forgot-password", "/reset-password"],
};
