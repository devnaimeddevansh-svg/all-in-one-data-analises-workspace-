import { NextRequest, NextResponse } from "next/server";
import { createGuestUser, GUEST_COOKIE, COOKIE_MAX_AGE } from "@/lib/guest";

export async function GET(request: NextRequest) {
  const redirectTo =
    request.nextUrl.searchParams.get("redirect") ?? "/dashboard";

  const guest = await createGuestUser();

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set(GUEST_COOKIE, guest.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return response;
}
