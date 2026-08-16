import { auth } from "@/lib/auth";
import { getUserOrganization } from "@/lib/org";
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("Unauthorized", 401);
  }
  return user;
}

export async function requireAuthWithOrg() {
  const user = await requireAuth();
  const membership = await getUserOrganization(user.id);
  if (!membership) {
    throw new AuthError("No organization found", 403);
  }
  return {
    user,
    organization: membership.organization,
    membership,
  };
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Error && error.name === "UsageLimitError") {
    return NextResponse.json({ error: error.message }, { status: 429 });
  }
  console.error("API error:", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function withRateLimit(
  identifier: string,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const { success } = await rateLimit(identifier);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  return handler();
}
