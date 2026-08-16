import type { PlanTier } from "@/generated/prisma/client";

export interface PlanLimits {
  name: string;
  price: number | null;
  priceLabel: string;
  aiTasksPerMonth: number;
  researchProjectsPerMonth: number;
  agents: number;
  storageBytes: number;
  features: string[];
  stripePriceId?: string;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    name: "Free",
    price: 0,
    priceLabel: "$0/month",
    aiTasksPerMonth: 10,
    researchProjectsPerMonth: 3,
    agents: 1,
    storageBytes: 1 * 1024 * 1024 * 1024,
    features: [
      "Basic AI",
      "10 AI tasks/month",
      "3 research projects/month",
      "1 AI agent",
      "1GB storage",
    ],
  },
  PRO: {
    name: "Pro",
    price: 29,
    priceLabel: "$29/month",
    aiTasksPerMonth: 100,
    researchProjectsPerMonth: 30,
    agents: 10,
    storageBytes: 25 * 1024 * 1024 * 1024,
    features: [
      "100 AI tasks/month",
      "30 research projects/month",
      "10 AI agents",
      "25GB storage",
      "Advanced Research",
      "Personal Life Admin",
      "Advanced memory",
    ],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
  },
  BUSINESS: {
    name: "Business",
    price: 99,
    priceLabel: "$99/month",
    aiTasksPerMonth: 500,
    researchProjectsPerMonth: 100,
    agents: 25,
    storageBytes: 250 * 1024 * 1024 * 1024,
    features: [
      "500 AI tasks/month",
      "100 research projects/month",
      "25 AI agents",
      "250GB storage",
      "Business Brain",
      "Team workspace",
      "Advanced analytics",
      "Integrations",
    ],
    stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID,
  },
  SCALE: {
    name: "Scale",
    price: 299,
    priceLabel: "$299/month",
    aiTasksPerMonth: 2000,
    researchProjectsPerMonth: 500,
    agents: 100,
    storageBytes: 1024 * 1024 * 1024 * 1024,
    features: [
      "2,000 AI tasks/month",
      "500 research projects/month",
      "Advanced Business Brain",
      "Advanced agent workflows",
      "API access",
      "1TB storage",
    ],
    stripePriceId: process.env.STRIPE_SCALE_PRICE_ID,
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: null,
    priceLabel: "Custom",
    aiTasksPerMonth: Infinity,
    researchProjectsPerMonth: Infinity,
    agents: Infinity,
    storageBytes: Infinity,
    features: [
      "SSO",
      "SCIM",
      "Custom integrations",
      "Enterprise security",
      "Dedicated support",
    ],
  },
};

export function getPlanFromStripePriceId(priceId: string): PlanTier {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "PRO";
  if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) return "BUSINESS";
  if (priceId === process.env.STRIPE_SCALE_PRICE_ID) return "SCALE";
  return "FREE";
}
