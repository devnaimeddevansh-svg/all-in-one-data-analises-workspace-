import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendVerificationEmail, isEmailConfigured } from "@/lib/email";
import { ensureOrganizationForUser } from "@/lib/org";
import { createAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = await rateLimit(`register:${ip}`, 10);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const data = schema.parse(body);
    const email = data.email.toLowerCase().trim();

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await db.user.create({
      data: {
        name: data.name.trim(),
        email,
        passwordHash,
        emailVerified: new Date(),
      },
    });

    await ensureOrganizationForUser(user.id, data.name.trim());
    await createAuditLog({ userId: user.id, action: "user.register", ipAddress: ip });

    return NextResponse.json({
      message: "Account created successfully.",
      autoVerified: true,
      email,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Register error:", error);
    const message =
      error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `Registration failed: ${message}`
            : "Registration failed. Check database connection and try again.",
      },
      { status: 500 }
    );
  }
}
