import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resend) resend = new Resend(key);
  return resend;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = process.env.EMAIL_FROM ?? "NexusOS <onboarding@resend.dev>";

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<string | undefined> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/verify-email?token=${token}`;
  const client = getResend();

  if (!client) {
    console.log(`[NexusOS] Verification link for ${email}: ${url}`);
    return url;
  }

  await client.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Verify your NexusOS account",
    html: `
      <h2>Welcome to NexusOS</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${url}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `,
  });
  return undefined;
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<string | undefined> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/reset-password?token=${token}`;
  const client = getResend();

  if (!client) {
    console.log(`[NexusOS] Password reset link for ${email}: ${url}`);
    return url;
  }

  await client.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset your NexusOS password",
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${url}">Reset Password</a>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  });
  return undefined;
}
