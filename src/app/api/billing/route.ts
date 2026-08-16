import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthWithOrg, handleApiError } from "@/lib/api-auth";
import { createCheckoutSession, createPortalSession } from "@/lib/stripe";
import { getUsageSummary } from "@/lib/usage/tracker";
import { PLAN_LIMITS } from "@/lib/usage/plans";

const checkoutSchema = z.object({
  plan: z.enum(["PRO", "BUSINESS", "SCALE"]),
});

export async function GET() {
  try {
    const { organization } = await requireAuthWithOrg();
    const usage = await getUsageSummary(organization.id);
    return NextResponse.json({
      subscription: organization.subscription,
      usage,
      plans: PLAN_LIMITS,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, organization } = await requireAuthWithOrg();
    const body = await request.json();
    const { plan } = checkoutSchema.parse(body);

    const priceId = PLAN_LIMITS[plan].stripePriceId;
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const url = await createCheckoutSession({
      organizationId: organization.id,
      email: user.email!,
      priceId,
      successUrl: `${baseUrl}/dashboard/billing?success=true`,
      cancelUrl: `${baseUrl}/dashboard/pricing?canceled=true`,
    });

    return NextResponse.json({ url });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT() {
  try {
    const { organization } = await requireAuthWithOrg();
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const url = await createPortalSession(organization.id, `${baseUrl}/dashboard/billing`);
    return NextResponse.json({ url });
  } catch (error) {
    return handleApiError(error);
  }
}
