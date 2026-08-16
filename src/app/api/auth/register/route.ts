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

function shouldAutoVerifyEmail(): boolean {
  if (process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true") return false;
  if (process.env.AUTH_AUTO_VERIFY === "true") return true;
  return !isEmailConfigured();
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = await rateLimit(`register:${ip}`, 5);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const data = schema.parse(body);
    const email = data.email.toLowerCase().trim();
    const autoVerify = shouldAutoVerifyEmail();

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
        emailVerified: autoVerify ? new Date() : undefined,
      },
    });

    await ensureOrganizationForUser(user.id, data.name.trim());

    let verificationUrl: string | undefined;
    if (!autoVerify) {
      const token = crypto.randomUUID();
      await db.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      verificationUrl = await sendVerificationEmail(email, token);
    }

    await createAuditLog({ userId: user.id, action: "user.register", ipAddress: ip });

    return NextResponse.json({
      message: autoVerify
        ? "Account created. You can sign in now."
        : "Account created. Please check your email to verify.",
      autoVerified: autoVerify,
      ...(verificationUrl && !isEmailConfigured() ? { verificationUrl } : {}),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Register error:", error);
    const message =
      error instanceof Error && process.env.NODE_ENV === "development"
        ? error.message
        : "Registration failed. Please check database configuration and try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
