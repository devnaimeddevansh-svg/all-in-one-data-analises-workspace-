import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { createOrganizationForUser } from "@/lib/org";
import { createAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = await rateLimit(`register:${ip}`, 5);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const data = schema.parse(body);

    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const token = crypto.randomUUID();

    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
      },
    });

    await db.verificationToken.create({
      data: {
        identifier: data.email,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await createOrganizationForUser(user.id, data.name);
    await sendVerificationEmail(data.email, token);
    await createAuditLog({ userId: user.id, action: "user.register", ipAddress: ip });

    return NextResponse.json({
      message: "Account created. Please check your email to verify.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Register error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
