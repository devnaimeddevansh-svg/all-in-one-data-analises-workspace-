import Stripe from "stripe";
import { db } from "@/lib/db";
import { getPlanFromStripePriceId } from "@/lib/usage/plans";
import type { PlanTier, SubscriptionStatus } from "@/generated/prisma/client";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is required");
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export async function getOrCreateStripeCustomer(
  organizationId: string,
  email: string,
  name?: string
): Promise<string> {
  const sub = await db.subscription.findUnique({
    where: { organizationId },
  });

  if (sub?.stripeCustomerId) return sub.stripeCustomerId;

  const customer = await getStripe().customers.create({
    email,
    name,
    metadata: { organizationId },
  });

  await db.subscription.update({
    where: { organizationId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function createCheckoutSession(params: {
  organizationId: string;
  email: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(
    params.organizationId,
    params.email
  );

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { organizationId: params.organizationId },
    subscription_data: {
      metadata: { organizationId: params.organizationId },
    },
  });

  if (!session.url) throw new Error("Failed to create checkout session");
  return session.url;
}

export async function createPortalSession(
  organizationId: string,
  returnUrl: string
): Promise<string> {
  const sub = await db.subscription.findUnique({
    where: { organizationId },
  });
  if (!sub?.stripeCustomerId) {
    throw new Error("No Stripe customer found");
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    trialing: "TRIALING",
    incomplete: "INCOMPLETE",
    incomplete_expired: "INCOMPLETE",
    unpaid: "PAST_DUE",
    paused: "ACTIVE",
  };
  return map[status] ?? "ACTIVE";
}

export async function syncSubscriptionFromStripe(
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  const organizationId = stripeSubscription.metadata.organizationId;
  if (!organizationId) return;

  const priceId = stripeSubscription.items.data[0]?.price.id;
  const plan: PlanTier = priceId ? getPlanFromStripePriceId(priceId) : "FREE";

  await db.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      plan,
      status: mapStripeStatus(stripeSubscription.status),
      stripeCustomerId: stripeSubscription.customer as string,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: priceId,
      currentPeriodStart: new Date((stripeSubscription as Stripe.Subscription & { current_period_start: number }).current_period_start * 1000),
      currentPeriodEnd: new Date((stripeSubscription as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
    update: {
      plan,
      status: mapStripeStatus(stripeSubscription.status),
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: priceId,
      currentPeriodStart: new Date((stripeSubscription as Stripe.Subscription & { current_period_start: number }).current_period_start * 1000),
      currentPeriodEnd: new Date((stripeSubscription as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
  });
}

export async function handleSubscriptionDeleted(
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  const organizationId = stripeSubscription.metadata.organizationId;
  if (!organizationId) return;

  await db.subscription.update({
    where: { organizationId },
    data: {
      plan: "FREE",
      status: "CANCELED",
      stripeSubscriptionId: null,
      stripePriceId: null,
      cancelAtPeriodEnd: false,
    },
  });
}

export async function getPaymentHistory(organizationId: string) {
  const sub = await db.subscription.findUnique({
    where: { organizationId },
  });
  if (!sub?.stripeCustomerId) return [];

  const invoices = await getStripe().invoices.list({
    customer: sub.stripeCustomerId,
    limit: 24,
  });

  return invoices.data.map((inv) => ({
    id: inv.id,
    amount: inv.amount_paid,
    currency: inv.currency,
    status: inv.status,
    date: new Date((inv.created ?? 0) * 1000),
    pdfUrl: inv.invoice_pdf,
  }));
}
