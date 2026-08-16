"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";

interface BillingData {
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  usage: {
    plan: string;
    limits: { name: string; aiTasksPerMonth: number; researchProjectsPerMonth: number; storageBytes: number };
    usage: { aiTasks: number; researchProjects: number; storageBytes: number };
  };
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  pdfUrl: string | null;
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Subscription updated successfully!");
    }
    fetch("/api/billing")
      .then((r) => r.json())
      .then(setBilling)
      .catch(console.error);
    fetch("/api/billing/invoices")
      .then((r) => r.json())
      .then((data) => setInvoices(data.invoices ?? []))
      .catch(console.error);
  }, [searchParams]);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing", { method: "PUT" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (!billing) {
    return <div className="p-6 text-zinc-400">Loading billing information...</div>;
  }

  const { subscription, usage } = billing;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-zinc-400">Manage your subscription and view usage</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">{usage.limits.name}</span>
              <Badge variant={subscription?.status === "ACTIVE" ? "success" : "warning"}>
                {subscription?.status ?? "ACTIVE"}
              </Badge>
            </div>
            {subscription?.cancelAtPeriodEnd && (
              <p className="text-sm text-amber-400">Cancels at end of billing period</p>
            )}
            {subscription?.currentPeriodEnd && (
              <p className="text-sm text-zinc-400">
                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
            <Button variant="outline" onClick={openPortal} disabled={loading}>
              {loading ? "Loading..." : "Manage Subscription"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
            <CardDescription>Track your plan limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <UsageBar
              label="AI Tasks"
              used={usage.usage.aiTasks}
              limit={usage.limits.aiTasksPerMonth}
            />
            <UsageBar
              label="Research Projects"
              used={usage.usage.researchProjects}
              limit={usage.limits.researchProjectsPerMonth}
            />
            <UsageBar
              label="Storage"
              used={usage.usage.storageBytes}
              limit={usage.limits.storageBytes}
              formatValue={formatBytes}
            />
          </CardContent>
        </Card>
      </div>

      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      ${(invoice.amount / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {new Date(invoice.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={invoice.status === "paid" ? "success" : "warning"}>
                      {invoice.status}
                    </Badge>
                    {invoice.pdfUrl && (
                      <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 text-zinc-400 hover:text-violet-400" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UsageBar({
  label,
  used,
  limit,
  formatValue,
}: {
  label: string;
  used: number;
  limit: number;
  formatValue?: (n: number) => string;
}) {
  const pct = limit === Infinity ? 0 : Math.min((used / limit) * 100, 100);
  const displayUsed = formatValue ? formatValue(used) : used;
  const displayLimit = limit === Infinity ? "∞" : formatValue ? formatValue(limit) : limit;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-zinc-400">
          {displayUsed} / {displayLimit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800">
        <div
          className="h-2 rounded-full bg-violet-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
