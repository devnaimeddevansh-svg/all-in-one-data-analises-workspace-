import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const verification = await db.verificationToken.findUnique({
    where: { token },
  });

  if (!verification || verification.expires < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { email: verification.identifier },
    data: { emailVerified: new Date() },
  });

  await db.verificationToken.delete({ where: { token } });
  await createAuditLog({ userId: user.id, action: "user.email_verified" });

  return NextResponse.json({ message: "Email verified successfully" });
}
