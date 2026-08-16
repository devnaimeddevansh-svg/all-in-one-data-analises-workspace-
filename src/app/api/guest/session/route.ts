import { NextResponse } from "next/server";
import { getGuestFromCookie } from "@/lib/guest";

export async function GET() {
  const guest = await getGuestFromCookie();
  if (!guest) {
    return NextResponse.json({ guest: null });
  }
  return NextResponse.json({ guest });
}
