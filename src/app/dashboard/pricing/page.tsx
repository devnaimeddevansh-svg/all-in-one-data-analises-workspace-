"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    tier: "FREE",
    name: "Free",
    price: "$0",
    period: "/month",
    features: [
      "Basic AI",
      "10 AI tasks/month",
      "3 research projects/month",
      "1 AI agent",
      "1GB storage",
    ],
    cta: "Current Plan",
    disabled: true,
  },
  {
    tier: "PRO",
    name: "Pro",
    price: "$29",
    period: "/month",
    features: [
      "100 AI tasks/month",
      "30 research projects/month",
      "10 AI agents",
      "25GB storage",
      "Advanced Research",
      "Personal Life Admin",
      "Advanced memory",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    tier: "BUSINESS",
    name: "Business",
    price: "$99",
    period: "/month",
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
    cta: "Upgrade to Business",
  },
  {
    tier: "SCALE",
    name: "Scale",
    price: "$299",
    period: "/month",
    features: [
      "2,000 AI tasks/month",
      "500 research projects/month",
      "Advanced Business Brain",
      "Advanced agent workflows",
      "API access",
      "1TB storage",
    ],
    cta: "Upgrade to Scale",
  },
  {
    tier: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: ["SSO", "SCIM", "Custom integrations", "Enterprise security", "Dedicated support"],
    cta: "Contact Sales",
    disabled: true,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleUpgrade(plan: string) {
    if (plan === "ENTERPRISE" || plan === "FREE") return;
    setLoading(plan);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Pricing</h1>
        <p className="text-zinc-400 mt-2">Choose the plan that fits your needs</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {plans.map((plan) => (
          <Card
            key={plan.tier}
            className={plan.popular ? "border-violet-600 ring-1 ring-violet-600/50" : ""}
          >
            <CardHeader>
              {plan.popular && <Badge className="w-fit mb-2">Most Popular</Badge>}
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-zinc-100">{plan.price}</span>
                <span className="text-zinc-400">{plan.period}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                disabled={plan.disabled || loading === plan.tier}
                onClick={() => handleUpgrade(plan.tier)}
              >
                {loading === plan.tier ? "Redirecting..." : plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
