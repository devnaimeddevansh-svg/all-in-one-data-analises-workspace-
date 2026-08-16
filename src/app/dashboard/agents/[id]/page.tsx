"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, XCircle, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface AgentRun {
  id: string;
  goal: string;
  status: string;
  result: string | null;
  pendingAction: { action: string; details?: Record<string, unknown> } | null;
  metadata: { steps?: Array<{ name: string; status: string; summary: string }> } | null;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  description: string | null;
  systemPrompt: string;
  tools: string[];
  isActive: boolean;
  runs: AgentRun[];
}

function statusVariant(status: string) {
  if (status === "COMPLETED") return "success";
  if (status === "AWAITING_APPROVAL") return "warning";
  if (status === "FAILED" || status === "CANCELED") return "destructive" as "warning";
  return "secondary";
}

function AgentDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const highlightRunId = searchParams.get("run");
  const [agent, setAgent] = useState<Agent | null>(null);
  const [goal, setGoal] = useState("");
  const [running, setRunning] = useState(false);
  const [approving, setApproving] = useState(false);

  function loadAgent() {
    fetch(`/api/agents/${params.id}`)
      .then((r) => r.json())
      .then((data) => setAgent(data.agent))
      .catch(console.error);
  }

  useEffect(() => {
    loadAgent();
    const interval = setInterval(loadAgent, 3000);
    return () => clearInterval(interval);
  }, [params.id]);

  async function handleRun() {
    if (!goal.trim()) return;
    setRunning(true);
    try {
      const res = await fetch(`/api/agents/${params.id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGoal("");
      loadAgent();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to start agent");
    } finally {
      setRunning(false);
    }
  }

  async function handleApprove(runId: string) {
    setApproving(true);
    try {
      await fetch(`/api/agent-runs/${runId}/approve`, { method: "POST" });
      loadAgent();
    } finally {
      setApproving(false);
    }
  }

  async function handleReject(runId: string) {
    setApproving(true);
    try {
      await fetch(`/api/agent-runs/${runId}/reject`, { method: "POST" });
      loadAgent();
    } finally {
      setApproving(false);
    }
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const activeRun = agent.runs.find((r) => r.id === highlightRunId) ?? agent.runs[0];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Link href="/dashboard/agents">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Back to Agents
        </Button>
      </Link>

      <div className="flex items-center gap-3">
        <Bot className="h-8 w-8 text-violet-500" />
        <div>
          <h1 className="text-2xl font-semibold">{agent.name}</h1>
          <p className="text-zinc-400">{agent.description}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run Agent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="What should this agent accomplish?"
            className="min-h-[80px]"
          />
          <Button onClick={handleRun} disabled={running || !goal.trim()}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Start Run
          </Button>
        </CardContent>
      </Card>

      {activeRun && (
        <Card className={activeRun.id === highlightRunId ? "ring-1 ring-violet-500" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{activeRun.goal}</CardTitle>
              <Badge variant={statusVariant(activeRun.status)}>
                {activeRun.status.replace("_", " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(activeRun.status === "PENDING" || activeRun.status === "RUNNING") && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Agent is working...
              </div>
            )}

            {activeRun.metadata?.steps && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-400">Execution Steps</p>
                {activeRun.metadata.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {step.status === "completed" ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-zinc-300">{step.name}</span>
                    <span className="text-zinc-500">— {step.summary}</span>
                  </div>
                ))}
              </div>
            )}

            {activeRun.result && (
              <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm">
                {activeRun.result}
              </div>
            )}

            {activeRun.status === "AWAITING_APPROVAL" && activeRun.pendingAction && (
              <div className="border border-amber-600/50 rounded-lg p-4 bg-amber-950/20 space-y-3">
                <p className="text-sm font-medium text-amber-400">Approval Required</p>
                <p className="text-sm text-zinc-300">{activeRun.pendingAction.action}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(activeRun.id)} disabled={approving}>
                    <CheckCircle className="h-3 w-3" />
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(activeRun.id)} disabled={approving}>
                    <XCircle className="h-3 w-3" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {agent.runs.length > 1 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-zinc-400">Run History</h2>
          {agent.runs.slice(1).map((run) => (
            <Link key={run.id} href={`/dashboard/agents/${agent.id}?run=${run.id}`}>
              <Card className="hover:bg-zinc-900/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between p-3">
                  <span className="text-sm truncate flex-1">{run.goal}</span>
                  <Badge variant={statusVariant(run.status)} className="ml-2 shrink-0">
                    {run.status.replace("_", " ")}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgentDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>}>
      <AgentDetailContent />
    </Suspense>
  );
}
