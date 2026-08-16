import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = await rateLimit(`forgot:${ip}`, 3);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { email } = schema.parse(body);

    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      const token = crypto.randomUUID();
      await db.verificationToken.deleteMany({ where: { identifier: email } });
      await db.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      await sendPasswordResetEmail(email, token);
    }

    return NextResponse.json({
      message: "If an account exists, a reset link has been sent.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
