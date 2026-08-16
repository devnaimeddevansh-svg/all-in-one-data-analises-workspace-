import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

const schema = z.object({
  token: z.string(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = schema.parse(body);

    const verification = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verification || verification.expires < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.user.update({
      where: { email: verification.identifier },
      data: { passwordHash },
    });

    await db.verificationToken.delete({ where: { token } });
    await createAuditLog({ userId: user.id, action: "user.password_reset" });

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
